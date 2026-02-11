#!/usr/bin/env node
/**
 * Task Watchdog — runs every 2 minutes via cron/systemd.
 * Checks for stalled agent tasks (no heartbeat within timeout).
 * Marks them as stalled and optionally notifies.
 * 
 * Usage:
 *   node scripts/task-watchdog.mjs              # Check + mark stalled
 *   node scripts/task-watchdog.mjs --notify     # Also print notification text
 */
import pg from 'pg';

const pool = new pg.Pool({ database: 'openclaw_db', host: '/var/run/postgresql' });

async function run() {
    const notify = process.argv.includes('--notify');

    // Find running tasks where heartbeat is older than their timeout
    const { rows: stalled } = await pool.query(`
        UPDATE ops.runs SET status = 'stalled', heartbeat_msg = 'watchdog: no heartbeat', completed_at = now()
        WHERE status = 'running'
          AND last_heartbeat IS NOT NULL
          AND EXTRACT(EPOCH FROM (now() - last_heartbeat)) > timeout_seconds
        RETURNING id, agent_id, task, timeout_seconds,
                  EXTRACT(EPOCH FROM (now() - started_at))::int as elapsed,
                  EXTRACT(EPOCH FROM (now() - last_heartbeat))::int as silent_for
    `);

    if (stalled.length === 0) {
        // Also check for running tasks with no heartbeat at all that started > 5min ago
        const { rows: noHeartbeat } = await pool.query(`
            UPDATE ops.runs SET status = 'stalled', heartbeat_msg = 'watchdog: never sent heartbeat', completed_at = now()
            WHERE status = 'running'
              AND last_heartbeat IS NULL
              AND started_at < now() - interval '5 minutes'
            RETURNING id, agent_id, task
        `);
        if (noHeartbeat.length > 0 && notify) {
            noHeartbeat.forEach(r => {
                console.log(`⚠️ ${r.agent_id} task #${r.id} "${r.task}" — never sent a heartbeat, marked stalled`);
            });
        }
        await pool.end();
        return;
    }

    stalled.forEach(r => {
        const msg = `💀 ${r.agent_id} task #${r.id} "${r.task}" — stalled after ${Math.floor(r.elapsed / 60)}m (silent for ${Math.floor(r.silent_for / 60)}m, timeout was ${Math.floor(r.timeout_seconds / 60)}m)`;
        if (notify) console.log(msg);
    });

    await pool.end();
}

run().catch(e => { console.error(e.message); process.exit(1); });
