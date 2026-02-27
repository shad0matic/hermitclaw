# Memory Management 🧠

Optimize context usage, implement semantic memory, and control token costs through disciplined memory management.

## Core Concepts

### The Three-Tier Memory System

HermitClaw uses a layered memory architecture:

1. **Active Context** (Working Memory)
   - Current conversation history
   - Sent with every API call
   - ~30k tokens target (15% of 200k limit)

2. **Semantic Memory** (pg_vector)
   - Searchable knowledge base with embeddings
   - Unlimited size, permanent storage
   - Free to recall (no API cost)

3. **File Memory** (Markdown files)
   - Human-readable archives
   - Git-versioned, permanent
   - MEMORY.md + daily logs

## Guides

### [Context Management](context-management.md)
**The most important guide for cost control.**

Topics covered:
- Why context management matters (token costs, latency, limits)
- Trimming thresholds (20%/30%/40%)
- Proactive trimming strategies
- HermitClaw integration examples
- Cost impact: ~50% savings from context discipline alone

**Read this first** if you want to reduce costs.

---

### [Compact Context](compact-context.md)
Token-efficient JSON summaries per scope (topic/project/task).

Topics covered:
- Scope-based context (topic vs project vs task)
- Auto-refresh triggers
- Integration with agents
- When to use vs pg_vector

**Read this** if you need persistent context without bloat.

---

## Key Strategies

### 1. Proactive Trimming
Trim at **20% threshold OR every heartbeat** (30 min), whichever comes first.

**Process:**
- Capture significant events → pg_vector immediately
- Trim routine exchanges >1hr old
- Keep last 5-10 messages for continuity

### 2. Semantic Capture
Store decisions, learnings, and insights in searchable pg_vector database.

**Tools:**
```bash
# Capture
node ~/skills/hermit-memory/memory.mjs capture --type decision --content "..."

# Recall
node ~/skills/hermit-memory/memory.mjs recall "query"

# Check context
node ~/skills/hermit-memory/memory.mjs context <tokens>
```

### 3. Scope-Based Summaries
Use compact-context.json for project/topic/task-specific memory.

**When to use:**
- Working within a specific project
- Long-running tasks (>1hr)
- Topic-specific conversations

---

## Cost Impact Example

| Strategy | Context Size | Daily Tokens (100 msgs) | Monthly Cost (Sonnet) |
|----------|-------------|-------------------------|---------------------|
| No trimming | 60k | 6M input | ~$90 |
| Trim at 50% | 40k avg | 4M input | ~$60 |
| **Trim at 20%** | **30k avg** | **3M input** | **~$45** |

**Savings:** $45/month (~50% reduction) from context discipline alone.

Combine with model optimization (Opus → Sonnet) for 10x additional savings.

---

## Best Practices

1. **Capture immediately** — Don't wait for trimming to save important context
2. **Trim aggressively** — Routine chat can always be recalled from logs
3. **Monitor costs** — Track token usage to validate savings
4. **Review periodically** — Adjust thresholds if needed (15%? 25%?)
5. **Use semantic search** — Recall from pg_vector instead of bloating context

---

## Tools & Scripts

**HermitClaw Memory Skill:**
- `~/skills/hermit-memory/memory.mjs` — Semantic memory CLI

**Database Schema:**
- `memory.memories` table (pg_vector 1536-dim embeddings)
- See [Postgres Setup](../setup/postgres-setup.md) for schema

**Scripts:**
- `scripts/memory-sync.mjs` — Sync MEMORY.md → database
- `scripts/memory-recall.mjs` — Boot context + semantic search

---

## Troubleshooting

**Context keeps growing despite trimming:**
- Check if trimming logic is running (logs)
- Verify captures are succeeding (pg_vector)
- May need to lower threshold (15%?)

**Lost important context after trim:**
- Improve capture discipline (capture before trim)
- Review what was trimmed (check logs)
- Add to "do not trim" rules

**Too many manual interventions:**
- Automate via cron (every 30 min)
- Lower threshold to prevent emergencies
- Improve capture triggers

---

## Related Documentation

- **[Cost Management](../cost/)** — Model selection, spending tracking
- **[Operations: Recovery](../operations/recovery-guide.md)** — Fix memory issues
- **[Setup: Postgres](../setup/postgres-setup.md)** — Database setup for semantic memory
