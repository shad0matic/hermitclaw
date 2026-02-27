# Context Management & Cost Control

## Why Context Management Matters

Every message you send to an AI agent includes the **full conversation context** (all previous messages). As conversations grow, so do:
- **Token costs** — You pay for input tokens every single call
- **Latency** — Larger context = slower responses
- **API limits** — Some models have context window caps (e.g., 200k tokens)

**Example:** A session at 60k tokens sends 60k input tokens with EVERY message. At 100 messages/day, that's 6M tokens just for context replay.

## The Three-Tier Memory System

OpenClaw uses a three-tier memory architecture to keep context lean while preserving information:

### Tier 1: Active Context (Working Memory)
- **What:** Current conversation history loaded into every API call
- **Size:** Target ~30k tokens (15% of 200k limit)
- **Lifespan:** Until trimmed or session ends
- **Cost:** Charged on every API call

### Tier 2: Semantic Memory (pg_vector)
- **What:** Searchable knowledge base with embeddings (via HermitClaw)
- **Size:** Unlimited (Postgres database)
- **Lifespan:** Permanent
- **Cost:** Free (uses Gemini for embeddings, no API cost on recall)

### Tier 3: File-Based Memory (MEMORY.md, daily logs)
- **What:** Human-readable markdown files
- **Size:** Unlimited
- **Lifespan:** Permanent (git-versioned)
- **Cost:** Free

## Context Discipline Thresholds

| Range | Status | Action | Urgency |
|-------|--------|--------|---------|
| **0-20%** | 🟢 Normal | Proactive capture of significant events | Routine |
| **20-30%** | 🟡 Trim | Keep last 5-10 exchanges, archive rest | Scheduled |
| **30-40%** | 🟠 Aggressive | Capture checkpoint to pg_vector + heavy trim | Immediate |
| **40%+** | 🔴 Critical | Force flush + session split if needed | Emergency |

### Target: ~30k avg context (15%)

## Proactive Trimming Strategy

**Triggers:** Whichever comes first:
1. Context ≥20% (40k tokens)
2. Every heartbeat cycle (~30 min)

**Process:**
1. **Capture significant events** → pg_vector immediately
   - Decisions made
   - Lessons learned
   - Important context
2. **Trim routine exchanges** >1hr old
   - Keep last 5-10 messages for continuity
   - Archive older routine chat
3. **Report token savings** (optional, for monitoring)

**What NOT to trim:**
- Recent exchanges (last 5-10)
- Active work context
- Unresolved questions
- Critical decisions not yet captured

## HermitClaw Integration

The semantic memory system (`~/skills/hermit-memory/`) provides:

### Capture Command
```bash
node ~/skills/hermit-memory/memory.mjs capture --type <type> --content "text"
```

**Types:**
- `decision` — Important choices made
- `learning` — Lessons, insights, patterns
- `error` — Mistakes to avoid repeating
- `insight` — Observations, realizations
- `checkpoint` — Context snapshots before trim

### Recall Command
```bash
node ~/skills/hermit-memory/memory.mjs recall "query"
```

Returns relevant memories via semantic search (no need to load full context).

### Context Check
```bash
node ~/skills/hermit-memory/memory.mjs context <tokens>
```

Reports current utilization percentage and alert level.

### Stats
```bash
node ~/skills/hermit-memory/memory.mjs stats
```

Memory database statistics.

## Cost Impact Example

**Scenario:** 100 messages/day, 60k context per message

| Strategy | Context Size | Daily Tokens | Monthly Cost (Sonnet) |
|----------|-------------|--------------|---------------------|
| **No trimming** | 60k | 6M input | ~$90 |
| **Trim at 50%** | 40k avg | 4M input | ~$60 |
| **Trim at 20%** | 30k avg | 3M input | ~$45 |

**Savings:** $45/month just from context discipline (~50% reduction).

Combine with model optimization (Opus → Sonnet) for 10x additional savings.

## Implementation Checklist

### HEARTBEAT.md
Add proactive trimming to your heartbeat checklist:

```markdown
### 🧹 Proactive Context Trimming (Every Heartbeat)

1. Check current context
2. If ≥20%: capture checkpoint + trim
3. Always: review last hour, capture significant events
```

### SOUL.md
Document your context discipline thresholds:

```markdown
**Context Discipline:**
- 🟢 0-20%: Normal operation
- 🟡 20-30%: Trim conversation history
- 🟠 30-40%: Aggressive trim + checkpoint
- 🔴 40%+: Critical, force flush

Proactive trimming: Every heartbeat OR at 20% threshold.
Target: ~30k avg context (15%).
```

### Cron Job (Optional)
For fully automated trimming:

```bash
*/30 * * * * node ~/skills/hermit-memory/memory.mjs auto-trim --threshold 20
```

## Monitoring

Track context utilization over time:

```sql
SELECT session_key, utilization_pct, created_at 
FROM ops.context_snapshots 
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY utilization_pct DESC;
```

Alert if sessions consistently hit 40%+ (indicates trimming isn't working).

## Best Practices

1. **Capture immediately** — Don't wait for trimming to capture important context
2. **Trim aggressively** — Routine chat can always be recalled from logs
3. **Monitor costs** — Track token usage to validate savings
4. **Review periodically** — Adjust thresholds if 20% feels too tight
5. **Use semantic search** — Recall from pg_vector instead of bloating context

## Troubleshooting

**Problem:** Context keeps growing despite trimming
- Check if trimming logic is actually running (logs)
- Verify captures are succeeding (pg_vector)
- May need to lower threshold (15%?)

**Problem:** Lost important context after trim
- Improve capture discipline (capture before trim)
- Review what was trimmed (check logs)
- Add to "do not trim" rules

**Problem:** Too many manual interventions
- Automate via cron (every 30 min)
- Lower threshold to prevent emergencies
- Improve capture triggers

## Related Documentation

- **Cost Policy:** `docs/cost-policy.md` (model tiers, usage guidelines)
- **Memory Recall:** `docs/memory-recall.md` (semantic search, boot context)
- **Heartbeat System:** `docs/heartbeat.md` (proactive checks, scheduling)
- **HermitClaw Setup:** `docs/hermitclaw/SETUP.md` (installation, configuration)
