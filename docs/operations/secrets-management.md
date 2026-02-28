# Secrets Management — .env as Single Source of Truth

**Last updated:** 2026-02-28

## Overview

HermitClaw uses **`.env` as the single source of truth** for all API keys and secrets. Config files reference these variables using `${VAR_NAME}` syntax.

This approach ensures:
- ✅ **Easy key rotation** — edit one file, restart gateway
- ✅ **No hardcoded secrets** — all keys in one place
- ✅ **Version control safe** — .env is gitignored
- ✅ **Consistent** — all agents and skills use same keys

## Setup

### 1. Create .env file

```bash
cp templates/.env.example ~/.openclaw/.env
chmod 600 ~/.openclaw/.env  # Restrict permissions
```

### 2. Add your keys

Edit `~/.openclaw/.env` and replace placeholder values:

```bash
# Required
GOOGLE_API_KEY=AIzaSy...
TELEGRAM_BOT_TOKEN=8475...

# Optional but recommended
OPENAI_API_KEY=sk-proj-...
BRAVE_API_KEY=BSA-...
ELEVENLABS_API_KEY=sk_e1...
```

### 3. Verify config files use ${VAR_NAME} syntax

Check that your config files reference env vars (not hardcoded keys):

```bash
# Should show ${GOOGLE_API_KEY}, not literal keys
grep -r "apiKey\|key" ~/.openclaw/openclaw.json ~/.openclaw/agents/*/agent/auth*.json
```

If you see hardcoded keys (`AIzaSy...`, `sk-proj-...`), they need to be replaced with `${VAR_NAME}`.

## Syntax

OpenClaw resolves environment variables using `${VAR_NAME}` syntax:

### In openclaw.json

```json
{
  "skills": {
    "entries": {
      "goplaces": {
        "apiKey": "${GOOGLE_API_KEY}"
      }
    }
  },
  "messages": {
    "tts": {
      "elevenlabs": {
        "apiKey": "${ELEVENLABS_API_KEY}"
      }
    }
  }
}
```

### In agent auth files

```json
{
  "google": {
    "mode": "api-key",
    "key": "${GOOGLE_API_KEY}"
  }
}
```

## Key Rotation

When you need to rotate a key (expired, compromised, or upgrading):

1. **Update .env:**
   ```bash
   nano ~/.openclaw/.env
   # Change GOOGLE_API_KEY=old_key to GOOGLE_API_KEY=new_key
   ```

2. **Restart gateway:**
   ```bash
   openclaw gateway restart
   ```

That's it! All agents and skills will pick up the new key immediately.

## Troubleshooting

### "API key expired" errors after rotation

**Cause:** Config files still have hardcoded keys instead of `${VAR_NAME}` syntax.

**Fix:**
```bash
# Find hardcoded keys
grep -r "AIzaSy\|sk-proj-\|sk_e1" ~/.openclaw/openclaw.json ~/.openclaw/agents/

# Replace with env var reference (example for Google key)
sed -i 's/"key": "AIza[^"]*"/"key": "${GOOGLE_API_KEY}"/g' ~/.openclaw/agents/*/agent/auth-profiles.json
```

### Gateway not picking up new keys

**Cause:** Gateway process needs full restart, not just SIGUSR1.

**Fix:**
```bash
# Hard restart
pkill -9 -f "openclaw-gateway"
# Wait for systemd/supervisor to restart it
sleep 3
pgrep -f "openclaw-gateway"  # Verify new PID
```

### Which keys are required?

**Minimum viable:**
- `TELEGRAM_BOT_TOKEN` (or other channel token)
- One AI provider key (`GOOGLE_API_KEY` for free tier, or `ANTHROPIC_API_KEY` with Max plan)

**Recommended:**
- `BRAVE_API_KEY` — web search (free tier: 2000 queries/month)
- `ELEVENLABS_API_KEY` — TTS for voice replies

**Optional:**
- `OPENAI_API_KEY` — if using OpenAI models or Whisper transcription
- `ANTHROPIC_API_KEY` — if using Claude (or subscribe to Max plan for unlimited)

## Security Best Practices

1. **Never commit .env** — already in `.gitignore`, but double-check
2. **Restrict permissions:** `chmod 600 ~/.openclaw/.env`
3. **Rotate keys regularly** — quarterly or after any security incident
4. **Use different keys for prod vs dev** — if running multiple instances
5. **Monitor usage** — set up billing alerts on provider dashboards

## Migration from Hardcoded Keys

If you have an existing HermitClaw setup with hardcoded keys in config files:

```bash
# 1. Backup current config
cp ~/.openclaw/openclaw.json ~/.openclaw/openclaw.json.backup

# 2. Extract keys to .env
nano ~/.openclaw/.env
# Add: GOOGLE_API_KEY=<your_key_from_config>

# 3. Replace hardcoded keys with ${VAR} syntax
# For Google API key:
sed -i 's/"apiKey": "AIza[^"]*"/"apiKey": "${GOOGLE_API_KEY}"/g' ~/.openclaw/openclaw.json
sed -i 's/"key": "AIza[^"]*"/"key": "${GOOGLE_API_KEY}"/g' ~/.openclaw/agents/*/agent/*.json

# 4. Restart and test
openclaw gateway restart
```

## See Also

- [Deployment Guide](../setup/deployment-guide.md) — Systemd service setup
- [Recovery Guide](recovery-guide.md) — Restore from backups (includes encrypted .env)
- [Multi-Instance Setup](../setup/multi-instance-setup.md) — Using different .env files per instance
