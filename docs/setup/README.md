# Setup Guides 🚀

Everything you need to get HermitClaw running — from first install to production deployment.

## Recommended Path

1. **[Mac Setup Guide](mac-setup-guide.md)** (~20 min)
   - Install OpenClaw, Node.js, dependencies
   - Configure API keys
   - Send your first message
   - **Start here if:** You're on macOS and new to OpenClaw

2. **[Postgres Setup](postgres-setup.md)** (~15 min)
   - Install PostgreSQL + pgvector
   - Run schema migrations
   - Enable semantic memory
   - **Optional but recommended** for long-term memory

3. **[Deployment Guide](deployment-guide.md)** (~30 min)
   - Deploy to VPS (Ubuntu/Debian)
   - Configure systemd services
   - Set up backups & monitoring
   - **Optional:** For 24/7 operation

4. **[Multi-Instance Setup](multi-instance-setup.md)** (~20 min)
   - Run multiple agents on one machine
   - Isolate workspaces
   - Share database & configs
   - **Advanced:** For multi-agent deployments

## Quick Reference

| Guide | Platform | Prerequisites | Outcome |
|-------|----------|---------------|---------|
| Mac Setup | macOS 12+ | None | Working OpenClaw agent |
| Postgres Setup | Any | OpenClaw installed | Semantic memory enabled |
| Deployment | Linux VPS | SSH access, sudo | 24/7 production deployment |
| Multi-Instance | Any | OpenClaw + Postgres | Multiple isolated agents |

## Need Help?

- **Stuck on installation?** Check [Operations: Recovery Guide](../operations/recovery-guide.md)
- **API key issues?** See [Operations: Secrets Management](../operations/secrets-management.md)
- **Database errors?** Review [Postgres Setup](postgres-setup.md) troubleshooting section

## Next Steps

After setup, explore:
- **[Memory Management](../memory/)** — Optimize token costs
- **[Operations](../operations/)** — Day-to-day maintenance
- **[Cost Management](../cost/)** — Track and reduce spending
