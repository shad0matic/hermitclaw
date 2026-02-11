# HermitClaw Deployment Guide 🦀🍌

**A portable, self-hosted AI agent infrastructure built on [OpenClaw](https://github.com/openclaw/openclaw).**

This guide walks you through setting up a fully functional OpenClaw agent hub with Postgres memory, multi-agent workflows, and a dashboard. It’s designed for a single VPS or local machine and can scale to multiple agents.

**Born from a real deployment** — built by Kevin 🍌 (lead minion) as a production setup. Every step here is battle-tested.

## Prerequisites

- **OS:** Debian/Ubuntu (preferred) or any Linux/macOS with Node.js support
- **Node.js:** 22+ (24 recommended)
- **Postgres:** 16+ (18 recommended) with `pgvector` for embeddings
- **GitHub PAT:** Fine-grained personal access token with repo read/write (for pushing your workspace)
- **API keys:**
  - Anthropic API key (Claude models)
  - OpenAI API key (embeddings + Whisper STT)
  - xAI API key (Grok-powered agents)
  - Google API key (Gemini fallback)
  - ElevenLabs API key (TTS voice)
  - Brave Search API key (web search)
  - Telegram bot token (@BotFather)

## Step 1: Install OpenClaw

Follow the [OpenClaw installation guide](https://docs.openclaw.ai/installation) or run:

```bash
# On Debian/Ubuntu
curl -fsSL https://get.openclaw.ai | bash
# After install, onboard wizard
openclaw onboard
```

The wizard will prompt for Telegram bot token + basic config. Pick “local” mode for a single machine.

## Step 2: Set Up Postgres with pgvector

**Install Postgres + pgvector:**

```bash
# Debian/Ubuntu
sudo apt update && sudo apt install -y postgresql-16 postgresql-contrib build-essential git
# Build pgvector (as postgres user or sudo)
sudo -u postgres bash -c "git clone --branch v0.8.1 https://github.com/pgvector/pgvector.git && cd pgvector && make && make install"
# Create user + DB
sudo -u postgres createuser --superuser $USER
sudo -u postgres createdb openclaw_db -O $USER
```

**Enable pgvector extension + create schemas:**

```bash
psql -d openclaw_db -c "CREATE EXTENSION IF NOT EXISTS vector"
psql -d openclaw_db -c "CREATE SCHEMA IF NOT EXISTS memory"
psql -d openclaw_db -c "CREATE SCHEMA IF NOT EXISTS ops"
```

**Schema setup:** See [postgres-setup.md](postgres-setup.md) for full table definitions (23 tables across `memory` and `ops`).

- **DB:** `openclaw_db` | **User:** `$USER` (peer auth)
- **Auth:** Unix socket peer auth (no password needed for local user)
- **Connection:** `postgresql://$USER@localhost:5432/openclaw_db` via `/var/run/postgresql`

## Step 3: Clone HermitClaw (Reusable Infrastructure)

```bash
git clone https://github.com/shad0matic/hermitclaw.git
cd hermitclaw
npm install
```

This gives you the tools, scripts, workflows, and templates.

## Step 4: Create Your Private Workspace

Your private workspace is a **separate, personal repo** that holds your memory, identity, and unique configs. It’s distinct from `hermitclaw` (the shared framework) to keep personal data private.

### Why Separate?
- `hermitclaw` = reusable, sanitized tools and guides for anyone
- `your-workspace` = your agent’s memory (MEMORY.md), user details (USER.md), and personal notes
- Never mix personal data into a shared repo

### Create Your Workspace Repo

1. **On GitHub:**
   - Go to [github.com/new](https://github.com/new)
   - Name it `yourname-workspace` (e.g., `john-workspace`)
   - Set to **Private** ✅
   - Description: "My OpenClaw agent workspace — personal memory and configs"
   - Don’t initialize with README
   - Click **Create Repository**

2. **Add to PAT:**
   - Go to Settings → Developer Settings → Personal Access Tokens → edit your fine-grained PAT
   - Add `yourname-workspace` to the repo permissions (read & write)

3. **Clone Locally:**
   ```bash
   git clone https://github.com/YOUR_USER/yourname-workspace.git
   cd yourname-workspace
   ```

4. **Set Up Workspace Structure:**
   Copy templates from `hermitclaw` and customize them:
   ```bash
   # Copy templates from hermitclaw
   cp -r /path/to/hermitclaw/templates/* .
   # Copy .gitignore to exclude sensitive files
   cp /path/to/hermitclaw/.gitignore .
   # Create memory dir for daily notes
   mkdir -p memory
   ```

5. **Customize Key Files:**
   - **AGENTS.md** — Your operational rules. Defines boot context, memory usage, and Postgres recall.
   - **SOUL.md** — Your agent’s personality and vibe. Edit to match how you want your agent to behave.
   - **USER.md** — Details about you (name, timezone, projects, goals). Fill this in so your agent understands you.
   - **TOOLS.md** — Environment-specific notes (camera names, SSH hosts, etc.). Add as needed.
   - **MEMORY.md** — Your agent’s long-term memory. Start with a few key facts about yourself or projects.

   Example for `USER.md`:
   ```markdown
   # USER.md - About My Human

   - **Name:** John Doe
   - **What to call them:** John
   - **Timezone:** UTC-5 (Eastern Time)
   - **Communication style:** Direct, no-fluff answers

   ## Professional
   - **Role:** Software Engineer
   - **Company/Projects:** Acme Corp, personal app

   ## Goals
   - Ship app by Q2 2026
   ```

6. **Commit & Push:**
   ```bash
   git add -A
   git commit -m "Initial workspace setup — memory, identity, configs"
   git push -u origin main
   ```

### How Your Workspace Works

- **Purpose:** This is your agent’s home. It’s where memory files, personal context, and instance-specific configs live.
- **Security:** `.gitignore` excludes `.env`, logs, and OpenClaw internals. Never commit API keys or secrets.
- **Sync:** Scripts like `memory-sync.mjs` (from `hermitclaw`) sync your MEMORY.md and daily notes to Postgres for long-term recall.
- **Backup:** Your private repo is versioned on GitHub — a natural backup of your agent’s brain.

## Step 5: Set Up Postgres Memory Tools

Copy the memory tools from `hermitclaw` to your workspace. These let your agent recall context even after session compaction:

```bash
# From your workspace dir
cp -r /path/to/hermitclaw/scripts/* scripts/
cp -r /path/to/hermitclaw/tools/* tools/
```

- **`memory-sync.mjs`** — Syncs MEMORY.md + daily notes to Postgres with embeddings
- **`memory-recall.mjs`** — Semantic search to recall memories (used on boot or after compaction)
- **`pg-memory.mjs`** — CLI for memory operations (search/insert/log)

Run an initial sync:

```bash
cd /path/to/yourname-workspace
node scripts/memory-sync.mjs
```

Set up a cron to auto-sync every 6h:

```bash
openclaw cron add --name memory-sync --expr "0 */6 * * *" --text "Run memory sync: execute node scripts/memory-sync.mjs"
```

## Step 6: Configure Agent Behavior (Optional)

Your agent follows rules from `AGENTS.md` and vibe from `SOUL.md`. Tweak these in your workspace to match your needs:

- **Trust level:** Start conservative (ask before external actions) and escalate as trust grows
- **Quiet hours:** Define when notifications should be silent
- **Memory recall:** Instructions to use Postgres search when context is lost

## Step 7: Install Dashboard (Optional)

The dashboard ("Minions Control") is a Next.js app for monitoring agents, costs, and system health. It’s in a separate repo:

- **Repo:** `github.com/YOUR_USER/oclaw-ops`
- **Local path:** `$HOME/projects/oclaw-ops/`
- **Stack:** Next.js + Prisma + Tailwind + shadcn/ui
- **Setup:** Clone, `npm install`, set `DATABASE_URL` in `.env`, `npm run dev`
- **Access:** Tailscale-only + basic auth for security

## Step 8: Configure System Services & Crons

For reliability, set up systemd services and cron jobs:

### User systemd services

- **`metrics-collector.service`** — Collects CPU/memory stats every 30s for dashboard charts
  ```bash
  cat > ~/.config/systemd/user/metrics-collector.service << 'EOF'
  [Unit]
  Description=System metrics collector for agent dashboard
  After=postgresql.service

  [Service]
  Type=simple
  ExecStart=/usr/bin/node $HOME/.openclaw/workspace/scripts/collect-metrics.mjs
  Restart=always
  RestartSec=10

  [Install]
  WantedBy=default.target
  EOF
  systemctl --user daemon-reload && systemctl --user enable --now metrics-collector
  ```

### Crontab

Set up cron jobs for backups and maintenance (edit with `crontab -e` or use `openclaw cron`):

```bash
# Daily state backup at 02:00 UTC
0 2 * * * tar czf $HOME/backups/openclaw/state-$(date +\%Y\%m\%d).tar.gz $HOME/.openclaw/ 2>/dev/null
# Daily full backup at 03:00 UTC
0 3 * * * $HOME/.openclaw/workspace/scripts/backup-openclaw.sh >> $HOME/backups/openclaw/backup.log 2>&1
# Weekly update check Monday 08:00 UTC
0 8 * * 1 openclaw update check --channel telegram --chat -1003396419207 --topic 710
# Cleanup old backups at 05:00 UTC
0 5 * * * find $HOME/backups/openclaw/state-*.tar.gz -mtime +14 -delete 2>/dev/null
# Log cleanup at 05:30 UTC
30 5 * * * $HOME/.openclaw/workspace/scripts/cleanup-logs.sh >> $HOME/backups/openclaw/backup.log 2>&1
```

## Step 9: Set Up Gmail/Calendar (Optional)

For email and calendar integration, see [gmail-pubsub-setup.md](gmail-pubsub-setup.md).

- **Account:** your-agent@gmail.com
- **Option B (recommended):** Pub/Sub webhooks for push notifications
- **Setup:** Requires Google Cloud project, OAuth credentials, Tailscale Funnel

## Agent Coordination Setup

Prevent file edit conflicts between agents and track all activity in Postgres.

### Create the file_claims table

```sql
CREATE TABLE IF NOT EXISTS ops.file_claims (
  id BIGSERIAL PRIMARY KEY,
  agent_id TEXT NOT NULL,
  file_path TEXT NOT NULL,
  description TEXT,
  claimed_at TIMESTAMPTZ DEFAULT now(),
  released_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_file_claims_unique_active
  ON ops.file_claims (file_path, agent_id) WHERE released_at IS NULL;
CREATE INDEX idx_file_claims_active
  ON ops.file_claims (file_path) WHERE released_at IS NULL;
CREATE INDEX idx_file_claims_agent
  ON ops.file_claims (agent_id) WHERE released_at IS NULL;
```

### Install the git post-commit hook

The shared hook lives at `$WORKSPACE/scripts/git-post-commit-hook.sh`. Symlink it into each repo:

```bash
ln -sf $WORKSPACE/scripts/git-post-commit-hook.sh $PROJECTS/oclaw-ops/.git/hooks/post-commit
ln -sf $WORKSPACE/scripts/git-post-commit-hook.sh $PROJECTS/hermitclaw/.git/hooks/post-commit
ln -sf $WORKSPACE/scripts/git-post-commit-hook.sh $WORKSPACE/.git/hooks/post-commit
chmod +x $WORKSPACE/scripts/git-post-commit-hook.sh
```

The hook auto-logs every commit to `ops.agent_events` with hash, message, changed files, and repo name. Agent is resolved from `memory.agent_profiles` (no hardcoded list).

### File claim CLI

Located at `$WORKSPACE/tools/file-claim.mjs`. Commands:

- **claim** — `node tools/file-claim.mjs claim --agent kevin --file src/app.tsx --desc "refactoring"`
- **release** — `node tools/file-claim.mjs release --agent kevin --file src/app.tsx`
- **release-all** — `node tools/file-claim.mjs release-all --agent kevin`
- **check** — `node tools/file-claim.mjs check --file src/app.tsx`
- **active** — `node tools/file-claim.mjs active [--agent kevin]`

### Task event logging

`tools/task-tracker.mjs` automatically logs `task_start`, `task_complete`, and `task_fail` events to `ops.agent_events`. No extra configuration needed.

### Watchdog stale claim cleanup

`scripts/task-watchdog.mjs` releases file claims older than 2h and logs `task_stalled` events for timed-out tasks. Runs via the existing watchdog cron (every 2 minutes).

---

## Troubleshooting

- **Rate limits:** Configure fallbacks in OpenClaw config (`agents.defaults.model.fallbacks`)
- **Postgres connection:** Ensure `pg_hba.conf` allows local peer auth or set password
- **Memory recall fails:** Check `memory-sync.mjs` ran and embeddings exist in `memory.memories`

## Backup Strategy

- **Daily state:** Tarball of `.openclaw/` (config, internals)
- **Daily full:** `pg_dump` + workspace files via `backup-openclaw.sh`
- **Retention:** 14 daily + 4 weekly
- **GitHub:** Your private workspace repo is a versioned backup of memory

## Next Steps

- Install dashboard from `oclaw-ops` repo
- Set up additional agents with `openclaw agents add`
- Define custom workflows in `workflows/` (YAML)
- See [HermitClaw Roadmap](hermitclaw/ROADMAP.md) for portable MacBook setup

---

This guide grows with each deployment phase. Last updated for Postgres memory upgrade (Phase 7).
