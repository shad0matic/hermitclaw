# HermitClaw Documentation 📚

Comprehensive guides for deploying, operating, and optimizing your OpenClaw agent infrastructure.

## 📖 Documentation Structure

### 🚀 [Setup](setup/)
Getting started with HermitClaw — installation, deployment, and initial configuration.

- [Mac Setup Guide](setup/mac-setup-guide.md) — Install OpenClaw on macOS (20 min)
- [Deployment Guide](setup/deployment-guide.md) — Deploy to VPS for 24/7 operation (30 min)
- [Postgres Setup](setup/postgres-setup.md) — Database & pgvector configuration (15 min)
- [Multi-Instance Setup](setup/multi-instance-setup.md) — Running multiple agents on one machine

**Start here if:** You're new to OpenClaw or HermitClaw.

---

### 🎛️ [Configuration & Onboarding](config/)
Agent identity, memory structure, and operational rules.

- [Configuration Guide](config/) — AGENTS.md, SOUL.md, USER.md, HEARTBEAT.md templates
- Onboarding checklist for new agents
- Multi-agent configuration patterns
- Best practices for identity files

**Read this if:** You're setting up a new agent or customizing behavior.

---

### 🧠 [Memory Management](memory/)
Context discipline, semantic memory, and token optimization strategies.

- [Context Management](memory/context-management.md) — Trimming thresholds, 3-tier memory system, cost impact
- [Compact Context](memory/compact-context.md) — JSON summaries per scope (topic/project/task)

**Read this if:** You want to reduce token costs, improve response speed, or understand memory architecture.

---

### ⚙️ [Operations](operations/)
Day-to-day maintenance, monitoring, and troubleshooting.

- [Recovery Guide](operations/recovery-guide.md) — Fix common issues, restore from backups
- [Secrets Management](operations/secrets-management.md) — API key storage & rotation
- [Gmail Pub/Sub Setup](operations/gmail-pubsub-setup.md) — Real-time email notifications

**Read this if:** You're running a production deployment or need to fix something.

---

### 💰 [Cost & Model Management](cost/)
Optimizing model selection, tracking spending, and provider management.

- *(Coming soon)* Cost tracking guide
- *(Coming soon)* Model selection strategy
- *(Coming soon)* Provider failover & rate limits

**Read this if:** You want to control API costs or optimize model usage.

---

### 🤖 [Agents](agents/)
Multi-agent coordination, spawning strategies, and agent profiles.

- *(Coming soon)* Agent coordination patterns
- *(Coming soon)* Spawning strategies (when to spawn, timeout management)
- *(Coming soon)* Agent profiles & specialization

**Read this if:** You're building multi-agent workflows or need coordination patterns.

---

### 🏗️ [Architecture](architecture/)
System design, data flow, and infrastructure decisions.

- *(Coming soon)* System architecture overview
- *(Coming soon)* Data flow diagrams
- *(Coming soon)* Postgres schema deep-dive

**Read this if:** You want to understand how HermitClaw works under the hood.

---

### 🦀 [HermitClaw Project](hermitclaw/)
Roadmap, project goals, and development notes.

- [Roadmap](hermitclaw/ROADMAP.md) — Future features & milestones

---

## 🎯 Quick Navigation

**I want to...**

- **Get started from scratch** → [Setup: Mac Setup Guide](setup/mac-setup-guide.md)
- **Deploy to production** → [Setup: Deployment Guide](setup/deployment-guide.md)
- **Configure my agent's identity** → [Config: Configuration Guide](config/)
- **Reduce token costs** → [Memory: Context Management](memory/context-management.md)
- **Fix a broken deployment** → [Operations: Recovery Guide](operations/recovery-guide.md)
- **Set up semantic memory** → [Setup: Postgres Setup](setup/postgres-setup.md)
- **Understand memory architecture** → [Memory: Context Management](memory/context-management.md)
- **Configure API keys** → [Operations: Secrets Management](operations/secrets-management.md)
- **Set up heartbeat routines** → [Config: HEARTBEAT.md](config/)

---

## 🤝 Contributing

Found a typo or want to improve a guide? PRs welcome!

1. Fork the repo
2. Create a feature branch
3. Submit a PR with clear description

---

## 📦 Related

- [HermitClaw GitHub](https://github.com/shad0matic/hermitclaw) — Main repository
- [OpenClaw](https://github.com/openclaw/openclaw) — The agent framework
- [oclaw-ops](https://github.com/shad0matic/oclaw-ops) — Mission Control dashboard
