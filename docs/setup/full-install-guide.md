# Full Install Guide: OpenClaw + AlphaClaw + HermitClaw

**A complete, step-by-step tutorial to set up a self-hosted AI agent system from scratch.**

> **Time:** ~2 hours | **Difficulty:** Intermediate | **Last updated:** March 2026

---

## Table of Contents

- [Overview — What Are These Three Things?](#overview--what-are-these-three-things)
- [Prerequisites](#prerequisites)
- [Part 1: Server Setup & Hardening](#part-1-server-setup--hardening)
- [Part 2: Install OpenClaw](#part-2-install-openclaw)
- [Part 3: Install AlphaClaw](#part-3-install-alphaclaw)
- [Part 4: Connect Telegram](#part-4-connect-telegram)
- [Part 5: PostgreSQL + pgvector](#part-5-postgresql--pgvector)
- [Part 6: Install HermitClaw](#part-6-install-hermitclaw)
- [Part 7: Mission Control Dashboard](#part-7-mission-control-dashboard)
- [Part 8: Coding Agents (Claude Code, Codex)](#part-8-coding-agents-claude-code-codex)
- [Part 9: Verify Everything](#part-9-verify-everything)
- [Quick Reference](#quick-reference)
- [Troubleshooting](#troubleshooting)
- [Cost Management](#cost-management)
- [Updating](#updating)
- [Next Steps](#next-steps)

---

## Overview — What Are These Three Things?

| Component | What It Is | Role |
|-----------|-----------|------|
| **OpenClaw** | The core AI agent runtime | Brain — handles LLM calls, tools, memory, channels (Telegram, Discord, etc.) |
| **AlphaClaw** | Setup UI + gateway manager | Wrapper — provides a web UI on port 3000 for config, spawns and manages the OpenClaw gateway |
| **HermitClaw** | Infrastructure toolkit | Upgrades — adds Postgres memory, cost tracking, multi-agent workflows, templates, and scripts |

**How they relate:**

```
AlphaClaw (port 3000 — Setup UI & watchdog)
  └── OpenClaw Gateway (port 18789 — agent runtime)
       ├── Telegram / Discord / CLI channels
       ├── Tools (exec, browser, web search, etc.)
       └── Workspace (SOUL.md, AGENTS.md, memory/)

HermitClaw (separate repo — tools & templates)
  ├── tools/ — cost tracking, memory search, agent leveling
  ├── scripts/ — backup, metrics, memory sync
  ├── templates/ — ready-to-use workspace files
  └── docs/ — you're reading them

Mission Control Dashboard (port 3003 — oclaw-ops)
  └── Web UI for costs, sessions, system health, agents
```

---

## Prerequisites

### Hardware
- **VPS or dedicated server** — 2+ CPU cores, 4GB+ RAM, 20GB+ disk (OVH, Hetzner, DigitalOcean all work)
- **Or a Mac/Linux machine** for local setup (see [Mac-specific notes](#mac-specific-notes) at the bottom)

### Accounts & Keys
- **AI Provider API key** — at least one of:
  - [Anthropic](https://console.anthropic.com/settings/keys) (Claude) — recommended, starts with `sk-ant-...`
  - [OpenAI](https://platform.openai.com/api-keys) (GPT-4) — starts with `sk-proj-...`
  - [Google](https://aistudio.google.com/apikey) (Gemini) — starts with `AIza...`
- **Telegram account** (for bot channel — optional but recommended)
- **GitHub account** (for cloning repos)
- **Brave Search API key** (optional, free tier at [brave.com/search/api](https://brave.com/search/api/))

### Software
- **Node.js 24** (recommended) or 22 LTS
- **Git**
- **PostgreSQL 17+** with pgvector (for memory — optional but highly recommended)

---

## Part 1: Server Setup & Hardening

> **Skip this section** if you're installing on a Mac or existing Linux machine. Jump to [Part 2](#part-2-install-openclaw).

### 1.1 Fresh VPS Setup

Start with a clean **Debian 13 (Trixie)** or **Ubuntu 24.04** image.

```bash
# SSH in as root
ssh root@your-vps-ip

# Update everything
apt update && apt upgrade -y && apt autoremove -y
reboot
```

### 1.2 Create a Non-Root User

Never run OpenClaw as root.

```bash
adduser youruser
usermod -aG sudo youruser
```

Log out and SSH back as `youruser`.

### 1.3 SSH Hardening

Edit `/etc/ssh/sshd_config`:

```bash
sudo vi /etc/ssh/sshd_config
```

Set these values:

```
Port 2222
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
```

```bash
sudo systemctl restart sshd
```

> ⚠️ **Before closing your current SSH session**, open a new terminal and verify you can connect on port 2222. Otherwise you'll lock yourself out.

### 1.4 Firewall

```bash
sudo apt install ufw -y
sudo ufw allow 2222/tcp      # SSH
sudo ufw allow from 100.0.0.0/8 to any   # Tailscale (optional, recommended)
sudo ufw enable
```

### 1.5 Fail2Ban

```bash
sudo apt install fail2ban -y

sudo tee /etc/fail2ban/jail.local << 'EOF'
[sshd]
enabled = true
port = 2222
maxretry = 3
bantime = 3600
findtime = 600
EOF

sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 1.6 Tailscale (Recommended)

Tailscale gives you secure access to your VPS without exposing ports publicly. Highly recommended.

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```

Follow the URL to authenticate. Your VPS is now accessible at `your-machine.tail12345.ts.net`.

---

## Part 2: Install OpenClaw

### 2.1 Install Node.js

**Option A — Installer script (recommended):**

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

This installs Node.js if missing, installs OpenClaw, and launches the onboarding wizard.

**Option B — Manual:**

```bash
# Install Node.js 24 via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
source ~/.bashrc
nvm install 24
nvm use 24

# Install OpenClaw
npm install -g openclaw
```

### 2.2 Verify

```bash
node --version      # Should show v24.x
openclaw --version  # Should show OpenClaw 2026.x.x
```

### 2.3 Configure OpenClaw

```bash
openclaw configure
```

The wizard walks you through:
1. **Model provider** — select `anthropic` (or your preferred provider), paste your API key
2. **Channels** — skip for now (we'll add Telegram in Part 4)
3. **Other settings** — press Enter to accept defaults

Your config lives at `~/.openclaw/openclaw.json`.

### 2.4 Test It

```bash
openclaw gateway start
```

In a new terminal:

```bash
openclaw chat
```

Type a message. If you get a response, OpenClaw is working! Type `exit` to quit.

```bash
openclaw gateway stop
```

---

## Part 3: Install AlphaClaw

AlphaClaw wraps OpenClaw with a web UI for configuration and manages the gateway as a child process.

### 3.1 Install

```bash
cd ~
npm install @chrysb/alphaclaw
```

This installs AlphaClaw and OpenClaw as a dependency in `~/node_modules/`.

### 3.2 Add to PATH

```bash
echo 'export PATH="$HOME/node_modules/.bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

Verify:

```bash
alphaclaw --version
```

### 3.3 Configure

Create the `.env` file:

```bash
mkdir -p ~/.alphaclaw
cat > ~/.alphaclaw/.env << 'EOF'
SETUP_PASSWORD=YourSecurePasswordHere
EOF
chmod 600 ~/.alphaclaw/.env
```

> ⚠️ **SETUP_PASSWORD must not be empty.** AlphaClaw exits immediately if it is.

### 3.4 First Run (Manual Test)

```bash
alphaclaw start
```

Open `http://your-machine:3000` (or via Tailscale: `http://your-machine.tail12345.ts.net:3000`).

You should see the AlphaClaw Setup UI. Enter your setup password to access it.

Use the UI to:
- Check gateway status
- Configure providers (add API keys)
- Set environment variables (Envars tab)
- Browse workspace files

Stop with `Ctrl+C` when done testing.

### 3.5 Systemd Service (Production)

Enable linger so the service starts at boot without login:

```bash
sudo loginctl enable-linger $(whoami)
```

Create the service file:

```bash
mkdir -p ~/.config/systemd/user

cat > ~/.config/systemd/user/alphaclaw.service << 'EOF'
[Unit]
Description=AlphaClaw (OpenClaw Harness)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=%h
Environment=PATH=%h/node_modules/.bin:/usr/local/bin:/usr/bin:/bin
ExecStart=%h/node_modules/.bin/alphaclaw start
Restart=always
RestartSec=5
EnvironmentFile=%h/.alphaclaw/.env

[Install]
WantedBy=default.target
EOF
```

> **Note:** `%h` expands to your home directory automatically.

Enable and start:

```bash
systemctl --user daemon-reload
systemctl --user enable alphaclaw
systemctl --user start alphaclaw
```

Verify:

```bash
systemctl --user status alphaclaw
```

You should see `active (running)` with child processes for `alphaclaw`, `openclaw`, and `openclaw-gateway`.

> ⚠️ **Don't use `openclaw gateway install`** alongside AlphaClaw — it creates a conflicting systemd service. AlphaClaw manages the gateway itself.

---

## Part 4: Connect Telegram

### 4.1 Create a Telegram Bot

1. Open Telegram, search for `@BotFather`
2. Send `/newbot`
3. Enter a display name (e.g., "Kevin Bot")
4. Enter a username ending in `bot` (e.g., `kevin_assistant_bot`)
5. Copy the token BotFather gives you (looks like `123456789:ABC...XYZ`)

### 4.2 Add Bot Token

**Option A — Via AlphaClaw UI:**

Go to `http://your-machine:3000` → Envars tab → add `TELEGRAM_BOT_TOKEN` with your token.

**Option B — Via CLI:**

```bash
openclaw configure --section telegram
```

Paste your token when prompted.

### 4.3 Restart

```bash
systemctl --user restart alphaclaw
```

### 4.4 Test

Open Telegram, find your bot by username, and send a message. It should respond within 10-15 seconds.

### 4.5 Create a Group with Topics (Recommended)

For organized conversations:

1. Create a new Telegram group
2. Add your bot to the group
3. Go to group settings → enable **Topics**
4. Create topics for different areas (e.g., "General", "Projects", "Research")
5. Make the bot an admin (required for topic access)

---

## Part 5: PostgreSQL + pgvector

Postgres enables long-term vector memory — your agent remembers things across sessions and can do semantic search.

### 5.1 Install PostgreSQL

**Debian/Ubuntu:**

```bash
sudo apt install postgresql postgresql-contrib -y
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

**macOS (Homebrew):**

```bash
brew install postgresql@17
brew services start postgresql@17
```

### 5.2 Install pgvector

**Debian/Ubuntu (from source):**

```bash
sudo apt install postgresql-server-dev-all build-essential git -y
cd /tmp
git clone https://github.com/pgvector/pgvector.git
cd pgvector
make
sudo make install
```

**macOS:**

```bash
brew install pgvector
```

### 5.3 Create Database and User

```bash
sudo -u postgres psql << 'SQL'
CREATE ROLE hermes WITH LOGIN;
CREATE DATABASE siftly_db OWNER hermes;
GRANT ALL PRIVILEGES ON DATABASE siftly_db TO hermes;
\c siftly_db
CREATE EXTENSION IF NOT EXISTS vector;
SQL
```

> **Customize:** Use any database/user names you prefer. We use `siftly_db` / `hermes` in this guide.

**macOS note:** On Homebrew Postgres, you connect as your current user (no `sudo -u postgres`):

```bash
createdb siftly_db
psql -d siftly_db -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### 5.4 Create Schemas

```bash
sudo -u postgres psql -d siftly_db << 'SQL'
-- Memory schema (agent brain)
CREATE SCHEMA IF NOT EXISTS memory;

CREATE TABLE memory.memories (
    id BIGSERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    embedding vector(1536),
    tags TEXT[] DEFAULT '{}',
    importance SMALLINT DEFAULT 5 CHECK (importance >= 1 AND importance <= 10),
    source_file TEXT,
    agent_id TEXT DEFAULT 'main',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE memory.daily_notes (
    id BIGSERIAL PRIMARY KEY,
    note_date DATE NOT NULL UNIQUE,
    content TEXT NOT NULL,
    embedding vector(1536),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE memory.mistakes (
    id SERIAL PRIMARY KEY,
    description TEXT NOT NULL,
    severity SMALLINT DEFAULT 3,
    context TEXT,
    lesson TEXT,
    resolved BOOLEAN DEFAULT FALSE,
    agent_id TEXT DEFAULT 'main',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE memory.agent_profiles (
    id SERIAL PRIMARY KEY,
    agent_id TEXT NOT NULL UNIQUE,
    display_name TEXT,
    level SMALLINT DEFAULT 1,
    trust_score REAL DEFAULT 0.5,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ops schema (operational tracking)
CREATE SCHEMA IF NOT EXISTS ops;

CREATE TABLE ops.agent_costs (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    agent_id TEXT,
    session_key TEXT,
    provider TEXT,
    model TEXT,
    input_tokens BIGINT DEFAULT 0,
    output_tokens BIGINT DEFAULT 0,
    cached_tokens BIGINT DEFAULT 0,
    cost_usd NUMERIC(12,6),
    metadata JSONB DEFAULT '{}'
);

CREATE TABLE ops.context_snapshots (
    id BIGSERIAL PRIMARY KEY,
    ts TIMESTAMPTZ DEFAULT NOW(),
    total_bytes INTEGER,
    file_sizes JSONB,
    token_estimate INTEGER
);

CREATE TABLE ops.cost_snapshots (
    id BIGSERIAL PRIMARY KEY,
    snapshot_hour TIMESTAMPTZ,
    fixed_eur NUMERIC(10,4),
    variable_eur NUMERIC(10,4),
    total_eur NUMERIC(10,4),
    breakdown JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ops.subscriptions (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    provider TEXT,
    cost_eur NUMERIC(10,2),
    billing_cycle TEXT DEFAULT 'monthly',
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ops.fx_rates (
    id SERIAL PRIMARY KEY,
    pair TEXT NOT NULL,
    rate NUMERIC(12,6),
    source TEXT,
    fetched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_memories_agent ON memory.memories(agent_id);
CREATE INDEX idx_memories_created ON memory.memories(created_at DESC);
CREATE INDEX idx_memories_tags ON memory.memories USING gin(tags);
CREATE INDEX idx_agent_costs_created ON ops.agent_costs(created_at DESC);
CREATE INDEX idx_agent_costs_session ON ops.agent_costs(session_key);

-- Grant permissions
GRANT ALL ON SCHEMA memory TO hermes;
GRANT ALL ON SCHEMA ops TO hermes;
GRANT ALL ON ALL TABLES IN SCHEMA memory TO hermes;
GRANT ALL ON ALL TABLES IN SCHEMA ops TO hermes;
GRANT ALL ON ALL SEQUENCES IN SCHEMA memory TO hermes;
GRANT ALL ON ALL SEQUENCES IN SCHEMA ops TO hermes;
ALTER DEFAULT PRIVILEGES IN SCHEMA memory GRANT ALL ON TABLES TO hermes;
ALTER DEFAULT PRIVILEGES IN SCHEMA ops GRANT ALL ON TABLES TO hermes;
ALTER DEFAULT PRIVILEGES IN SCHEMA memory GRANT ALL ON SEQUENCES TO hermes;
ALTER DEFAULT PRIVILEGES IN SCHEMA ops GRANT ALL ON SEQUENCES TO hermes;
SQL
```

### 5.5 Verify

```bash
psql -U hermes -d siftly_db -c "SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema IN ('memory', 'ops') ORDER BY 1,2;"
```

You should see all the tables listed.

### 5.6 Configure Connection

Add your database URL to AlphaClaw's env:

```bash
echo 'DATABASE_URL=postgresql://hermes@127.0.0.1:5432/siftly_db' >> ~/.alphaclaw/.env
```

For local Unix socket access (macOS):

```bash
echo 'DATABASE_URL=postgresql:///siftly_db?host=/tmp' >> ~/.alphaclaw/.env
```

---

## Part 6: Install HermitClaw

HermitClaw adds tools, scripts, and templates on top of OpenClaw.

### 6.1 Clone

```bash
mkdir -p ~/projects
cd ~/projects
git clone https://github.com/shad0matic/hermitclaw.git
cd hermitclaw
npm install
```

### 6.2 Copy Templates to Workspace

```bash
cp -i templates/* ~/.alphaclaw/.openclaw/workspace/
```

> The `-i` flag asks before overwriting existing files.

This gives you ready-to-use:
- `SOUL.md` — agent personality and behavior
- `AGENTS.md` — operational rules
- `USER.md` — info about you (customize this!)
- `TOOLS.md` — coding agent squad config

### 6.3 Customize Your Agent

Edit the workspace files to match your setup:

```bash
vi ~/.alphaclaw/.openclaw/workspace/SOUL.md
vi ~/.alphaclaw/.openclaw/workspace/USER.md
```

Example `SOUL.md`:

```markdown
# SOUL.md

You're **Kevin** — my right-hand bot. Team leader of the minion squad.
Never code yourself. Delegate to the best agent for the job.
Efficient, sharp, slightly playful. Brief updates, clear summaries.
```

Example `USER.md`:

```markdown
# USER.md

- **Name:** Your Name
- **Timezone:** Europe/Paris
- **Notes:** Likes efficiency. Prefers action over discussion.
```

### 6.4 Set Up Tools

HermitClaw includes useful CLI tools. The key ones:

| Tool | Purpose | Setup |
|------|---------|-------|
| `tools/cost-logger.mjs` | Tracks API costs to Postgres | Run as systemd service |
| `tools/cost-report.mjs` | Generate cost reports | Run on-demand |
| `tools/log-mistake.mjs` | Track agent mistakes | Called from agent workflow |
| `tools/memory-search.mjs` | Search Postgres memories | Called from agent workflow |
| `tools/health-check.mjs` | System health monitoring | Run from heartbeat |

Copy the tools you want to your workspace:

```bash
cp -r ~/projects/hermitclaw/tools/*.mjs ~/.alphaclaw/.openclaw/workspace/tools/
```

### 6.5 Restart

```bash
systemctl --user restart alphaclaw
```

---

## Part 7: Mission Control Dashboard

The Mission Control dashboard (oclaw-ops) gives you a web UI for monitoring costs, sessions, system health, and agents.

### 7.1 Clone and Install

```bash
cd ~/projects
git clone https://github.com/shad0matic/oclaw-ops.git
cd oclaw-ops/dashboard
npm install
```

### 7.2 Configure

```bash
cat > .env.local << 'EOF'
DATABASE_URL=postgresql://hermes@127.0.0.1:5432/siftly_db
AUTH_SECRET=REPLACE_WITH_RANDOM_SECRET
ADMIN_PASSWORD=YourDashboardPassword
EOF
```

Generate a real auth secret:

```bash
SECRET=$(openssl rand -base64 32)
sed -i "s|REPLACE_WITH_RANDOM_SECRET|$SECRET|" .env.local
```

**macOS note:** Use Unix socket instead:

```bash
DATABASE_URL="postgresql:///siftly_db?host=/tmp"
```

### 7.3 Build and Test

```bash
npm run build
npm start -- -p 3003
```

Open `http://your-machine:3003` — you should see the login page. Use your `ADMIN_PASSWORD` to log in.

Stop with `Ctrl+C`.

### 7.4 Systemd Service

Create a start script:

```bash
cat > ~/projects/oclaw-ops/dashboard/start.sh << 'SCRIPT'
#!/bin/bash
export PATH="$HOME/.nvm/versions/node/$(node --version)/bin:$PATH"
cd ~/projects/oclaw-ops/dashboard
exec node node_modules/next/dist/bin/next start -p 3003
SCRIPT
chmod +x ~/projects/oclaw-ops/dashboard/start.sh
```

> **Adjust the PATH** if you installed Node differently (e.g., via system package manager, just use `/usr/bin`).

Create the service:

```bash
cat > ~/.config/systemd/user/oclaw-ops.service << 'EOF'
[Unit]
Description=Mission Control Dashboard (Next.js)
After=network.target

[Service]
Type=simple
WorkingDirectory=%h/projects/oclaw-ops/dashboard
EnvironmentFile=%h/projects/oclaw-ops/dashboard/.env.local
ExecStart=%h/projects/oclaw-ops/dashboard/start.sh
Restart=always
RestartSec=5

[Install]
WantedBy=default.target
EOF

systemctl --user daemon-reload
systemctl --user enable oclaw-ops
systemctl --user start oclaw-ops
```

Verify:

```bash
systemctl --user status oclaw-ops
curl -s -o /dev/null -w "HTTP %{http_code}" http://localhost:3003/login
# Should show HTTP 200
```

---

## Part 8: Coding Agents (Claude Code, Codex)

Your AI agent can delegate coding tasks to specialized sub-agents. These are optional but powerful.

### 8.1 Claude Code

```bash
npm install -g @anthropic-ai/claude-code
```

Sign in (requires Anthropic Max subscription or API key):

```bash
claude auth login
```

Test:

```bash
claude --print "Hello, what version are you?"
```

### 8.2 Codex (OpenAI)

```bash
npm install -g @openai/codex
```

Authenticate:

```bash
codex auth
```

### 8.3 Configure Agent Tiers

In your workspace `TOOLS.md`, define which agent handles what:

```markdown
# TOOLS.md

## Coding Squad

| Tier | Agent | Model | When to use |
|------|-------|-------|-------------|
| 🔴 Kevin | Main | Opus | Planning, review, orchestration. NO coding. |
| 🟡 Standard | Claude Code | Sonnet | Features, bug fixes, refactors |
| 🟢 Light | Pi | Haiku | Docs, formatting, simple fixes |
| 🔵 Heavy | Codex | o3 | Complex tasks needing OpenAI strengths |
```

---

## Part 9: Verify Everything

Run through this checklist:

| Check | Command | Expected |
|-------|---------|----------|
| AlphaClaw running | `systemctl --user status alphaclaw` | `active (running)` |
| Gateway healthy | `openclaw status` | Shows gateway running |
| AlphaClaw UI | `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000` | `200` |
| Telegram bot responds | Send a message to your bot | Gets a reply |
| Postgres accessible | `psql -U hermes -d siftly_db -c "SELECT 1;"` | Returns `1` |
| Memory tables exist | `psql -U hermes -d siftly_db -c "SELECT count(*) FROM memory.memories;"` | `0` (or more) |
| Dashboard loads | `curl -s -o /dev/null -w "%{http_code}" http://localhost:3003/login` | `200` |
| Claude Code works | `claude --print "hi"` | Gets a response |

---

## Quick Reference

### Services

| Service | Port | URL | Systemd Unit |
|---------|------|-----|-------------|
| AlphaClaw (Setup UI) | 3000 | http://localhost:3000 | `alphaclaw.service` |
| OpenClaw Gateway | 18789 | ws://127.0.0.1:18789 | (child of AlphaClaw) |
| Mission Control | 3003 | http://localhost:3003 | `oclaw-ops.service` |
| PostgreSQL | 5432 | localhost | `postgresql.service` |

### Common Commands

| Command | Description |
|---------|-------------|
| `systemctl --user status alphaclaw` | Check AlphaClaw status |
| `systemctl --user restart alphaclaw` | Restart AlphaClaw + gateway |
| `systemctl --user stop alphaclaw` | Stop everything |
| `journalctl --user -u alphaclaw -f` | Live AlphaClaw logs |
| `openclaw status` | Gateway status |
| `openclaw chat` | CLI chat |
| `openclaw configure` | Setup wizard |

### File Locations

| Path | Contents |
|------|----------|
| `~/.alphaclaw/.env` | AlphaClaw environment variables |
| `~/.alphaclaw/.openclaw/` | OpenClaw data directory |
| `~/.alphaclaw/.openclaw/workspace/` | Agent workspace (SOUL.md, AGENTS.md, etc.) |
| `~/.alphaclaw/.openclaw/agents/main/agent/auth-profiles.json` | API keys |
| `~/projects/hermitclaw/` | HermitClaw tools and templates |
| `~/projects/oclaw-ops/dashboard/` | Mission Control dashboard |

---

## Troubleshooting

### AlphaClaw exits immediately
- Check `SETUP_PASSWORD` is set in `~/.alphaclaw/.env`
- Check logs: `journalctl --user -u alphaclaw --no-pager -n 50`

### "command not found: openclaw"
- Add to PATH: `export PATH="$HOME/node_modules/.bin:$PATH"`
- For systemd: add `Environment=PATH=...` to the service file

### Gateway starts but bot doesn't respond
1. `openclaw status` — is gateway running?
2. Check API key: `cat ~/.alphaclaw/.openclaw/agents/main/agent/auth-profiles.json`
3. Check Telegram token in AlphaClaw UI → Envars tab

### Port conflicts
- AlphaClaw wants port 3000 — kill any process using it: `ss -tlnp | grep 3000`
- Don't run AlphaClaw manually AND via systemd simultaneously

### "ENOENT: openclaw" in systemd
- The `Environment=PATH=...` line is missing from the service file
- AlphaClaw spawns `openclaw gateway run` and needs it in PATH

### Postgres "role does not exist"
```bash
sudo -u postgres createuser hermes
sudo -u postgres psql -c "ALTER ROLE hermes WITH LOGIN;"
```

### Postgres "peer authentication failed"
Edit `pg_hba.conf` to allow password/trust auth for your user:
```bash
sudo vi /etc/postgresql/*/main/pg_hba.conf
# Add: local all hermes trust
sudo systemctl restart postgresql
```

### Dashboard build fails with memory error
```bash
NODE_OPTIONS=--max-old-space-size=4096 npm run build
```

### "Don't use `openclaw gateway install`"
AlphaClaw manages the gateway. If you previously used `openclaw gateway install`, remove the conflicting service:
```bash
openclaw gateway stop
openclaw gateway uninstall
```

---

## Cost Management

### Typical Costs (per message)

| Complexity | Model | Cost |
|------------|-------|------|
| Simple question | Haiku | ~$0.001 |
| Normal conversation | Sonnet | ~$0.01–0.05 |
| Complex reasoning | Opus | ~$0.10–0.50 |
| Long coding session | Sonnet (cached) | ~$0.50–2.00 |

### Tips to Reduce Costs

1. **Use cheaper models by default** — Sonnet for most tasks, Haiku for simple ones, Opus only for orchestration
2. **Reset long sessions** — context grows over time; a 258K token session costs $0.14/call
3. **Monitor with dashboard** — Mission Control shows spend per session and model
4. **Set up cost tracking** — the `cost-logger.mjs` tool logs every API call to Postgres

### Cost Tracking Setup

```bash
# Create the cost logger systemd service
cat > ~/.config/systemd/user/oclaw-cost-logger.service << 'EOF'
[Unit]
Description=OpenClaw Cost Logger
After=alphaclaw.service

[Service]
Type=simple
WorkingDirectory=%h/.alphaclaw/.openclaw/workspace
ExecStart=/usr/bin/node tools/cost-logger.mjs
Restart=always
RestartSec=5
Environment=DATABASE_URL=postgresql://hermes@127.0.0.1:5432/siftly_db

[Install]
WantedBy=default.target
EOF

systemctl --user daemon-reload
systemctl --user enable oclaw-cost-logger
systemctl --user start oclaw-cost-logger
```

---

## Updating

### OpenClaw

```bash
npm update -g openclaw
systemctl --user restart alphaclaw
```

### AlphaClaw

```bash
cd ~ && npm update @chrysb/alphaclaw
systemctl --user restart alphaclaw
```

### HermitClaw

```bash
cd ~/projects/hermitclaw
git pull
npm install
```

### Mission Control

```bash
cd ~/projects/oclaw-ops/dashboard
git pull
npm install
npm run build
systemctl --user restart oclaw-ops
```

---

## Next Steps

Once everything is running:

1. **Customize your agent** — edit `SOUL.md`, `AGENTS.md`, `USER.md` in the workspace
2. **Add more channels** — Discord, Signal, WhatsApp via `openclaw configure`
3. **Enable web search** — add `BRAVE_SEARCH_API_KEY` to AlphaClaw Envars
4. **Set up heartbeat** — create `HEARTBEAT.md` for periodic health checks
5. **Install skills** — `openclaw skills install <name>` (use `--scan` for safety)
6. **Build a landing page** — nginx reverse proxy to your services
7. **Set up backups** — automated PostgreSQL dumps via cron

---

## Mac-Specific Notes

If you're installing on macOS instead of a VPS:

- **Skip Part 1** (server hardening) — your Mac is already behind a router
- **Homebrew** replaces `apt`: `brew install postgresql@17 pgvector`
- **Postgres socket** is at `/tmp` not `/var/run/postgresql`
- **No systemd** — use `brew services` for Postgres, and `launchd` for AlphaClaw:
  ```bash
  # Start manually for now:
  alphaclaw start
  # Or create a LaunchAgent (see Apple docs for launchd plist format)
  ```
- **DATABASE_URL** uses Unix socket: `postgresql:///siftly_db?host=/tmp`
- **Gateway runs in foreground** by default — use `--daemon` flag or run in a tmux/screen session

---

*Built by Kevin 🫡 — managed by AlphaClaw + OpenClaw*
