# HermitClaw Mac Setup Guide

**Time:** ~1 hour for full setup | **Difficulty:** Beginner-friendly

---

## Contents

- [What is OpenClaw?](#what-is-openclaw)
- [Part 1: Core Setup (Steps 1–8)](#part-1-core-setup-steps-18)
- [Part 2: Enhanced Setup (Steps 9–12)](#part-2-enhanced-setup-steps-912)
- [Verify Your Setup](#verify-your-setup)
- [What Can You Do With This?](#what-can-you-do-with-this)
- [Understanding Your Workspace](#understanding-your-workspace)
- [Cost Management](#cost-management)
- [Quick Reference](#quick-reference)
- [Updating](#updating)
- [Troubleshooting](#troubleshooting)
- [Next Steps](#next-steps)

---

## What is OpenClaw?

OpenClaw is an AI agent that runs on your machine. You chat with it via Telegram, Discord, CLI, or other channels. It can read files, run commands, search the web, and remember things across sessions.

HermitClaw adds infrastructure on top: Postgres memory, multi-agent coordination, cost tracking, and a dashboard.

> **Privacy:** Your agent runs locally — your data stays on your machine. You control what it can access.

**By the end of this guide, you'll have a fully working AI agent with visual monitoring.**

---

## Reading Order

You're in the right place. After this guide:
1. [postgres-setup.md](postgres-setup.md) — Full schema details and advanced Postgres config
2. [deployment-guide.md](deployment-guide.md) — VPS deployment for 24/7 operation

---

## Part 1: Core Setup (Steps 1–8)

Get your agent running in ~15 minutes.

---

### Step 1: Open Terminal

Find it in `Applications → Utilities → Terminal`.

All commands below go here. Copy-paste is fine.

---

### Step 2: Install Homebrew and Git

Homebrew is a package manager for macOS (like an App Store for dev tools).

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Follow the prompts. It may ask for your password.

**After install**, Homebrew will tell you to run 2 commands to add it to your PATH. They look like:
```bash
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"
```
Run whatever it shows you.

**Then install Git** (needed later for cloning repos):
```bash
brew install git
```

Verify:
```bash
git --version  # Should show git version 2.x
```

---

### Step 3: Install Node.js

OpenClaw runs on Node.js.

```bash
brew install node
```

Verify:
```bash
node --version  # Should show v20 or later
```

---

### Step 4: Install OpenClaw

```bash
npm install -g openclaw
```

Verify:
```bash
openclaw --version
```

---

### Step 5: Get Your API Keys

**You need at least one AI provider API key.** OpenClaw talks to Claude, GPT, Gemini, etc. — you provide the keys.

| Provider | Get key at | Model examples |
|----------|-----------|----------------|
| Anthropic | [console.anthropic.com](https://console.anthropic.com/settings/keys) | Claude Sonnet, Opus, Haiku |
| OpenAI | [platform.openai.com](https://platform.openai.com/api-keys) | GPT-4o, GPT-4 |
| Google | [aistudio.google.com](https://aistudio.google.com/apikey) | Gemini Pro |

**Recommendation:** Start with Anthropic (Claude). Create an account, add billing (no minimum required), and generate an API key. It starts with `sk-ant-...`.

Keep this key handy for the next step.

---

### Step 6: Configure OpenClaw and Add API Key

Run the setup wizard to create your config and add your API key in one go:

```bash
openclaw configure
```

This creates `~/.openclaw/openclaw.json` and sets up the basics.

When prompted for **model provider**, select `anthropic` and paste your API key.

For other prompts (channels, etc.), you can press Enter to skip — we'll add Telegram later.

> **Tip:** If the wizard doesn't ask about model providers, run `openclaw configure --section model` afterward to add your API key.

**Where is my API key stored?** In `~/.openclaw/agents/main/agent/auth-profiles.json` (created automatically by the wizard).

---

### Step 7: Start the Gateway

The gateway is OpenClaw's brain — a background process that handles all requests.

```bash
openclaw gateway start
```

You should see a success message indicating the gateway has started.

**Important notes:**
- If you close this terminal, the gateway stops. Run `openclaw gateway start` again to restart.
- To run in background (so you can close the terminal): `openclaw gateway start --daemon`
- Check if it's running anytime: `openclaw status`

**Changing the port:** By default, the gateway uses port 4123. To use a different port, edit `~/.openclaw/openclaw.json` and add/modify:
```json
{
  "gateway": {
    "port": 5000
  }
}
```

---

### Step 8: Your First Message! 🎉

Open a **new terminal tab** (Cmd+T) and run:

```bash
openclaw chat
```

You're now chatting with your AI agent. Try:
```
Hello! What can you do?
```

Type `exit` or Ctrl+C to quit.

**Congratulations — you have a working OpenClaw setup!**

> **Note:** Your first interaction creates the workspace at `~/.openclaw/workspace/` where your agent stores memory and configuration.

---

## Part 2: Enhanced Setup (Steps 9–12)

Add Telegram, memory, and monitoring.

> **Disk space:** Full setup (Steps 9-12) requires ~2GB of free space.

---

### Step 9: Connect Telegram (Recommended)

Talking via CLI works, but Telegram is more convenient — chat from your phone, get notifications, and organize conversations by topic.

> **Don't use Telegram?** Skip to Step 10 — CLI chat works fine, and you can configure Discord or other channels later via `openclaw configure`.

#### 9a: Create a Telegram Bot

1. Open Telegram, search for `@BotFather`
2. Send `/newbot`
3. Enter a **display name** (can be anything, e.g., "My AI Agent")
4. Enter a **username** — this MUST end in `bot` (e.g., `myagent_bot` or `kevin_assistant_bot`)
5. Copy the token BotFather gives you (looks like `123456789:ABC...XYZ`)

#### 9b: Add Bot Token to OpenClaw

```bash
openclaw configure --section telegram
```

Paste your bot token when prompted.

#### 9c: Restart Gateway

```bash
openclaw gateway restart
```

#### 9d: Start Chatting

In Telegram, tap the search bar and type your bot's username (the `@something_bot` name you gave BotFather). Open the chat and send any message. It should respond!

> **Note:** The first response may take 10-15 seconds as the model initializes.

---

### Step 10: Install Postgres (Recommended)

Postgres enables long-term memory with vector search — your agent remembers things across sessions.

```bash
brew install postgresql
brew services start postgresql
```

**Install pgvector** (for semantic search):
```bash
brew install pgvector
```

**Create the database:**
```bash
createdb openclaw_db
psql -d openclaw_db -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

**Connect OpenClaw to Postgres:** Open `~/.openclaw/openclaw.json` in a text editor and **merge** (don't replace!) this database section into your existing config:
```json
{
  "database": {
    "type": "postgres",
    "host": "/tmp",
    "database": "openclaw_db"
  }
}
```

> ⚠️ **Don't replace the entire file** — just add the `"database": {...}` section alongside your existing settings.

Then restart the gateway: `openclaw gateway restart`

**Set up the schema** (required for memory and cost tracking):
See [postgres-setup.md](postgres-setup.md) for the full schema SQL. At minimum, run the "Essential Tables" section to enable memory and cost logging.

---

### Step 11: Clone HermitClaw (Recommended)

HermitClaw adds tools, scripts, and templates on top of OpenClaw.

```bash
cd ~
git clone https://github.com/shad0matic/hermitclaw.git
cd hermitclaw
npm install
```

**What's inside:**
- `tools/` — Cost tracking, memory search, agent leveling
- `scripts/` — Backup, metrics collection, context updates
- `templates/` — Ready-to-use SOUL.md, AGENTS.md, etc.
- `docs/` — You're reading them!

Copy templates to your workspace (use `-i` to confirm before overwriting existing files):
```bash
cp -i templates/* ~/.openclaw/workspace/
```

---

### Step 12: Install Dashboard (Recommended)

The **Minions Control (MC) Dashboard** gives you visual monitoring: agent activity, costs, system health.

```bash
cd ~
git clone https://github.com/shad0matic/oclaw-ops.git
cd oclaw-ops/dashboard
npm install
```

**Create `.env` file** (connects dashboard to your database):
```bash
echo 'DATABASE_URL="postgresql:///openclaw_db?host=/tmp"' > .env
```

> **Note:** The `host=/tmp` tells it to use the Unix socket (how Homebrew Postgres works on macOS). No `localhost` needed.

**Start the dashboard (choose one):**

> **Recommendation:** Use production mode for daily use — it's faster and more stable.

*Development mode* (auto-reloads on code changes):
```bash
npm run dev
```
First run compiles the app — wait 30-60 seconds until you see "Ready" in the terminal.

*Production mode* (faster, recommended for daily use):
```bash
npm run build    # One-time build (takes 1-2 minutes)
npm run start    # Start the server
```

Open [http://localhost:3000](http://localhost:3000) in your browser. You should see the MC Dashboard!

**Changing the port:** If port 3000 is in use:
```bash
# Dev mode:
npm run dev -- -p 3001

# Production mode:
npm run start -- -p 3001
```

> **Note:** Press `Ctrl+C` to stop. For remote access, see [deployment-guide.md](deployment-guide.md).

---

## Verify Your Setup

After completing all steps, confirm everything works:

| Check | How to verify |
|-------|---------------|
| ✓ Gateway running | `openclaw status` shows "running" |
| ✓ CLI chat works | `openclaw chat` responds to messages |
| ✓ Telegram works | Your bot responds in Telegram *(if configured)* |
| ✓ Postgres running | `brew services list` shows postgresql "started" |
| ✓ Dashboard loads | [localhost:3000](http://localhost:3000) shows MC Dashboard |

If any check fails, see [Troubleshooting](#troubleshooting) below.

---

## What Can You Do With This?

Now that you have a working agent, here's what makes it different from ChatGPT:

### Quick Examples (Try These Now)

```
"Hello! What can you do?"

"Tell me a joke about programmers"

"Explain what an API is in simple terms"

"Read my ~/.zshrc and explain what it does"
```

> **Note:** Some features need extra setup:
> - **Web search** requires a Brave Search API key
> - **Long-term memory** ("remember that...") requires Postgres (Step 10)
> - **File access** may prompt for macOS permissions
> 
> If something doesn't work, that's okay — basic chat proves your setup works!

### Real-World Use Cases

**1. Organize by Topic (Telegram)**
Create a Telegram **group** with your bot and enable **Topics** (group settings → Topics). Then create separate topics for different areas:
- 📋 **Work** — project updates, meeting notes, task tracking
- 📚 **Learning** — track courses, research topics, book summaries
- 🏠 **Personal** — home projects, health tracking, habit reminders
- 💰 **Finance** — expense tracking, investment research

Your agent remembers context per topic, so conversations stay focused.

> **Tip:** Topics require a Telegram group, not a private chat. Create a group, add your bot, then enable Topics in group settings.

**2. Manage Multiple Projects**
Your agent can help track and coordinate:
- **School/University** — research papers, deadlines, study schedules
- **Side Projects** — code repos, feature ideas, bug tracking
- **Health Goals** — workout logs, nutrition tracking, progress reports
- **Learning a Skill** — track practice sessions, resources, milestones

Ask things like:
```
"What's the status of all my active projects?"
"Remind me about my thesis deadline in 2 weeks"
"Log today's workout: 30 min run, 5km"
```

**3. Background Research**
Your agent can search the web and summarize findings:
```
"Research the best approaches for learning Spanish in 2024, 
give me a 1-month study plan"

"Find recent papers on machine learning for time series, 
summarize the top 3"

"What are the current best practices for Next.js deployment?"
```

> **Note:** Web search requires a Brave Search API key. Get one free at [brave.com/search/api](https://brave.com/search/api/) and add via `openclaw configure`.

**4. Write a Book (Multi-Agent Coordination)**
HermitClaw supports spawning specialized sub-agents for complex projects:
- **Research Agent** — market research, competitive analysis, audience targeting
- **Writing Agent** — drafts chapters, maintains consistent voice
- **Image Agent** — generates illustrations, cover designs
- **Editor Agent** — proofreads, checks consistency, suggests improvements
- **Publishing Agent** — formats for PDF/ePub, prepares metadata

You coordinate from the main agent:
```
"Start the book project on 'Learning to Code at 40'"
"Have the research agent analyze similar books on Amazon"
"Draft chapter 1 outline, then generate 3 illustration concepts"
"Build the PDF with current chapters and send me a preview"
```

> **Note:** Multi-agent coordination requires Postgres + HermitClaw setup (Steps 10-11).

**5. Personal Knowledge Base**
Over time, your agent builds memory:
- Decisions you've made and why
- People you've mentioned (colleagues, friends, contacts)
- Preferences and habits
- Project history and lessons learned

Ask anytime:
```
"What did we decide about the database schema last month?"
"Who was that contractor I talked to about the roof?"
"What's my usual approach for debugging React apps?"
```

---

## Understanding Your Workspace

Your agent has a **workspace** at `~/.openclaw/workspace/`. This is its home — where it stores memory, notes, and configuration.

Key files:
| File | Purpose |
|------|---------|
| `SOUL.md` | Your agent's personality and behavior guidelines |
| `MEMORY.md` | Long-term memory index |
| `memory/` | Daily notes, project files, research |
| `AGENTS.md` | Instructions for how the agent operates |

**Customize your agent:** Edit `SOUL.md` to give it a name, personality, and specific instructions. For example:
```markdown
# SOUL.md
- Name: Jarvis
- Personality: Professional but friendly, occasionally witty
- Always respond in French unless asked otherwise
- When I say "brief mode", keep responses under 50 words
```

> **Tip:** This is a minimal example. See `templates/SOUL.md` in HermitClaw for a fuller version with more options.

---

## Cost Management

API calls cost money. Here's how to stay in control:

### Typical Costs
- Simple message: ~$0.01–0.03
- Long conversation: ~$0.10–0.50
- Complex research task: ~$0.50–2.00

### HermitClaw Cost Tools

HermitClaw includes tools to monitor and optimize spending:

| Tool | Purpose |
|------|---------|
| `tools/cost-tracker.mjs` | Track spending by day/agent/task |
| `tools/pg-memory.mjs` | Query cost logs from Postgres |
| Dashboard (Step 12) | Visual cost charts and alerts |

### Built-in Cost Optimization

HermitClaw is designed to minimize token usage:

1. **Cheap models by default** — Routine tasks use Haiku/Flash (10-20x cheaper than Opus/GPT-4)
2. **Context compaction** — Old messages are summarized to reduce tokens
3. **Compact Context system** — Pre-summarized JSON files instead of loading full history
4. **Token tracking** — Every request logs token count and cost to Postgres

### Tips to Reduce Costs

- Use specific, concise prompts (fewer input tokens)
- Let the agent use Haiku for simple tasks, Sonnet for complex ones
- Set up the Compact Context system for frequently-accessed topics
- Monitor your provider dashboards (Anthropic, OpenAI) to spot unexpected spending

---

## Quick Reference

| Command | What it does |
|---------|--------------|
| `openclaw gateway start` | Start the agent |
| `openclaw gateway start --daemon` | Start in background |
| `openclaw gateway stop` | Stop the agent |
| `openclaw gateway restart` | Restart after config changes |
| `openclaw gateway logs` | View recent gateway logs |
| `openclaw chat` | CLI chat interface |
| `openclaw status` | Check gateway status |
| `openclaw configure` | Run setup wizard |

---

## Updating

Keep your setup current:

**Update OpenClaw:**
```bash
npm update -g openclaw
openclaw gateway restart
```

**Update HermitClaw:**
```bash
cd ~/hermitclaw
git pull
npm install
```

**Update Dashboard:**
```bash
cd ~/oclaw-ops/dashboard
git pull
npm install
npm run build   # Rebuild for production
# Then restart with: npm run start (or npm run dev)
```

---

## Troubleshooting

### "command not found: openclaw"
Node.js or npm isn't in your PATH. Try:
```bash
# Apple Silicon Macs (M1/M2/M3):
export PATH="$PATH:/opt/homebrew/bin"

# Intel Macs:
export PATH="$PATH:/usr/local/bin"

npm install -g openclaw
```

### "command not found: brew"
Homebrew didn't install correctly. Re-run Step 2.

### npm permission errors (EACCES)
Fix npm permissions:
```bash
sudo chown -R $(whoami) ~/.npm
```
Then retry the npm command. Alternatively, use a Node version manager like `nvm` to avoid permission issues.

### Gateway starts but bot doesn't respond
1. Check `openclaw status` — is gateway running?
2. Check your API key is correct: `cat ~/.openclaw/agents/main/agent/auth-profiles.json`
3. Check Telegram token is correct: `cat ~/.openclaw/openclaw.json | grep telegram`

### "insufficient_quota" or "rate_limit" errors
Your API provider needs billing set up, or you've hit limits. Check your provider's dashboard.

### Postgres connection errors
Make sure Postgres is running: `brew services list`

### "role does not exist" when creating database
Your Postgres user doesn't match your macOS username. Create it:
```bash
createuser -s $(whoami)
```
Then retry `createdb openclaw_db`.

### Gateway crashes on restart
Check logs: `openclaw gateway logs` or `~/.openclaw/logs/`

### Dashboard won't start
1. Make sure Postgres is running
2. Check `.env` file exists with correct DATABASE_URL
3. Try `npm install` again in the dashboard folder

### Dashboard build fails with memory error
Increase Node.js memory limit:
```bash
NODE_OPTIONS=--max-old-space-size=4096 npm run build
```

---

## Next Steps

- **Add more providers:** Run `openclaw configure --section model` for OpenAI, Google, etc.
- **Enable web search:** Get free Brave API key at [brave.com/search/api](https://brave.com/search/api/) and add via `openclaw configure`
- **Full Postgres schema:** Follow [postgres-setup.md](postgres-setup.md) for memory tables, agent profiles, cost tracking
- **Deploy to VPS:** See [deployment-guide.md](deployment-guide.md) for 24/7 server setup
- **Customize your agent:** Edit `~/.openclaw/workspace/SOUL.md`

---

## Need Help?

- OpenClaw docs: https://docs.openclaw.ai
- Discord community: https://discord.com/invite/clawd
- GitHub issues: https://github.com/openclaw/openclaw/issues
