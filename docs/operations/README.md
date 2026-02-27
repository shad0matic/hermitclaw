# Operations ⚙️

Day-to-day maintenance, monitoring, troubleshooting, and keeping your OpenClaw deployment running smoothly.

## Guides

### [Recovery Guide](recovery-guide.md)
Fix common issues, restore from backups, and recover from crashes.

**Topics covered:**
- Session corruption recovery
- Database restore procedures
- Log analysis & debugging
- Emergency restart procedures

**Read this when:** Something breaks or you need to troubleshoot.

---

### [Secrets Management](secrets-management.md)
Centralized API key storage, rotation best practices, and security.

**Topics covered:**
- Where API keys are stored
- Rotation procedures
- Provider-specific setup
- Security best practices

**Read this when:** Setting up new providers or rotating keys.

---

### [Gmail Pub/Sub Setup](gmail-pubsub-setup.md)
Real-time email notifications via Google Cloud Pub/Sub.

**Topics covered:**
- GCP project setup
- Pub/Sub topic & subscription configuration
- Gmail API integration
- Webhook endpoint setup

**Read this when:** You want real-time email monitoring instead of polling.

---

## Common Tasks

### Daily Operations

**Check system health:**
```bash
openclaw status
systemctl status openclaw-gateway
```

**View recent logs:**
```bash
journalctl -u openclaw-gateway -f
```

**Check database:**
```bash
psql -d openclaw_db -c "SELECT COUNT(*) FROM memory.memories;"
```

**Monitor costs:**
```bash
node tools/cost-tracker.mjs --today
```

---

### Weekly Maintenance

**Review memory usage:**
```bash
node scripts/memory-recall.mjs --stats
```

**Check for updates:**
```bash
cd ~/hermitclaw && git pull
npm install
```

**Backup database:**
```bash
./scripts/backup-db.sh
```

---

### Monthly Tasks

**Rotate API keys:**
- Follow [Secrets Management](secrets-management.md) guide
- Update all providers
- Test after rotation

**Review costs:**
- Analyze monthly spending
- Optimize model selection
- Check for rate limit issues

**Clean up old data:**
```bash
# Archive old logs
find ~/.openclaw/logs -mtime +90 -delete

# Clean old backups (keep last 7)
ls -t ~/backups/*.sql.gz | tail -n +8 | xargs rm
```

---

## Monitoring

### Key Metrics

**Token usage:**
```bash
node tools/cost-tracker.mjs --yesterday
```

**Active sessions:**
```bash
openclaw sessions list --active
```

**Database size:**
```bash
psql -d openclaw_db -c "\dt+ memory.*"
```

---

## Troubleshooting Checklist

**OpenClaw won't start:**
1. Check logs: `journalctl -u openclaw-gateway -n 50`
2. Verify config: `openclaw config verify`
3. Check ports: `lsof -i :3333`
4. Database accessible? `psql -d openclaw_db -c "SELECT 1;"`

**High token costs:**
1. Check context sizes: `openclaw sessions list --context`
2. Review model usage: `node tools/cost-tracker.mjs --breakdown`
3. Verify proactive trimming is running
4. Check for stuck agents

**Memory issues:**
1. Check pg_vector working: `psql -d openclaw_db -c "SELECT COUNT(*) FROM memory.memories;"`
2. Verify embeddings: `node scripts/memory-recall.mjs --recent 1`
3. Re-sync if needed: `node scripts/memory-sync.mjs`

---

## Emergency Procedures

### Full System Restart
```bash
systemctl stop openclaw-gateway
pkill -f "openclaw"
systemctl start openclaw-gateway
```

### Database Recovery
```bash
# Restore from latest backup
pg_restore -d openclaw_db ~/backups/latest.sql.gz
```

### Reset Stuck Session
```bash
openclaw sessions kill <session-key>
```

---

## Related Documentation

- **[Setup: Deployment](../setup/deployment-guide.md)** — Initial deployment procedures
- **[Memory Management](../memory/)** — Optimize token usage
- **[Recovery Guide](recovery-guide.md)** — Detailed troubleshooting steps
