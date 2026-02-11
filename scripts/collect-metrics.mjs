#!/usr/bin/env node
// Collects system metrics into ops.system_metrics every 30s
// Run as: node collect-metrics.mjs (or via systemd)
import { execSync } from 'child_process';
import pg from 'pg';

const pool = new pg.Pool({ host: '/var/run/postgresql', database: 'openclaw_db', user: process.env.USER });

async function collect() {
  try {
    // CPU usage (1-second sample)
    const cpuIdle = execSync("top -bn1 | grep 'Cpu(s)' | awk '{print $8}'", { encoding: 'utf8' }).trim();
    const cpuPct = Math.max(0, 100 - parseFloat(cpuIdle || '100'));

    // Memory
    const memInfo = execSync("free -b | grep Mem", { encoding: 'utf8' }).trim().split(/\s+/);
    const memTotal = BigInt(memInfo[1]);
    const memUsed = BigInt(memInfo[2]);

    // Disk
    const dfLine = execSync("df -B1 / | tail -1", { encoding: 'utf8' }).trim().split(/\s+/);
    const diskTotal = BigInt(dfLine[1]);
    const diskUsed = BigInt(dfLine[2]);

    // DB
    const dbSizeRes = await pool.query("SELECT pg_database_size('openclaw_db') as s");
    const dbSize = BigInt(dbSizeRes.rows[0].s);
    const dbConns = await pool.query("SELECT count(*) as c FROM pg_stat_activity WHERE datname='openclaw_db'");
    const dbConnections = parseInt(dbConns.rows[0].c);

    await pool.query(
      `INSERT INTO ops.system_metrics (cpu_pct, mem_used_bytes, mem_total_bytes, disk_used_bytes, disk_total_bytes, db_size_bytes, db_connections)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [cpuPct, memUsed.toString(), memTotal.toString(), diskUsed.toString(), diskTotal.toString(), dbSize.toString(), dbConnections]
    );

    // Cleanup: delete rows older than 24h
    await pool.query("DELETE FROM ops.system_metrics WHERE ts < now() - interval '24 hours'");
  } catch (e) {
    console.error('collect error:', e.message);
  }
}

// Run immediately then every 30s
collect();
setInterval(collect, 30_000);
console.log('Metrics collector started (30s interval)');
