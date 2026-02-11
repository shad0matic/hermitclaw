#!/usr/bin/env node
/**
 * Task Tracker — logs agent tasks to Postgres with heartbeat support.
 * 
 * Usage:
 *   node tools/task-tracker.mjs start --agent nefario --task "fetch mugshots" [--timeout 600] [--session key]
 *   node tools/task-tracker.mjs heartbeat --id 42 --msg "downloading image 3/5"
 *   node tools/task-tracker.mjs complete --id 42 [--result '{"files":3}']
 *   node tools/task-tracker.mjs fail --id 42 --error "API timeout"
 *   node tools/task-tracker.mjs active [--agent nefario]
 *   node tools/task-tracker.mjs stalled [--threshold 600]
 *   node tools/task-tracker.mjs cleanup [--older-than 24]
 */
import pg from 'pg';

const pool = new pg.Pool({ database: 'openclaw_db', host: '/var/run/postgresql' });

async function startTask({ agent, task, timeout = 600, session = null, triggeredBy = 'spawn' }) {
    const { rows } = await pool.query(
        `INSERT INTO ops.runs (agent_id, workflow_name, task, status, triggered_by, timeout_seconds, session_key, started_at, last_heartbeat)
         VALUES ($1, 'agent_task', $2, 'running', $3, $4, $5, now(), now())
         RETURNING id, created_at`,
        [agent, task, triggeredBy, timeout, session]
    );
    const run = rows[0];
    console.log(JSON.stringify({ ok: true, action: 'start', id: Number(run.id), agent, task, timeout }));
    return Number(run.id);
}

async function heartbeat({ id, msg }) {
    const { rowCount } = await pool.query(
        `UPDATE ops.runs SET last_heartbeat = now(), heartbeat_msg = $2
         WHERE id = $1 AND status = 'running'`,
        [id, msg]
    );
    if (rowCount === 0) {
        console.error(JSON.stringify({ ok: false, error: `Run ${id} not found or not running` }));
        process.exit(1);
    }
    console.log(JSON.stringify({ ok: true, action: 'heartbeat', id, msg, ts: new Date().toISOString() }));
}

async function complete({ id, result = {} }) {
    const { rowCount } = await pool.query(
        `UPDATE ops.runs SET status = 'completed', completed_at = now(), last_heartbeat = now(),
                heartbeat_msg = 'completed', result = $2
         WHERE id = $1 AND status = 'running'`,
        [id, JSON.stringify(result)]
    );
    if (rowCount === 0) {
        console.error(JSON.stringify({ ok: false, error: `Run ${id} not found or not running` }));
        process.exit(1);
    }
    console.log(JSON.stringify({ ok: true, action: 'complete', id }));
}

async function fail({ id, error }) {
    await pool.query(
        `UPDATE ops.runs SET status = 'failed', completed_at = now(), last_heartbeat = now(),
                heartbeat_msg = $2
         WHERE id = $1 AND status = 'running'`,
        [id, `FAILED: ${error}`]
    );
    console.log(JSON.stringify({ ok: true, action: 'fail', id, error }));
}

async function getActive({ agent = null }) {
    const where = agent
        ? `WHERE r.status = 'running' AND r.agent_id = $1`
        : `WHERE r.status = 'running'`;
    const params = agent ? [agent] : [];

    const { rows } = await pool.query(`
        SELECT r.id, r.agent_id, r.task, r.status, r.heartbeat_msg, r.timeout_seconds,
               r.started_at, r.last_heartbeat, r.session_key,
               EXTRACT(EPOCH FROM (now() - r.started_at))::int as elapsed_seconds,
               EXTRACT(EPOCH FROM (now() - r.last_heartbeat))::int as since_heartbeat,
               p.name as agent_name
        FROM ops.runs r
        LEFT JOIN memory.agent_profiles p ON p.agent_id = r.agent_id
        ${where}
        ORDER BY r.started_at DESC
    `, params);

    // Mark stalled status (heartbeat older than timeout)
    const enriched = rows.map(r => ({
        ...r,
        id: Number(r.id),
        is_stalled: r.since_heartbeat > r.timeout_seconds,
        display: `${r.agent_name || r.agent_id} — "${r.task}" — ${formatDuration(r.elapsed_seconds)} — ${r.since_heartbeat > r.timeout_seconds ? '💀 STALLED' : '🟢 active'} ${r.heartbeat_msg ? `(${r.heartbeat_msg})` : ''}`
    }));

    console.log(JSON.stringify(enriched, null, 2));
    return enriched;
}

async function markStalled({ threshold = 600 }) {
    const { rows } = await pool.query(`
        UPDATE ops.runs SET status = 'stalled', heartbeat_msg = 'no heartbeat received'
        WHERE status = 'running'
          AND EXTRACT(EPOCH FROM (now() - last_heartbeat)) > $1
        RETURNING id, agent_id, task
    `, [threshold]);

    if (rows.length > 0) {
        console.log(JSON.stringify({ ok: true, action: 'stalled', marked: rows.map(r => ({ id: Number(r.id), agent: r.agent_id, task: r.task })) }));
    } else {
        console.log(JSON.stringify({ ok: true, action: 'stalled', marked: [] }));
    }
    return rows;
}

async function cleanup({ olderThan = 24 }) {
    const { rowCount } = await pool.query(`
        DELETE FROM ops.runs 
        WHERE status IN ('completed', 'failed', 'cancelled', 'stalled')
          AND completed_at < now() - make_interval(hours => $1)
    `, [olderThan]);
    console.log(JSON.stringify({ ok: true, action: 'cleanup', deleted: rowCount }));
}

function formatDuration(seconds) {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

async function main() {
    const [cmd, ...rest] = process.argv.slice(2);
    const args = {};
    for (let i = 0; i < rest.length; i += 2) {
        if (rest[i]?.startsWith('--')) {
            args[rest[i].slice(2)] = rest[i + 1];
        }
    }

    switch (cmd) {
        case 'start':
            await startTask({ agent: args.agent || 'main', task: args.task, timeout: parseInt(args.timeout) || 600, session: args.session, triggeredBy: args.trigger || 'spawn' });
            break;
        case 'heartbeat':
            await heartbeat({ id: parseInt(args.id), msg: args.msg || 'still working' });
            break;
        case 'complete':
            await complete({ id: parseInt(args.id), result: args.result ? JSON.parse(args.result) : {} });
            break;
        case 'fail':
            await fail({ id: parseInt(args.id), error: args.error || 'unknown error' });
            break;
        case 'active':
            await getActive({ agent: args.agent });
            break;
        case 'stalled':
            await markStalled({ threshold: parseInt(args.threshold) || 600 });
            break;
        case 'cleanup':
            await cleanup({ olderThan: parseInt(args['older-than']) || 24 });
            break;
        default:
            console.error('Usage: task-tracker.mjs <start|heartbeat|complete|fail|active|stalled|cleanup>');
            process.exit(1);
    }
    await pool.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });
