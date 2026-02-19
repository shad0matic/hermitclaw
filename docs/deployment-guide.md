# HermitClaw Deployment Guide

## Overview

This guide provides instructions for deploying HermitClaw, a portable, self-hosted AI agent infrastructure built on OpenClaw. It includes setup for Postgres-backed memory, multi-agent workflows, dashboard, and additional tools.

## Prerequisites

- OpenClaw installed
- Postgres 18+ with pgvector
- Node.js 24+

## Quick Start

1. **Install OpenClaw**: Follow the official OpenClaw installation guide.
2. **Set up OpenClaw Gateway as systemd service**: See [Gateway Persistence Setup](#gateway-persistence-setup-linux-vps) below.
3. **Set up Postgres**: Install Postgres 18+ and enable pgvector.
4. **Run Schema Setup**: Execute the schema setup scripts from `docs/postgres-setup.md`.
5. **Copy Templates**: Copy configuration templates to your workspace.
6. **Configure Tools**: Set up API keys and environment variables.

## Detailed Deployment Steps

### Gateway Persistence Setup (Linux VPS)

Running OpenClaw gateway as a user process causes "device token mismatch" errors on restart. For production VPS deployments, run it as a **systemd system service**.

#### 1. Create a dedicated user

```bash
sudo adduser --system --group openclaw
```

#### 2. Create the systemd service file

Create `/etc/systemd/system/openclaw-gateway.service`:

```ini
[Unit]
Description=OpenClaw Gateway
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=openclaw
Group=openclaw
ExecStart=/usr/bin/openclaw gateway
Restart=always
RestartSec=5
Environment="HOME=/home/openclaw"

[Install]
WantedBy=multi-user.target
```

#### 3. Move config and set permissions

```bash
sudo cp -r ~/.openclaw /home/openclaw/
sudo chown openclaw:openclaw /home/openclaw
sudo chown -R openclaw:openclaw /home/openclaw/.openclaw
```

> **Note:** The `adduser --system` command may leave `/home/openclaw` owned by root. The second `chown` line fixes this.

#### 4. Enable and start

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now openclaw-gateway.service
```

#### 5. Verify

```bash
sudo systemctl status openclaw-gateway.service
sudo journalctl -u openclaw-gateway.service -f
```

#### Multiple Profiles

For additional profiles (e.g., separate user), create a second service with `--profile <name>`:

```ini
ExecStart=/usr/bin/openclaw --profile <name> gateway
```

And move the profile directory:
```bash
sudo cp -r ~/.openclaw-<name> /home/openclaw/
sudo chown -R openclaw:openclaw /home/openclaw/.openclaw-<name>
```

---

### 1. Postgres Setup

Ensure Postgres is installed and pgvector is enabled. Run the provided SQL scripts to set up necessary schemas (`memory` and `ops`).

### 2. Workspace Configuration

Configure your workspace with necessary environment variables and API keys. Use the templates provided in `templates/` directory.

### 3. Auth Profiles (API Keys)

Provider API keys are stored in **per-agent auth profile files**, not in `openclaw.json`:

```
~/.openclaw/agents/main/agent/auth-profiles.json      # Main agent
~/.openclaw/agents/agents/<id>/agent/auth-profiles.json  # Sub-agents
```

**Structure:**
```json
{
  "version": 1,
  "profiles": {
    "anthropic:default": { "type": "token", "provider": "anthropic", "token": "sk-ant-..." },
    "openai:api-key": { "type": "api_key", "provider": "openai", "key": "sk-proj-..." },
    "xai:default": { "type": "api_key", "provider": "xai", "key": "xai-..." },
    "google:default": { "type": "api_key", "provider": "google", "key": "AIza..." }
  },
  "lastGood": {
    "anthropic": "anthropic:default",
    "openai": "openai:api-key"
  }
}
```

**Setup:**
1. Run `openclaw configure --section model` to add providers interactively, OR
2. Copy `auth-profiles.json` from an existing agent to new agents

**Important:** When adding sub-agents, copy the auth-profiles.json to their agent dirs so they inherit API access.

### 4. Agent Coordination

- **File Claims**: Use `ops.file_claims` table for file locking between agents to avoid edit conflicts. CLI tool `tools/file-claim.mjs` provides `claim`, `release`, `check`, and `active` commands.
- **Git Hooks**: A shared git post-commit hook (`scripts/git-post-commit-hook.sh`) logs commits to `ops.agent_events`. Symlink this to all repos for activity tracking.
- **Task Watchdog**: Enhanced to release stale claims (>2h) and detect stalled spawned agents.

### 5. xAI Balance Check (Optional)

HermitClaw includes a script to check xAI API credits balance periodically using a management key. This is useful for monitoring credit usage to prevent service interruption.

- **Setup**: Store your xAI management key in `$HOME/.openclaw/.env.local` as `XAI_MANAGEMENT_KEY=your_key_here`.
- **Script**: `scripts/check-xai-balance.mjs` checks the balance every 6 hours (cron job: `0 */6 * * *`).
- **Notification**: Sends a Telegram DM to the configured user if balance falls below $5.
- **Customization**: Adjust the cron schedule or threshold in the script as needed.

### 6. Configurable Dashboard Names

The dashboard supports configurable branding via environment variables. Add these to your dashboard `.env`:

```bash
# Dashboard branding
NEXT_PUBLIC_DASHBOARD_NAME="Minions Control"   # or your custom name
NEXT_PUBLIC_DASHBOARD_SUBTITLE="Your agent workforce at a glance"
```

Agent names are stored in the `memory.agent_profiles` database table and can be updated via the dashboard Settings page or directly in the database.

## Additional Tools

- **Memory Recall**: Use Postgres for long-term memory with `scripts/memory-recall.mjs` and `memory-sync.mjs` for syncing files to DB.
- **Cost Tracking**: Monitor API usage costs with tools in `tools/`.

## Troubleshooting

- **Cron Job Issues**: Ensure cron jobs are running by checking logs in `$WORKSPACE/logs/`.
- **API Key Errors**: Verify API keys are correctly set in environment variables.

## Conclusion

Following this guide, you should have a fully operational HermitClaw setup with multi-agent coordination, long-term memory, and cost monitoring capabilities. For further customization, refer to individual tool documentation.
