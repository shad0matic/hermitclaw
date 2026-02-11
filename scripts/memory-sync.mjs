#!/usr/bin/env node
/**
 * Syncs MEMORY.md and daily notes to Postgres with embeddings.
 * Handles chunking (one section per row), dedup by source_file+content hash.
 * 
 * Usage:
 *   node scripts/memory-sync.mjs                    # Sync all
 *   node scripts/memory-sync.mjs --file MEMORY.md   # Sync one file
 *   node scripts/memory-sync.mjs --daily             # Sync all daily notes
 */
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const EMBEDDING_MODEL = 'text-embedding-3-small';
const WORKSPACE = process.env.HOME + '/.openclaw/workspace';
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

function contentHash(text) {
    return crypto.createHash('sha256').update(text).digest('hex').slice(0, 16);
}

/**
 * Split markdown by ## headings into chunks. 
 * Each chunk gets the heading as its first tag.
 */
function chunkMarkdown(content) {
    const chunks = [];
    const lines = content.split('\n');
    let current = { heading: 'preamble', lines: [] };

    for (const line of lines) {
        const headingMatch = line.match(/^##\s+(.+)/);
        if (headingMatch) {
            if (current.lines.length > 0) {
                const text = current.lines.join('\n').trim();
                if (text.length > 20) chunks.push({ heading: current.heading, text });
            }
            current = { heading: headingMatch[1].trim(), lines: [] };
        } else {
            current.lines.push(line);
        }
    }
    // Last chunk
    if (current.lines.length > 0) {
        const text = current.lines.join('\n').trim();
        if (text.length > 20) chunks.push({ heading: current.heading, text });
    }
    return chunks;
}

async function syncFile(filePath, relPath, importance = 7) {
    const content = fs.readFileSync(filePath, 'utf8');
    const chunks = chunkMarkdown(content);
    
    let inserted = 0, skipped = 0, updated = 0;
    
    for (const chunk of chunks) {
        const hash = contentHash(chunk.text);
        const tag = chunk.heading;
        const sourceKey = `${relPath}#${tag}`;
        
        // Check if exists with same hash
        const existing = await pool.query(
            `SELECT id, md5(content) as existing_hash FROM memory.memories 
             WHERE source_file = $1 AND $2 = ANY(tags) LIMIT 1`,
            [relPath, tag]
        );
        
        if (existing.rows.length > 0) {
            const existingHash = contentHash(
                (await pool.query('SELECT content FROM memory.memories WHERE id=$1', [existing.rows[0].id])).rows[0].content
            );
            if (existingHash === hash) {
                skipped++;
                continue;
            }
            // Content changed — update
            const embedding = await getEmbedding(`${tag}: ${chunk.text}`);
            await pool.query(
                `UPDATE memory.memories SET content=$1, embedding=$2, importance=$3, updated_at=now()
                 WHERE id=$4`,
                [chunk.text, embedding, importance, existing.rows[0].id]
            );
            updated++;
        } else {
            // New chunk
            const embedding = await getEmbedding(`${tag}: ${chunk.text}`);
            await pool.query(
                `INSERT INTO memory.memories (content, embedding, tags, importance, source_file, agent_id)
                 VALUES ($1, $2, $3, $4, $5, 'main')`,
                [chunk.text, embedding, [tag], importance, relPath]
            );
            inserted++;
        }
    }
    
    // Clean up chunks that no longer exist in the file
    const currentTags = chunks.map(c => c.heading);
    const dbChunks = await pool.query(
        `SELECT id, tags FROM memory.memories WHERE source_file = $1`,
        [relPath]
    );
    let deleted = 0;
    for (const row of dbChunks.rows) {
        const rowTag = row.tags?.[0];
        if (rowTag && !currentTags.includes(rowTag)) {
            await pool.query('DELETE FROM memory.memories WHERE id=$1', [row.id]);
            deleted++;
        }
    }
    
    console.log(`${relPath}: +${inserted} ~${updated} =${skipped} -${deleted}`);
    return { inserted, updated, skipped, deleted };
}

async function syncAll() {
    const totals = { inserted: 0, updated: 0, skipped: 0, deleted: 0 };
    
    // Sync MEMORY.md (high importance)
    const memoryPath = path.join(WORKSPACE, 'MEMORY.md');
    if (fs.existsSync(memoryPath)) {
        const r = await syncFile(memoryPath, 'MEMORY.md', 8);
        Object.keys(totals).forEach(k => totals[k] += r[k]);
    }
    
    // Sync daily notes (medium importance)
    const memDir = path.join(WORKSPACE, 'memory');
    if (fs.existsSync(memDir)) {
        const files = fs.readdirSync(memDir).filter(f => /^\d{4}-\d{2}-\d{2}/.test(f) && f.endsWith('.md'));
        for (const file of files.sort().reverse().slice(0, 14)) { // Last 14 days
            const r = await syncFile(path.join(memDir, file), `memory/${file}`, 6);
            Object.keys(totals).forEach(k => totals[k] += r[k]);
        }
    }
    
    console.log(`\nTotal: +${totals.inserted} ~${totals.updated} =${totals.skipped} -${totals.deleted}`);
}

async function main() {
    const args = process.argv.slice(2);
    if (args.includes('--daily')) {
        // Sync only daily notes
        const memDir = path.join(WORKSPACE, 'memory');
        const files = fs.readdirSync(memDir).filter(f => /^\d{4}-\d{2}-\d{2}/.test(f) && f.endsWith('.md'));
        for (const file of files) {
            await syncFile(path.join(memDir, file), `memory/${file}`, 6);
        }
    } else if (args.includes('--file')) {
        const idx = args.indexOf('--file');
        const file = args[idx + 1];
        const fullPath = path.resolve(WORKSPACE, file);
        await syncFile(fullPath, file, 8);
    } else {
        await syncAll();
    }
    await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
