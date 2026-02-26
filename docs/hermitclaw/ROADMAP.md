# HermitClaw 🦀 — Roadmap
**Portable OpenClaw setup for MacBook with Tailscale + local Postgres**

hermitclaw.com

---

## v1.0 — Foundation (MVP)
Complete local OpenClaw setup guide tailored for MacBook.

### Core Setup
- [ ] Homebrew + Node.js 22+ install
- [ ] OpenClaw install + onboard wizard
- [ ] Telegram bot setup (BotFather → token → config)
- [ ] Multi-provider API keys (Anthropic, OpenAI, xAI, Google)
- [ ] Brave Search API key

### Tailscale Remote Access
- [ ] Tailscale install + login
- [ ] `openclaw gateway --tailscale serve` for remote access
- [ ] Access from phone/tablet anywhere via Tailscale

### Local Postgres + pgvector (Docker Desktop)
- [ ] Docker Desktop for Mac install
- [ ] docker-compose.yml (postgres 16 + pgvector)
- [ ] Two databases: `agent_memory` (private) + `workspace` (shared ops)
- [ ] PgTune settings for MacBook (8-16GB RAM typical)
- [ ] Prisma schema (from oclaw-ops, 23 models)

### Multi-Agent Setup
- [ ] Main agent (lead) + at least 1 sub-agent
- [ ] SOUL.md / IDENTITY.md / AGENTS.md / USER.md templates
- [ ] Spawn permissions configuration
- [ ] Agent workspace isolation

### MacBook-Specific Considerations
- [ ] Sleep/wake handling (gateway restart on wake?)
- [ ] Battery impact + optimization tips
- [ ] WiFi reconnection after sleep
- [ ] Disk space management (logs, sessions, backups)
- [ ] launchd service (macOS equivalent of systemd)
- [ ] Caffeinate for keeping alive during long tasks

### Maintenance
- [ ] Backup script (launchd cron equivalent)
- [ ] Log rotation
- [ ] Auto-update check
- [ ] Watchdog for gateway health

---

## v1.1 — Agent Intelligence
Memory, learning, and workflow engine.

### Memory Migration
- [ ] Import MEMORY.md + daily notes → Postgres with embeddings
- [ ] Hybrid search (vector + keyword + tags)
- [ ] Dual-write during transition (markdown + DB)

### Workflow Engine
- [ ] Antfarm-inspired YAML workflows stored in Postgres
- [ ] Task queue with LISTEN/NOTIFY (real-time vs cron polling)
- [ ] Role-based agent permissions (read-only verifier, etc.)
- [ ] Verify → retry → escalate pattern

### Agent Leveling (@KSimback)
- [ ] 4-level system: Observer → Advisor → Operator → Autonomous
- [ ] Performance reviews + level change audit trail
- [ ] Trust score drives autonomy

---

## v1.2 — Mission Control
Mobile-friendly dashboard via Tailscale.

### Dashboard
- [ ] Next.js + Tailwind + shadcn/ui (or htmx for lightweight)
- [ ] Active agents + status (running/idle/error)
- [ ] Task progress + workflow steps
- [ ] Activity feed (real-time agent events)
- [ ] Token usage + cost tracking
- [ ] Compaction timeline estimate
- [ ] Quick actions: approve/reject/escalate

### Access
- [ ] Tailscale-only (no public auth needed)
- [ ] Mobile-optimized layout
- [ ] Inline buttons for task decisions

---

## v2.0 — Advanced Features (Future)
Ideas from ClawCity, RentAHuman.ai, @ericosiu, @Voxyz_ai.

### Structured Human Escalation (from RentAHuman.ai)
- [ ] Task type "human_needed" in queue
- [ ] Task cards with context, urgency, acceptance criteria
- [ ] Agent→Human→Agent handoff protocol
- [ ] Mission Control shows pending human tasks with approve/reject/do buttons
- [ ] Result feeds back to agent automatically

### Karma-Driven Autonomy (from ClawCity)
- [ ] Granular trust scoring beyond 4 levels
- [ ] Every successful task increases trust, failures decrease
- [ ] Role unlocks based on karma thresholds
- [ ] Agents can earn/lose privileges dynamically

### Cross-Agent Intelligence (from @ericosiu)
- [ ] Shared priority stack (all agents read/update)
- [ ] Cross-signal detection (same entity in 2+ agents = amplified)
- [ ] Daily context sync between agents
- [ ] Memory compounding (weekly synthesis, mistake tracker)

### Reaction Matrix (from @Voxyz_ai)
- [ ] Probability-based agent-to-agent responses
- [ ] Trigger rules (reactive + proactive)
- [ ] Cooldowns to prevent spam loops
- [ ] Self-healing: recover stale steps after timeout

### Agent-to-Agent Communication
- [ ] Inter-agent messaging audit trail in DB
- [ ] Agent registry with skills/capabilities
- [ ] Protocol: check availability → provide context → hand off
- [ ] Activity feed of all cross-agent interactions

### MCP Integration
- [ ] Expose tasks as MCP tools for external agent integration
- [ ] Standard tool interface for human task delegation
- [ ] Potential marketplace for agent skills/services

### Voice Pipeline (from @ericosiu)
- [ ] Voice note → transcription → structured extraction
- [ ] Priority stack auto-updates from voice input
- [ ] All agents reprioritize based on voice commands

---

## Documentation Strategy
Every phase documented step-by-step for:
- Friends who want to replicate the setup
- a teenager learning tech
- Future open-source release (hermitclaw.com)

Based on our VPS experience (docs/deployment-guide.md), adapted for macOS.

---

*This roadmap evolves as we build. Check git history for changes.*
