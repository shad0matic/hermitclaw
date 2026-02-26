# HermitClaw 🦀🍌

**A portable, self-hosted AI agent infrastructure built on [OpenClaw](https://github.com/openclaw/openclaw).**

Turn any machine into an intelligent agent hub with Postgres-backed memory, multi-agent workflows, a dashboard, and tools that survive session restarts.

---

## 🚀 Start Here

**New to OpenClaw?** Follow this path:

| Step | Doc | Time | What you'll do |
|------|-----|------|----------------|
| 1 | [mac-setup-guide.md](docs/mac-setup-guide.md) | 20 min | Install everything, send your first message |
| 2 | [postgres-setup.md](docs/postgres-setup.md) | 15 min | Set up vector memory (optional) |
| 3 | [deployment-guide.md](docs/deployment-guide.md) | 30 min | Deploy to VPS for 24/7 (optional) |

**Already have OpenClaw running?** Jump to [Quick Start](#quick-start) below.

---

## What's Inside

```
tools/           # CLI tools (Postgres memory, cost tracking, agent levels, workflows)
scripts/         # Automation scripts (backup, metrics collection, memory sync/recall)
workflows/       # YAML workflow definitions
templates/       # Reusable config templates (AGENTS.md, SOUL.md, etc.)
docs/            # Setup guides and architecture docs
dashboard/       # → see oclaw-ops repo (Next.js Mission Control dashboard)
```

## Key Features

- **Postgres Memory** — Vector-powered (pgvector) long-term memory that survives session compaction
- **Memory Recall** — Semantic + keyword search across all agent memories
- **Multi-Agent System** — Agent profiles, leveling (Observer→Autonomous), cross-agent intelligence
- **Workflow Engine** — YAML-defined workflows with multi-step agent orchestration
- **Cost Tracking** — EUR-based cost monitoring with daily ECB FX rates
- **System Metrics** — 24h rolling buffer for dashboard charts
- **Agent Coordination** — File claim system to prevent multi-agent edit conflicts, git commit tracking, and task event logging to Postgres
- **Backup & Reliability** — Automated daily backups, systemd services, log rotation
- **Compact Context** — Token-efficient JSON summaries per scope (topic/project/task) with auto-refresh ([docs](docs/compact-context.md))

## Quick Start (Experienced Users)

Already familiar with OpenClaw? Here's the fast track:

```bash
# 1. Clone HermitClaw
git clone https://github.com/shad0matic/hermitclaw.git && cd hermitclaw
npm install

# 2. Set up Postgres (if not already)
createdb openclaw_db
psql -d openclaw_db -c "CREATE EXTENSION IF NOT EXISTS vector;"
# Then run schema from docs/postgres-setup.md

# 3. Copy templates to your workspace
cp templates/* ~/.openclaw/workspace/

# 4. Configure API keys
openclaw configure --section model
```

For detailed setup, see [docs/deployment-guide.md](docs/deployment-guide.md).

## Stack

- **Runtime:** OpenClaw + Node.js 24+
- **Database:** PostgreSQL 18 + pgvector 0.8
- **Embeddings:** OpenAI text-embedding-3-small (1536 dims)
- **Dashboard:** Next.js 16 + Prisma 7 + Tailwind + shadcn/ui (separate repo: `oclaw-ops`)
- **TTS:** ElevenLabs (optional)
- **Search:** Brave Search API

## Born From

Built by Kevin 🍌 (lead minion) and their human as a real-world OpenClaw deployment. Everything here is battle-tested on a production VPS running 24/7.

## Related

- [oclaw-ops](https://github.com/shad0matic/oclaw-ops) — Mission Control dashboard
- [OpenClaw](https://github.com/openclaw/openclaw) — The agent framework

## License

MIT
