# Architecture 🏗️

System design, data flow, and infrastructure decisions behind HermitClaw.

## Overview

HermitClaw is built on [OpenClaw](https://github.com/openclaw/openclaw), adding:
- Postgres-backed memory (pgvector)
- Multi-agent coordination
- Cost tracking & optimization
- Workflow engine
- Mission Control dashboard

---

## Coming Soon

### System Architecture Overview
- High-level component diagram
- Service topology
- API boundaries
- External integrations

### Data Flow
- Message routing (Telegram → OpenClaw → Agents)
- Memory lifecycle (capture → embed → search → recall)
- Task orchestration flow
- Cost tracking pipeline

### Postgres Schema Deep-Dive
- Memory tables (`memory.*`)
- Operations tables (`ops.*`)
- Agent coordination tables
- Indexing strategy

### Deployment Patterns
- Single-machine deployment
- Multi-instance coordination
- Gateway vs node architecture
- Backup & recovery strategies

---

## Stack

**Runtime:**
- OpenClaw framework
- Node.js 24+
- Bash scripts for automation

**Database:**
- PostgreSQL 18
- pgvector 0.8 (1536-dim embeddings)

**AI Providers:**
- Anthropic (Claude Opus/Sonnet/Haiku)
- Google (Gemini Pro/Flash)
- xAI (Grok 3/Mini)
- OpenAI (embeddings only)

**Dashboard:**
- Next.js 16
- Prisma 7 (separate schema from ops)
- Tailwind + shadcn/ui
- Recharts for metrics

**Infrastructure:**
- systemd services
- nginx reverse proxy (optional)
- cron for automation
- logrotate for log management

---

## Design Principles

### 1. Memory is Tiered
Not all context needs to be in active memory.

- **Active:** Current conversation (~30k tokens)
- **Semantic:** Searchable pg_vector (unlimited)
- **Archive:** File-based markdown (unlimited, git-versioned)

### 2. Cost is a First-Class Concern
Every design decision considers token costs.

- Proactive context trimming (20% threshold)
- Model tiering (Premium/Standard/Economy/Free)
- Explicit model selection for spawns
- Context-free tools (semantic search)

### 3. Agents are Specialized
Jack of all trades, master of none doesn't scale.

- Lead minion (Kevin) delegates, doesn't code
- Specialists for UI/backend/research/media
- Clear task routing rules
- Model optimized per agent

### 4. State is Explicit
Postgres as source of truth for coordination.

- Task queue with heartbeats
- Agent crash logs and learnings
- Provider status tracking
- File claim system (coming)

### 5. Failures are Learning Opportunities
Crashes aren't just errors — they're data.

- Crash analysis workflow
- Lessons stored in ops.agent_crashes
- Spawn advisor checks history
- Pattern detection over time

---

## Key Subsystems

### Memory System
- **Capture:** `hermit-memory` skill writes to pg_vector
- **Embed:** OpenAI text-embedding-3-small (1536 dims)
- **Search:** Semantic (vector) + keyword (tsvector)
- **Recall:** Load top N results without bloating context

### Task Queue
- **Schema:** ops.task_queue
- **States:** queued → running → review → done/failed
- **Heartbeats:** Every 2-3 tool calls to prevent zombie detection
- **Review:** Agents must post comment before completion

### Cost Tracking
- **Schema:** ops.agent_costs (cents, tokens, model)
- **FX Rates:** Daily ECB rates for EUR conversion
- **Alerts:** WARN (50%), CRITICAL (80%), SPIKE (3x normal)
- **Reporting:** Daily/weekly/monthly aggregations

### Workflow Engine
- **Format:** YAML workflow definitions
- **Orchestration:** Multi-step agent coordination
- **State:** Tracks progress through workflow steps
- **Triggers:** Manual or event-driven

---

## Scalability Considerations

**Current limits:**
- Single-machine deployment
- Postgres on same host
- One gateway process
- Shared model rate limits

**Future scaling paths:**
- Multi-node deployment (OpenClaw supports this)
- Postgres replication
- Gateway clustering
- Per-agent rate limit pools

---

## Security Model

**Principles:**
- Secrets in environment variables (not git)
- API keys in `~/.openclaw/config/secrets.json`
- Database access via Unix socket (no network exposure)
- File permissions (0600 for secrets, 0700 for workspace)

**Threat model:**
- Prompt injection attacks (mitigated by model selection)
- External content scraping (Sonnet minimum for safety)
- Multi-tenancy isolation (not yet supported)

---

## Monitoring & Observability

**Logs:**
- systemd journal (`journalctl -u openclaw-gateway`)
- Application logs (`~/.openclaw/logs/`)
- Session transcripts (`*.jsonl`)

**Metrics:**
- Token usage (ops.agent_costs)
- Context snapshots (ops.context_snapshots)
- Task queue stats (count by status)
- Provider response times (coming)

**Dashboards:**
- Mission Control (oclaw-ops repo)
- Token usage graphs (24h rolling)
- Cost trends (daily/weekly/monthly)
- Agent activity heatmap (coming)

---

## Related Documentation

- **[Setup: Deployment](../setup/deployment-guide.md)** — Infrastructure setup
- **[Memory: Context Management](../memory/context-management.md)** — Memory subsystem
- **[Cost Management](../cost/)** — Cost tracking implementation
- **[Agents](../agents/)** — Multi-agent coordination

---

## Contributing

Want to improve the architecture?

- Document additional subsystems
- Create diagrams (architecture, data flow)
- Add infrastructure guides
- Share deployment patterns
