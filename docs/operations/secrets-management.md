# Secrets Management

All API keys, tokens, and passwords should be stored in a **single file** that is never committed to git.

---

## Location

```
~/.openclaw/.env
```

This file:
- Lives outside any git repo (in your home directory)
- Is loaded automatically by OpenClaw
- Should be readable only by you (`chmod 600 ~/.openclaw/.env`)

---

## Template

Create `~/.openclaw/.env` with this structure:

```bash
# ~/.openclaw/.env — Master secrets file (NEVER COMMIT!)
# After editing, restart gateway: openclaw gateway restart

# === Database ===
PGUSER=openclaw
PGDATABASE=openclaw_db
DATABASE_URL="postgresql://openclaw@localhost:5432/openclaw_db?host=%2Fvar%2Frun%2Fpostgresql"

# === Telegram ===
TELEGRAM_BOT_TOKEN=your_telegram_bot_token

# === AI Providers ===
ANTHROPIC_API_KEY=sk-ant-xxx
OPENAI_API_KEY=sk-proj-xxx
GOOGLE_API_KEY=AIzaSyxxx        # Also used for Gemini
XAI_API_KEY=xai-xxx

# === Search ===
BRAVE_API_KEY=BSAxxx

# === Dashboard ===
OPENCLAW_GW_TOKEN=your_gateway_token
ADMIN_PASSWORD=your_admin_password
```

---

## Security Checklist

| Action | Command |
|--------|---------|
| Set file permissions | `chmod 600 ~/.openclaw/.env` |
| Verify not in any repo | `git status` in `~/.openclaw/` should fail |
| Never commit `.env` files | Add `.env*` to all `.gitignore` files |

---

## Other Apps (Dashboard, Scripts)

Instead of creating separate `.env` files, **symlink** to the master file:

```bash
# For dashboard
ln -s ~/.openclaw/.env ~/projects/oclaw-ops/dashboard/.env

# For any other tool
ln -s ~/.openclaw/.env /path/to/project/.env
```

This ensures:
- One file to update when rotating keys
- No duplicate secrets scattered across projects
- Consistent configuration everywhere

---

## Rotating Keys

When you need to rotate a key (security incident, regular rotation):

1. Generate new key at provider's website
2. Update `~/.openclaw/.env`
3. Restart gateway: `openclaw gateway restart`
4. Restart dashboard: `cd ~/oclaw-ops/dashboard && npm run start`

**Key rotation links:**
- Telegram: Message `@BotFather` → `/revoke`
- Anthropic: [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)
- OpenAI: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- Google: [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)
- Brave: [brave.com/search/api](https://brave.com/search/api/)

---

## What NOT to Do

❌ Don't put secrets in `openclaw.json` (it might get committed)  
❌ Don't create multiple `.env` files in different projects  
❌ Don't commit `.env.example` files with real values  
❌ Don't share secrets in chat/email (they end up in logs)  

---

## If You Accidentally Expose a Secret

1. **Rotate immediately** — Generate a new key
2. **Check git history** — Use `git log -p | grep "SECRET"` to find exposure
3. **Consider scrubbing** — For serious leaks, use `git filter-repo` to remove from history
4. **Review access logs** — Check provider dashboards for unauthorized usage
