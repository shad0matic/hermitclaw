# HermitClaw Recovery Guide

**Purpose:** Restore a HermitClaw deployment from backup after a server rebuild, migration, or disaster.

---

## Prerequisites

- Fresh VPS/server with:
  - OpenClaw installed and onboarded (`openclaw onboard`)
  - PostgreSQL 18+ with pgvector extension installed
  - Node.js 24+
  - Git
- Access to backup archives (see [Backup Contents](#backup-contents))

## Backup Contents

The daily backup script (`scripts/backup-openclaw.sh`) produces:

| File | Contents |
|------|----------|
| `pg-YYYY-MM-DD.sql.gz` | Full `pg_dump` of `openclaw_db` (schemas, data, indexes) |
| `openclaw-YYYY-MM-DD.tar.gz` | OpenClaw config directory (`~/.openclaw/`) |
| `state-YYYYMMDD.tar.gz` | Workspace state snapshots |

Use the **most recent** of each for recovery.

---

## Step-by-Step Recovery

### 1. Set Up the OS User

If OpenClaw runs as a dedicated system user:

```bash
sudo adduser --system --group openclaw
sudo chown openclaw:openclaw /home/openclaw
```

### 2. Restore PostgreSQL

#### Create the DB role and database

```bash
sudo -u postgres psql <<'SQL'
CREATE ROLE openclaw WITH LOGIN;
CREATE DATABASE openclaw_db OWNER openclaw;
GRANT ALL PRIVILEGES ON DATABASE openclaw_db TO openclaw;
SQL
```

> **Note:** The backup dump references the original owner (e.g. `shad`). You must `sed` the owner during restore if the OS user has changed.

#### Enable pgvector

```bash
sudo -u postgres psql -d openclaw_db -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

#### Restore the dump

```bash
# Replace 'shad' with 'openclaw' (or whatever your current OS user is)
zcat /path/to/backups/pg-YYYY-MM-DD.sql.gz \
  | sed 's/OWNER TO shad/OWNER TO openclaw/g; /\\restrict/d; /\\unrestrict/d' \
  | psql -d openclaw_db 2>&1
```

**Expected:** You'll see `CREATE TABLE`, `COPY`, `CREATE INDEX` etc. messages. Ignore warnings about `set_updated_at` or `public` schema ownership — those are Postgres internals.

**If you get "already exists" errors:** The schemas were partially created. Drop them first:

```bash
sudo -u postgres psql -d openclaw_db -c "
  ALTER SCHEMA memory OWNER TO openclaw;
  ALTER SCHEMA ops OWNER TO openclaw;
  DROP SCHEMA memory CASCADE;
  DROP SCHEMA ops CASCADE;
"
```

Then re-run the restore.

#### Verify the restore

```bash
psql -d openclaw_db -c "
  SELECT 'memories' as tbl, count(*) FROM memory.memories
  UNION ALL SELECT 'agent_profiles', count(*) FROM memory.agent_profiles
  UNION ALL SELECT 'agent_events', count(*) FROM ops.agent_events
  ORDER BY 1;
"
```

### 3. Restore GitHub Access

Find the PAT in your archive (check workspace TOOLS.md, `.git-credentials`, or session transcripts):

```bash
git config --global credential.helper store
git config --global user.name "Kevin"
git config --global user.email "kevin@openclaw-vps"

cat > ~/.git-credentials << 'EOF'
https://oauth2:YOUR_GITHUB_PAT@github.com
EOF
chmod 600 ~/.git-credentials
```

Then clone hermitclaw:

```bash
mkdir -p ~/projects
cd ~/projects
git clone https://github.com/shad0matic/hermitclaw.git
cd hermitclaw && npm install
```

### 4. Restore Workspace Files

The workspace lives at `~/.openclaw/workspace/`. Copy from the archive backup:

```bash
# From tarball
tar xzf /path/to/backups/openclaw-YYYY-MM-DD.tar.gz

# Copy workspace files (adjust source path based on archive structure)
SRC=/path/to/extracted/.openclaw/workspace
DST=~/.openclaw/workspace

# Core identity files
for f in SOUL.md USER.md IDENTITY.md TOOLS.md MEMORY.md HEARTBEAT.md; do
  cp "$SRC/$f" "$DST/$f" 2>/dev/null
done

# Memory folder (daily notes, research, agent profiles)
cp -r "$SRC/memory/" "$DST/memory/"

# Additional workspace directories
for dir in planning research scripts docs specs workflows tools config agents business; do
  [ -d "$SRC/$dir" ] && cp -r "$SRC/$dir" "$DST/"
done
```

Remove `BOOTSTRAP.md` if it exists (it triggers first-run wizard):

```bash
rm -f "$DST/BOOTSTRAP.md"
```

### 5. Configure OpenClaw Environment

Add env vars via `openclaw.json` config (not bashrc — OpenClaw injects these into agent sessions):

```bash
# Using the gateway config.patch API or edit openclaw.json directly:
```

Required env vars:

```json
{
  "env": {
    "vars": {
      "PGUSER": "openclaw",
      "PGDATABASE": "openclaw_db",
      "OPENAI_API_KEY": "sk-proj-..."
    }
  }
}
```

### 6. Restore Agent Configuration

The previous setup may have had multi-agent config (agent list, models, sub-agent workspaces). Check the archived `openclaw.json` for the `agents` section:

```bash
cat /path/to/archive/.openclaw/openclaw.json | python3 -m json.tool | grep -A50 '"agents"'
```

Key items to restore:
- Agent list (id, identity, model, workspace paths)
- Agent-specific workspaces (e.g. `workspace-nefario/`, `workspace-phil/`)
- Telegram channel config (bot token, group allowlists, DM policy)
- Skills and plugins config
- Tailscale settings (if used)

### 7. Install Hermitclaw Tools

```bash
cd ~/projects/hermitclaw
npm install
```

Test the memory search:

```bash
OPENAI_API_KEY=sk-proj-... node tools/pg-memory.mjs search "test query"
```

### 8. Restore Systemd Service

If running as a system service:

```bash
sudo cp /path/to/archive/openclaw-gateway.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now openclaw-gateway.service
```

### 9. Restore Cron Jobs & Backup Script

```bash
# Copy backup script
cp ~/projects/hermitclaw/scripts/backup-openclaw.sh ~/scripts/
chmod +x ~/scripts/backup-openclaw.sh

# Restore crontab (check archived crontab or recreate)
crontab -e
# Add: 0 3 * * * /home/openclaw/scripts/backup-openclaw.sh
```

---

## Restoring a Second Instance (e.g. Olga)

If running multiple OpenClaw profiles on the same server:

1. The second instance uses a separate config directory (e.g. `~/.openclaw-olga/`)
2. It runs on a different port (e.g. 18790 vs 18789)
3. It has its own Telegram bot token
4. Create a separate systemd service:

```ini
[Unit]
Description=OpenClaw Gateway (Olga)
After=network-online.target

[Service]
Type=simple
User=openclaw
Group=openclaw
ExecStart=/usr/local/bin/openclaw --profile olga gateway
Restart=always
RestartSec=5
Environment="HOME=/home/openclaw"

[Install]
WantedBy=multi-user.target
```

5. Restore workspace files to `~/.openclaw-olga/workspace/`
6. Restore agent directories to `~/.openclaw-olga/agents/`
7. Update `openclaw.json` paths from `/home/shad/.openclaw-olga/` to `/home/openclaw/.openclaw-olga/`

---

## Post-Recovery Checklist

- [ ] `psql -d openclaw_db -c "\dt memory.*"` — tables exist
- [ ] `psql -d openclaw_db -c "SELECT count(*) FROM memory.memories"` — data present
- [ ] `node ~/projects/hermitclaw/tools/pg-memory.mjs stats` — memory search works
- [ ] `git -C ~/projects/hermitclaw pull` — git access works
- [ ] OpenClaw gateway responds on configured port
- [ ] Telegram bot responds to DM
- [ ] `BOOTSTRAP.md` deleted from workspace
- [ ] Workspace files (SOUL.md, USER.md, etc.) are populated
- [ ] Memory folder has daily notes
- [ ] Cron backup job scheduled

---

## Common Issues

| Problem | Solution |
|---------|----------|
| `FATAL: Peer authentication failed` | Ensure the OS username matches the PG role, or configure `pg_hba.conf` |
| `OWNER TO shad` errors in restore | Pipe through `sed 's/OWNER TO shad/OWNER TO openclaw/g'` |
| `\restrict` errors in psql restore | Strip with `sed '/\\restrict/d; /\\unrestrict/d'` |
| Empty workspace after restore | Check you copied from the right archive path (`.openclaw/workspace/` not `workspace-kevin/` which may be a sub-agent workspace) |
| pgvector not found | `sudo -u postgres psql -d openclaw_db -c "CREATE EXTENSION vector;"` |
| Agent workspaces missing | Copy `workspace-{agent}/` directories alongside main workspace |

---

*Created: 19/02/2026 — Kevin 🍌 (during actual disaster recovery)*
