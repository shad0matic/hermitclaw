# HermitClaw 🦀🍌

**A portable, self-hosted AI agent infrastructure built on [OpenClaw](https://github.com/openclaw/openclaw).**

Turn any machine into an intelligent agent hub with Postgres-backed memory, multi-agent workflows, a dashboard, and tools that survive session restarts.

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

## Quick Start

> Full deployment guide: [docs/deployment-guide.md](docs/deployment-guide.md)

1. Install [OpenClaw](https://github.com/openclaw/openclaw)
2. Set up Postgres 18+ with pgvector
3. Run the schema setup from `docs/postgres-setup.md`
4. Copy templates to your workspace
5. Configure tools with your API keys

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

- [oclaw-ops](https://github.com/YOUR_USER/oclaw-ops) — Mission Control dashboard
- [OpenClaw](https://github.com/openclaw/openclaw) — The agent framework
- [HermitClaw Roadmap](docs/hermitclaw/ROADMAP.md) — Future plans for portable MacBook setup

## License

MIT
