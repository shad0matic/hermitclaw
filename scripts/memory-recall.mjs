#!/usr/bin/env node
/**
 * Semantic + keyword memory recall from Postgres.
 * Returns relevant memories ranked by vector similarity + keyword match.
 * 
 * Usage:
 *   node scripts/memory-recall.mjs "what are boss's projects?"
 *   node scripts/memory-recall.mjs "infrastructure setup" --limit 10
 *   node scripts/memory-recall.mjs --recent 7    # Last 7 days of daily notes
 *   node scripts/memory-recall.mjs --boot         # Boot context: identity + recent + high-importance
 */
import pg from 'pg';

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const EMBEDDING_MODEL = 'text-embedding-3-small';
const pool = new pg.Pool({ database: 'openclaw_db', host: '/var/run/postgresql' });

async function getEmbedding(text) {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: EMBEDDING_MODEL, input: text.slice(0, 8000) })
    });
    const json = await res.json();
    if (!json.data?.[0]) throw new Error(`Embedding failed: ${JSON.stringify(json)}`);
    return JSON.stringify(json.data[0].embedding);
}

async function semanticSearch(query, limit = 5) {
    const embedding = await getEmbedding(query);
    const { rows } = await pool.query(`
        SELECT id, content, tags, importance, source_file, created_at, updated_at,
               1 - (embedding <=> $1::vector) as similarity
        FROM memory.memories
        WHERE agent_id = 'main' AND embedding IS NOT NULL
        ORDER BY embedding <=> $1::vector
        LIMIT $2
    `, [embedding, limit]);
    return rows;
}

async function keywordSearch(query, limit = 5) {
    const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    if (terms.length === 0) return [];
    
    const conditions = terms.map((_, i) => `lower(content) LIKE $${i + 1}`);
    const values = terms.map(t => `%${t}%`);
    
    const { rows } = await pool.query(`
        SELECT id, content, tags, importance, source_file, created_at, updated_at,
               0.5 as similarity
        FROM memory.memories
        WHERE agent_id = 'main' AND (${conditions.join(' OR ')})
        ORDER BY importance DESC, updated_at DESC
        LIMIT $${terms.length + 1}
    `, [...values, limit]);
    return rows;
}

async function combinedSearch(query, limit = 5) {
    const [semantic, keyword] = await Promise.all([
        semanticSearch(query, limit),
        keywordSearch(query, limit)
    ]);
    
    // Merge, deduplicate by id, keep highest similarity
    const map = new Map();
    for (const row of [...semantic, ...keyword]) {
        const existing = map.get(row.id);
        if (!existing || Number(row.similarity) > Number(existing.similarity)) {
            map.set(row.id, row);
        }
    }
    const combined = [...map.values()];
    combined.sort((a, b) => Number(b.similarity) - Number(a.similarity));
    return combined.slice(0, limit);
}

async function getBootContext() {
    // 1. High-importance memories (identity, infrastructure, key decisions)
    const { rows: important } = await pool.query(`
        SELECT content, tags, source_file FROM memory.memories
        WHERE agent_id = 'main' AND importance >= 8
        ORDER BY source_file, id
    `);
    
    // 2. Recent daily notes (last 3 days)
    const { rows: recent } = await pool.query(`
        SELECT content, tags, source_file FROM memory.memories
        WHERE agent_id = 'main' 
          AND source_file LIKE 'memory/2%'
          AND created_at > now() - interval '3 days'
        ORDER BY source_file DESC, id
    `);
    
    // 3. Entities and relations for context
    const { rows: entities } = await pool.query(`
        SELECT name, entity_type, properties FROM memory.entities LIMIT 20
    `);
    
    // Deduplicate
    const seen = new Set();
    const chunks = [];
    for (const row of [...important, ...recent]) {
        const key = `${row.source_file}#${row.tags?.[0]}`;
        if (!seen.has(key)) {
            seen.add(key);
            chunks.push(`[${row.source_file}] ${row.content}`);
        }
    }
    
    return {
        memories: chunks,
        entities: entities.map(e => `${e.name} (${e.entity_type})`),
        stats: {
            totalMemories: (await pool.query('SELECT count(*) FROM memory.memories WHERE agent_id=\'main\'')).rows[0].count,
            totalEntities: entities.length
        }
    };
}

async function getRecentNotes(days = 7) {
    const { rows } = await pool.query(`
        SELECT content, source_file, tags FROM memory.memories
        WHERE agent_id = 'main' AND source_file LIKE 'memory/2%'
          AND created_at > now() - make_interval(days => $1)
        ORDER BY source_file DESC, id
    `, [days]);
    return rows;
}

async function main() {
    const args = process.argv.slice(2);
    
    if (args.includes('--boot')) {
        const ctx = await getBootContext();
        if (args.includes('--json')) {
            console.log(JSON.stringify(ctx, null, 2));
        } else {
            console.log('=== BOOT CONTEXT ===');
            console.log(`Stats: ${ctx.stats.totalMemories} memories, ${ctx.stats.totalEntities} entities\n`);
            console.log('--- Key Memories ---');
            ctx.memories.forEach(m => console.log(m.slice(0, 200) + (m.length > 200 ? '...' : '')));
            console.log('\n--- Known Entities ---');
            console.log(ctx.entities.join(', '));
        }
    } else if (args.includes('--recent')) {
        const idx = args.indexOf('--recent');
        const days = parseInt(args[idx + 1]) || 7;
        const notes = await getRecentNotes(days);
        notes.forEach(n => console.log(`[${n.source_file}] ${n.content.slice(0, 150)}...`));
    } else {
        const query = args.filter(a => !a.startsWith('--')).join(' ');
        const limit = parseInt(args[args.indexOf('--limit') + 1]) || 5;
        if (!query) {
            console.error('Usage: memory-recall.mjs "query" | --boot | --recent [days]');
            process.exit(1);
        }
        const results = await combinedSearch(query, limit);
        if (args.includes('--json')) {
            console.log(JSON.stringify(results, null, 2));
        } else {
            results.forEach((r, i) => {
                console.log(`\n--- #${i + 1} [sim=${Number(r.similarity).toFixed(3)}] [${r.source_file}] tags=${r.tags?.join(',')} ---`);
                console.log(r.content.slice(0, 300) + (r.content.length > 300 ? '...' : ''));
            });
        }
    }
    
    await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
