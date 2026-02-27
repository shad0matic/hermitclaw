# Multi-Instance Setup (WIP)

Running multiple OpenClaw instances on the same server for different users.

---

## Overview

You can run multiple isolated OpenClaw instances on a single server, each with:
- Separate config directory (`~/.openclaw-<name>/`)
- Separate systemd service
- Separate Telegram bot
- Different port

## Example: secondary's Instance

```
~/.openclaw-secondary/
├── openclaw.json          # Config (port 18790)
├── workspace/             # Her workspace
├── agents/                # Her agents (main, psy, project-assistant)
├── credentials/
└── ...
```

## Systemd Service

`/etc/systemd/system/openclaw-secondary.service`:
```ini
[Unit]
Description=OpenClaw Gateway (secondary)
After=network-online.target

[Service]
Type=simple
User=openclaw
Group=openclaw
ExecStart=/usr/bin/openclaw --profile secondary gateway
Restart=always
RestartSec=5
Environment="HOME=/home/openclaw"

[Install]
WantedBy=multi-user.target
```

## Key Differences

| Setting | Main Instance | Secondary |
|---------|---------------|-----------|
| Config dir | `~/.openclaw/` | `~/.openclaw-<name>/` |
| Port | 18789 | 18790+ |
| Profile flag | (none) | `--profile <name>` |
| Telegram bot | Separate bot token | Separate bot token |

## Cross-Instance Considerations

- Each instance has its own Telegram bot (different tokens)
- Postgres can be shared (same `openclaw_db`) or separate
- The main instance owner (Kevin) can help monitor/tune secondary instances

---

*TODO: Expand with detailed setup steps, shared vs separate DB, monitoring patterns.*
