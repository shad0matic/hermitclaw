# HermitClaw Mac Setup Guide

**Time:** ~20 minutes | **Difficulty:** Beginner-friendly

---

## What is OpenClaw?

OpenClaw is an AI agent that runs on your machine. You chat with it via Telegram, Discord, CLI, or other channels. It can read files, run commands, search the web, and remember things across sessions.

HermitClaw adds infrastructure on top: Postgres memory, multi-agent coordination, cost tracking, and a dashboard.

**By the end of this guide, you'll send your first message to your own AI agent.**

---

## Reading Order

You're in the right place. After this guide:
1. `postgres-setup.md` — If you want vector memory (optional for first run)
2. `deployment-guide.md` — Only if deploying to a VPS later

---

## Step 1: Open Terminal

Find it in `Applications → Utilities → Terminal`.

All commands below go here. Copy-paste is fine.

---

## Step 2: Install Homebrew

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
Run whatever it shows you, then continue.

---

## Step 3: Install Node.js

OpenClaw runs on Node.js.

```bash
brew install node
```

Verify:
```bash
node --version  # Should show v20+ or v22+
```

---

## Step 4: Install OpenClaw

```bash
npm install -g openclaw
```

Verify:
```bash
openclaw --version
```

---

## Step 5: Get Your API Keys

**You need at least one AI provider API key.** OpenClaw talks to Claude, GPT, Gemini, etc. — you provide the keys.

| Provider | Get key at | Model examples |
|----------|-----------|----------------|
| Anthropic | https://console.anthropic.com/settings/keys | Claude Sonnet, Opus, Haiku |
| OpenAI | https://platform.openai.com/api-keys | GPT-4o, GPT-4 |
| Google | https://aistudio.google.com/apikey | Gemini Pro |

**Recommendation:** Start with Anthropic (Claude). Create an account, add billing, generate an API key. It starts with `sk-ant-...`.

Keep this key handy for Step 7.

---

## Step 6: Initial Configuration

Run the setup wizard:

```bash
openclaw configure
```

This creates `~/.openclaw/openclaw.json` with your basic config.

When asked about channels, you can skip for now (press Enter) — we'll add Telegram later.

---

## Step 7: Add Your API Key

OpenClaw stores API keys in auth profile files. Let's add your Anthropic key:

```bash
openclaw configure --section model
```

Select `anthropic`, then paste your API key when prompted.

**Alternative (manual):** Edit `~/.openclaw/agents/main/agent/auth-profiles.json`:
```json
{
  "version": 1,
  "profiles": {
    "anthropic:default": {
      "type": "token",
      "provider": "anthropic", 
      "token": "sk-ant-YOUR-KEY-HERE"
    }
  }
}
```

---

## Step 8: Start the Gateway

The gateway is OpenClaw's brain — it runs in the background and handles all requests.

```bash
openclaw gateway start
```

You should see output indicating it started. Keep this terminal open, or run with `--daemon` to background it.

---

## Step 9: Your First Message! 🎉

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

---

## Step 10: Connect Telegram (Optional but Recommended)

Talking via CLI works, but Telegram is more convenient.

### 10a: Create a Telegram Bot

1. Open Telegram, search for `@BotFather`
2. Send `/newbot`
3. Follow prompts to name your bot
4. Copy the token (looks like `123456789:ABC...XYZ`)

### 10b: Add Bot Token to OpenClaw

```bash
openclaw configure --section telegram
```

Paste your bot token when prompted.

### 10c: Restart Gateway

```bash
openclaw gateway restart
```

### 10d: Start Chatting

Open Telegram, find your bot, send a message. It should respond!

---

## Step 11: Install Postgres (Optional)

Postgres enables long-term memory with vector search. Skip this for now if you just want to test; come back later.

```bash
brew install postgresql@17
brew services start postgresql@17
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

For full schema setup, see `postgres-setup.md`.

---

## Step 12: Clone HermitClaw (Optional)

HermitClaw adds tools, scripts, and templates on top of OpenClaw.

```bash
cd ~
git clone https://github.com/shad0matic/hermitclaw.git
cd hermitclaw
npm install
```

Explore the `tools/`, `scripts/`, and `templates/` folders.

---

## Quick Reference

| Command | What it does |
|---------|--------------|
| `openclaw gateway start` | Start the agent |
| `openclaw gateway stop` | Stop the agent |
| `openclaw gateway restart` | Restart after config changes |
| `openclaw chat` | CLI chat interface |
| `openclaw status` | Check gateway status |
| `openclaw configure` | Run setup wizard |

---

## Troubleshooting

### "command not found: openclaw"
Node.js or npm isn't in your PATH. Try:
```bash
export PATH="$PATH:/opt/homebrew/bin"
npm install -g openclaw
```

### "command not found: brew"
Homebrew didn't install correctly. Re-run Step 2.

### Gateway starts but bot doesn't respond
1. Check `openclaw status` — is gateway running?
2. Check your API key is correct in auth-profiles.json
3. Check Telegram token is correct: `cat ~/.openclaw/openclaw.json | grep telegram`

### "insufficient_quota" or "rate_limit" errors
Your API provider needs billing set up, or you've hit limits. Check your provider's dashboard.

### Postgres connection errors
Make sure Postgres is running: `brew services list`

---

## Next Steps

- **Add more providers:** Run `openclaw configure --section model` again for OpenAI, Google, etc.
- **Set up memory:** Follow `postgres-setup.md` for full vector memory
- **Deploy to VPS:** See `deployment-guide.md` for 24/7 server setup
- **Customize your agent:** Edit `~/.openclaw/workspace/SOUL.md` to give it personality

---

## Need Help?

- OpenClaw docs: https://docs.openclaw.ai
- Discord community: https://discord.com/invite/clawd
- GitHub issues: https://github.com/openclaw/openclaw/issues
