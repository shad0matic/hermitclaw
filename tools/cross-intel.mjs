#!/usr/bin/env node
/**
 * Cross-Agent Intelligence Tool — Phase 7
 * 
 * Commands:
 *   signal <entity> [--type topic] [--priority 5] [--context "why"] [--agent main]
 *     Report an entity/topic to the shared priority stack
 * 
 *   confirm <entity> [--agent nefario] [--source "x search"] [--snippet "..."]
 *     Confirm a signal from another agent (cross-signal)
 * 
 *   priorities [--type topic] [--min-priority 3] [--active]
 *     List shared priorities
 * 
 *   react-add --trigger-agent <id> --event <type> --responder <id> --action <action> [--probability 1.0]
 *     Add a reaction rule
 * 
 *   react-list [--agent <id>]
 *     List reaction rules
 * 
 *   react-check --agent <id> --event <type> [--payload '{}']
 *     Check what reactions would fire for an event
 * 
 *   entity <name> --type <type> [--aliases "a,b"] [--props '{"key":"val"}'] [--agent main]
 *     Add/update an entity in the knowledge graph
 * 
 *   relate <source> <target> --relation <type> [--strength 0.5] [--context "..."]
 *     Create a relationship between entities
 * 
 *   graph [--entity <name>] [--type <type>] [--depth 2]
 *     Explore the knowledge graph
 * 
 *   mistake <description> [--agent main] [--context "..."] [--lesson "..."] [--severity 3]
 *     Log a mistake for learning
 * 
 *   mistakes [--agent main] [--unresolved]
 *     List tracked mistakes
 * 
 *   compound --from <YYYY-MM-DD> --to <YYYY-MM-DD> [--agent main]
 *     Generate a weekly memory compound (synthesis)
 * 
 *   sync [--agent main]
 *     Daily context sync: summarize what's hot across all agents
 */

import pg from 'pg';
import { parseArgs } from 'node:util';

const pool = new pg.Pool({
  host: '/var/run/postgresql',
  database: 'openclaw_db',
  user: 'shad',
});

const args = process.argv.slice(2);
const command = args[0];
const rest = args.slice(1);

function parseFlags(args) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const val = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true;
      flags[key] = val;
    } else {
      positional.push(args[i]);
    }
  }
  return { flags, positional };
}

async function signal() {
  const { flags, positional } = parseFlags(rest);
  const entity = positional[0] || flags.entity;
  if (!entity) { console.error('Usage: signal <entity> [--type topic] [--priority 5] [--context "..."]'); process.exit(1); }

  const type = flags.type || 'topic';
  const priority = parseInt(flags.priority || '5');
  const context = flags.context || null;
  const agent = flags.agent || 'main';

  const res = await pool.query(`
    INSERT INTO ops.priorities (entity, entity_type, priority, context, reported_by)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (entity, entity_type) DO UPDATE SET
      priority = GREATEST(ops.priorities.priority, $3),
      signal_count = ops.priorities.signal_count + 1,
      last_seen_at = now(),
      context = COALESCE($4, ops.priorities.context)
    RETURNING id, entity, signal_count
  `, [entity, type, priority, context, agent]);

  const row = res.rows[0];
  console.log(`📡 Signal recorded: "${row.entity}" (id=${row.id}, signals=${row.signal_count})`);
}

async function confirm() {
  const { flags, positional } = parseFlags(rest);
  const entity = positional[0] || flags.entity;
  if (!entity) { console.error('Usage: confirm <entity> [--agent nefario] [--source "..."] [--snippet "..."]'); process.exit(1); }

  const agent = flags.agent || 'main';
  const source = flags.source || null;
  const snippet = flags.snippet || null;
  const confidence = parseFloat(flags.confidence || '0.7');

  // Find the priority
  const pRes = await pool.query(`SELECT id, signal_count, confirmed_by FROM ops.priorities WHERE entity = $1 AND resolved_at IS NULL LIMIT 1`, [entity]);
  if (pRes.rows.length === 0) { console.error(`No active priority found for "${entity}". Use 'signal' first.`); process.exit(1); }

  const priority = pRes.rows[0];

  // Add cross-signal
  await pool.query(`INSERT INTO ops.cross_signals (priority_id, agent_id, source, snippet, confidence) VALUES ($1, $2, $3, $4, $5)`,
    [priority.id, agent, source, snippet, confidence]);

  // Update confirmed_by array
  const confirmed = priority.confirmed_by || [];
  if (!confirmed.includes(agent)) {
    await pool.query(`UPDATE ops.priorities SET confirmed_by = array_append(confirmed_by, $1), signal_count = signal_count + 1, last_seen_at = now() WHERE id = $2`,
      [agent, priority.id]);
  }

  console.log(`🔗 Cross-signal: "${entity}" confirmed by ${agent} (total signals: ${priority.signal_count + 1})`);
}

async function priorities() {
  const { flags } = parseFlags(rest);
  const activeOnly = flags.active !== undefined;
  const minPriority = parseInt(flags['min-priority'] || '1');
  const type = flags.type || null;

  let q = `SELECT id, entity, entity_type, priority, signal_count, reported_by, confirmed_by, context,
            last_seen_at, created_at FROM ops.priorities WHERE priority >= $1`;
  const params = [minPriority];

  if (activeOnly) { q += ` AND resolved_at IS NULL`; }
  if (type) { q += ` AND entity_type = $${params.length + 1}`; params.push(type); }
  q += ` ORDER BY priority DESC, signal_count DESC LIMIT 30`;

  const res = await pool.query(q, params);
  if (res.rows.length === 0) { console.log('No priorities found.'); return; }

  for (const r of res.rows) {
    const confirmed = r.confirmed_by?.length ? ` | confirmed by: ${r.confirmed_by.join(', ')}` : '';
    console.log(`[P${r.priority}] ${r.entity} (${r.entity_type}) — ${r.signal_count} signals | by ${r.reported_by}${confirmed}`);
    if (r.context) console.log(`    ↳ ${r.context}`);
  }
}

async function reactAdd() {
  const { flags } = parseFlags(rest);
  const required = ['trigger-agent', 'event', 'responder', 'action'];
  for (const r of required) {
    if (!flags[r]) { console.error(`Missing --${r}`); process.exit(1); }
  }

  const prob = parseFloat(flags.probability || '1.0');
  const filter = flags.filter ? JSON.parse(flags.filter) : {};
  const actionParams = flags['action-params'] ? JSON.parse(flags['action-params']) : {};

  const res = await pool.query(`
    INSERT INTO ops.reactions (trigger_agent, trigger_event, trigger_filter, responder_agent, action, action_params, probability)
    VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id
  `, [flags['trigger-agent'], flags.event, filter, flags.responder, flags.action, actionParams, prob]);

  console.log(`⚡ Reaction rule #${res.rows[0].id} created: ${flags['trigger-agent']}:${flags.event} → ${flags.responder}:${flags.action} (p=${prob})`);
}

async function reactList() {
  const { flags } = parseFlags(rest);
  let q = `SELECT * FROM ops.reactions WHERE enabled = true`;
  const params = [];
  if (flags.agent) {
    q += ` AND (trigger_agent = $1 OR responder_agent = $1)`;
    params.push(flags.agent);
  }
  q += ` ORDER BY id`;

  const res = await pool.query(q, params);
  if (res.rows.length === 0) { console.log('No reaction rules.'); return; }

  for (const r of res.rows) {
    console.log(`#${r.id} ${r.trigger_agent}:${r.trigger_event} → ${r.responder_agent}:${r.action} (p=${r.probability})`);
  }
}

async function reactCheck() {
  const { flags } = parseFlags(rest);
  if (!flags.agent || !flags.event) { console.error('Usage: react-check --agent <id> --event <type>'); process.exit(1); }

  const res = await pool.query(`
    SELECT * FROM ops.reactions WHERE trigger_agent = $1 AND trigger_event = $2 AND enabled = true
  `, [flags.agent, flags.event]);

  if (res.rows.length === 0) { console.log('No reactions would fire.'); return; }

  for (const r of res.rows) {
    const fires = Math.random() < r.probability;
    console.log(`${fires ? '🟢' : '⚪'} #${r.id} → ${r.responder_agent}:${r.action} (p=${r.probability}) ${fires ? 'FIRES' : 'skipped'}`);
  }
}

async function entityCmd() {
  const { flags, positional } = parseFlags(rest);
  const name = positional[0] || flags.name;
  if (!name) { console.error('Usage: entity <name> --type <type> [--aliases "a,b"] [--props \'{"k":"v"}\']'); process.exit(1); }

  const type = flags.type || 'unknown';
  const aliases = flags.aliases ? flags.aliases.split(',').map(s => s.trim()) : [];
  const props = flags.props ? JSON.parse(flags.props) : {};
  const agent = flags.agent || 'main';

  const res = await pool.query(`
    INSERT INTO memory.entities (name, entity_type, aliases, properties, first_seen_by)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (name, entity_type) DO UPDATE SET
      aliases = (SELECT array_agg(DISTINCT e) FROM unnest(memory.entities.aliases || $3) e),
      properties = memory.entities.properties || $4,
      updated_at = now()
    RETURNING id, name, entity_type
  `, [name, type, aliases, props, agent]);

  const r = res.rows[0];
  console.log(`🔵 Entity: ${r.name} (${r.entity_type}, id=${r.id})`);
}

async function relate() {
  const { flags, positional } = parseFlags(rest);
  if (positional.length < 2 || !flags.relation) {
    console.error('Usage: relate <source> <target> --relation <type> [--strength 0.5]');
    process.exit(1);
  }

  const [sourceName, targetName] = positional;
  const strength = parseFloat(flags.strength || '0.5');
  const context = flags.context || null;
  const agent = flags.agent || 'main';

  // Find entities
  const src = await pool.query(`SELECT id FROM memory.entities WHERE name = $1 LIMIT 1`, [sourceName]);
  const tgt = await pool.query(`SELECT id FROM memory.entities WHERE name = $1 LIMIT 1`, [targetName]);

  if (!src.rows.length) { console.error(`Entity "${sourceName}" not found. Add it first.`); process.exit(1); }
  if (!tgt.rows.length) { console.error(`Entity "${targetName}" not found. Add it first.`); process.exit(1); }

  const res = await pool.query(`
    INSERT INTO memory.entity_relations (source_id, target_id, relation_type, strength, context, agent_id)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (source_id, target_id, relation_type) DO UPDATE SET
      strength = $4, context = COALESCE($5, memory.entity_relations.context)
    RETURNING id
  `, [src.rows[0].id, tgt.rows[0].id, flags.relation, strength, context, agent]);

  console.log(`🔗 ${sourceName} --[${flags.relation}]--> ${targetName} (strength=${strength})`);
}

async function graph() {
  const { flags } = parseFlags(rest);

  if (flags.entity) {
    // Show specific entity and its relations
    const e = await pool.query(`SELECT * FROM memory.entities WHERE name = $1 LIMIT 1`, [flags.entity]);
    if (!e.rows.length) { console.log(`Entity "${flags.entity}" not found.`); return; }
    const ent = e.rows[0];
    console.log(`🔵 ${ent.name} (${ent.entity_type})`);
    if (ent.aliases?.length) console.log(`   Aliases: ${ent.aliases.join(', ')}`);
    if (Object.keys(ent.properties || {}).length) console.log(`   Props: ${JSON.stringify(ent.properties)}`);

    const rels = await pool.query(`
      SELECT r.relation_type, r.strength, e2.name as target_name, e2.entity_type as target_type
      FROM memory.entity_relations r JOIN memory.entities e2 ON r.target_id = e2.id
      WHERE r.source_id = $1
      UNION ALL
      SELECT r.relation_type, r.strength, e2.name as target_name, e2.entity_type as target_type
      FROM memory.entity_relations r JOIN memory.entities e2 ON r.source_id = e2.id
      WHERE r.target_id = $1
      ORDER BY strength DESC
    `, [ent.id]);

    for (const r of rels.rows) {
      console.log(`   → ${r.relation_type} → ${r.target_name} (${r.target_type}) [${r.strength}]`);
    }
  } else {
    // Show all entities grouped by type
    const res = await pool.query(`
      SELECT entity_type, array_agg(name ORDER BY name) as names, count(*) as cnt
      FROM memory.entities GROUP BY entity_type ORDER BY cnt DESC
    `);
    for (const r of res.rows) {
      console.log(`📂 ${r.entity_type} (${r.cnt}): ${r.names.join(', ')}`);
    }

    const relCount = await pool.query(`SELECT count(*) as cnt FROM memory.entity_relations`);
    console.log(`\n🔗 Total relations: ${relCount.rows[0].cnt}`);
  }
}

async function mistakeCmd() {
  const { flags, positional } = parseFlags(rest);
  const desc = positional.join(' ') || flags.description;
  if (!desc) { console.error('Usage: mistake <description> [--agent main] [--lesson "..."] [--severity 3]'); process.exit(1); }

  const agent = flags.agent || 'main';
  const context = flags.context || null;
  const lesson = flags.lesson || null;
  const severity = parseInt(flags.severity || '3');

  // Check for similar existing mistake
  const existing = await pool.query(`
    SELECT id, description, recurrence_count FROM memory.mistakes
    WHERE agent_id = $1 AND resolved = false AND description ILIKE '%' || $2 || '%'
    LIMIT 1
  `, [agent, desc.substring(0, 30)]);

  if (existing.rows.length) {
    await pool.query(`UPDATE memory.mistakes SET recurrence_count = recurrence_count + 1, last_occurred_at = now(), lesson_learned = COALESCE($1, lesson_learned) WHERE id = $2`,
      [lesson, existing.rows[0].id]);
    console.log(`⚠️ Recurring mistake #${existing.rows[0].id} (count: ${existing.rows[0].recurrence_count + 1}): ${existing.rows[0].description}`);
  } else {
    const res = await pool.query(`
      INSERT INTO memory.mistakes (agent_id, description, context, lesson_learned, severity)
      VALUES ($1, $2, $3, $4, $5) RETURNING id
    `, [agent, desc, context, lesson, severity]);
    console.log(`📝 Mistake #${res.rows[0].id} logged for ${agent}: ${desc}`);
  }
}

async function mistakes() {
  const { flags } = parseFlags(rest);
  const agent = flags.agent || null;
  const unresolved = flags.unresolved !== undefined;

  let q = `SELECT * FROM memory.mistakes WHERE 1=1`;
  const params = [];
  if (agent) { q += ` AND agent_id = $${params.length + 1}`; params.push(agent); }
  if (unresolved) { q += ` AND resolved = false`; }
  q += ` ORDER BY last_occurred_at DESC LIMIT 20`;

  const res = await pool.query(q, params);
  if (!res.rows.length) { console.log('No mistakes tracked. Clean record! 🎉'); return; }

  for (const m of res.rows) {
    const status = m.resolved ? '✅' : '⚠️';
    console.log(`${status} #${m.id} [S${m.severity}] (×${m.recurrence_count}) ${m.agent_id}: ${m.description}`);
    if (m.lesson_learned) console.log(`   💡 ${m.lesson_learned}`);
  }
}

async function sync() {
  const { flags } = parseFlags(rest);

  // Gather all active priorities
  const priorities = await pool.query(`
    SELECT entity, entity_type, priority, signal_count, reported_by, confirmed_by
    FROM ops.priorities WHERE resolved_at IS NULL ORDER BY priority DESC, signal_count DESC LIMIT 10
  `);

  // Recent cross-signals (last 24h)
  const signals = await pool.query(`
    SELECT cs.agent_id, p.entity, cs.source, cs.snippet
    FROM ops.cross_signals cs JOIN ops.priorities p ON cs.priority_id = p.id
    WHERE cs.created_at > now() - interval '24 hours'
    ORDER BY cs.created_at DESC LIMIT 10
  `);

  // Recent mistakes
  const recentMistakes = await pool.query(`
    SELECT agent_id, description, severity FROM memory.mistakes
    WHERE last_occurred_at > now() - interval '7 days' AND resolved = false
    ORDER BY severity DESC LIMIT 5
  `);

  // Agent activity (last 24h)
  const activity = await pool.query(`
    SELECT agent_id, count(*) as events FROM ops.agent_events
    WHERE created_at > now() - interval '24 hours'
    GROUP BY agent_id ORDER BY events DESC
  `);

  console.log('=== 🧠 Daily Context Sync ===\n');

  console.log('📡 Active Priorities:');
  if (!priorities.rows.length) console.log('  (none)');
  for (const p of priorities.rows) {
    console.log(`  [P${p.priority}] ${p.entity} (${p.entity_type}) — ${p.signal_count} signals`);
  }

  console.log('\n🔗 Cross-Signals (24h):');
  if (!signals.rows.length) console.log('  (none)');
  for (const s of signals.rows) {
    console.log(`  ${s.agent_id}: "${s.entity}" via ${s.source || 'unknown'}`);
  }

  console.log('\n⚠️ Open Mistakes:');
  if (!recentMistakes.rows.length) console.log('  (none) 🎉');
  for (const m of recentMistakes.rows) {
    console.log(`  [S${m.severity}] ${m.agent_id}: ${m.description}`);
  }

  console.log('\n📊 Agent Activity (24h):');
  if (!activity.rows.length) console.log('  (none)');
  for (const a of activity.rows) {
    console.log(`  ${a.agent_id}: ${a.events} events`);
  }
}

const commands = {
  signal, confirm, priorities,
  'react-add': reactAdd, 'react-list': reactList, 'react-check': reactCheck,
  entity: entityCmd, relate, graph,
  mistake: mistakeCmd, mistakes,
  compound: async () => { console.log('💡 Compound generation requires LLM synthesis — use via agent session, not CLI.'); },
  sync,
};

if (!command || !commands[command]) {
  console.log(`Usage: cross-intel <command>

Commands:
  signal <entity>         Report entity to shared priority stack
  confirm <entity>        Cross-signal confirmation from another agent
  priorities              List active priorities
  react-add               Add reaction rule (agent→agent)
  react-list              List reaction rules
  react-check             Check what reactions fire for an event
  entity <name>           Add/update knowledge graph entity
  relate <src> <tgt>      Create entity relationship
  graph                   Explore knowledge graph
  mistake <desc>          Log a mistake for learning
  mistakes                List tracked mistakes
  sync                    Daily cross-agent context sync`);
  process.exit(0);
}

try {
  await commands[command]();
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
} finally {
  await pool.end();
}
