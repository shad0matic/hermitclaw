# Cost & Model Management 💰

Optimize AI spending through smart model selection, usage tracking, and provider management.

## Overview

AI costs can spiral quickly without discipline. This section covers:
- Model tier selection (Premium/Standard/Economy/Free)
- Cost tracking and alerting
- Provider failover strategies
- Rate limit handling

---

## Model Tiers (Quick Reference)

| Tier | Models | Cost (Output) | Use Case |
|------|--------|---------------|----------|
| **Premium** | claude-opus-4-6 | ~$25/Mtok | Critical decisions, architecture |
| **Standard** | claude-sonnet-4-5, gemini-2.5-pro, grok-3 | ~$2.50-3/Mtok | General work, coding, research |
| **Economy** | claude-haiku-4-5, gemini-2.5-flash, grok-3-mini | <$1/Mtok | High-volume, routine tasks |
| **Free** | Bash/Node scripts | $0 | Deterministic tasks |

---

## Cost Impact Examples

### Context Management
From [Memory: Context Management](../memory/context-management.md):

| Strategy | Daily Cost (100 msgs) | Monthly Cost |
|----------|----------------------|--------------|
| No trimming (60k context) | $15 | ~$450 |
| Trim at 50% (40k avg) | $10 | ~$300 |
| **Trim at 20% (30k avg)** | **$7.50** | **~$225** |

**Savings:** $225/month (~50%) from context discipline alone.

### Model Selection
Scenario: 100 tasks/day

| Model | Cost/Task | Daily | Monthly |
|-------|-----------|-------|---------|
| Opus (Premium) | $0.15 | $15 | ~$450 |
| Sonnet (Standard) | $0.015 | $1.50 | ~$45 |
| Haiku (Economy) | $0.002 | $0.20 | ~$6 |

**Savings:** $444/month by using Sonnet instead of Opus for routine work.

---

## Coming Soon

### Cost Tracking Guide
- Real-time spending dashboards
- Daily budget alerts
- Provider cost comparison
- Historical trend analysis

### Model Selection Strategy
- Task complexity scoring
- Auto-model assignment
- Fallback chains
- Security exceptions (prompt injection risk)

### Provider Management
- Rate limit handling
- Failover strategies
- Credit refresh tracking (e.g., xAI monthly credits)
- Multi-provider routing

---

## Tools (Available Now)

**Cost tracking:**
```bash
# View today's spending
node tools/cost-tracker.mjs --today

# Yesterday's breakdown
node tools/cost-tracker.mjs --yesterday --breakdown

# Monthly report
node tools/cost-tracker.mjs --month
```

**Context monitoring:**
```bash
# Check current context size
node ~/skills/hermit-memory/memory.mjs context <tokens>

# Session context stats
openclaw sessions list --context
```

---

## Quick Wins

### 1. Switch Main Session to Sonnet
Opus for lead planning only, Sonnet for everything else.

**Savings:** ~$350/day at 100 msgs/day

### 2. Enable Proactive Context Trimming
Trim at 20% threshold OR every heartbeat (30 min).

**Savings:** ~$225/month from token reduction

### 3. Use Free Models for Cron Jobs
Replace paid models with Gemini/MiniMax for monitoring.

**Savings:** ~$50/month from background tasks

### 4. Implement Spawn Model Policy
Never spawn sub-agents without explicit model parameter.

**Savings:** Prevents accidental Opus inheritance (~$300/month)

---

## Cost Discipline Principles

1. **Premium tier is precious** — Reserve Opus for critical decisions only
2. **Sub-agents must specify model** — Never inherit parent's expensive model
3. **Automate with free models** — Cron jobs should use Gemini/MiniMax
4. **Context is a cost multiplier** — Lean context = faster + cheaper
5. **Security overrides cost** — Use Sonnet minimum for untrusted input

---

## Related Documentation

- **[Memory: Context Management](../memory/context-management.md)** — Trimming strategies
- **[Operations: Monitoring](../operations/)** — Track spending in production
- **[Agents](../agents/)** — Model selection for spawned agents

---

## Contributing

Have cost optimization strategies to share? PRs welcome!

- Add case studies (real savings achieved)
- Document provider-specific tips
- Share monitoring dashboards
- Contribute cost tracking tools
