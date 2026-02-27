# Agent Coordination 🤖

Multi-agent orchestration, spawning strategies, and coordination patterns for complex workflows.

## Overview

HermitClaw supports multiple specialized agents working together:
- **Kevin 🍌** — Lead minion, general manager (no coding)
- **Bob 🎨** — UI/frontend specialist
- **Stuart 🔒** — Backend/complex systems (senior dev)
- **Phil 🐊** — X/Twitter extraction specialist
- **Echo 🔊** — Media transcription & analysis
- **Nefario 🔬** — Deep research (needs approval, expensive)

---

## Coming Soon

### Agent Coordination Patterns
- When to spawn vs do it yourself
- Cross-agent communication
- Shared state management
- Conflict resolution (file claims, edit locks)

### Spawning Strategies
- Task complexity estimation
- Timeout management (runTimeoutSeconds)
- Crash recovery and respawn logic
- Rate limit handling (max 2 concurrent per provider)

### Agent Profiles & Specialization
- Agent capabilities matrix
- Model assignments per agent
- Context loading per agent type (ui/backend/db/research)
- Skill routing (which agent for which task)

### Sub-Agent Orchestration
- Parent-child communication
- Task delegation trees
- Progress monitoring
- Result aggregation

---

## Basic Spawning (Available Now)

```javascript
sessions_spawn({
  task: "Description of what to do",
  agentId: "bob",  // bob|stuart|phil|echo|nefario
  label: "task-123",
  model: "gemini",  // gemini for workers, sonnet for complex
  runTimeoutSeconds: 1800
})
```

**Critical rules:**
1. Always specify `model` parameter (never inherit parent's model)
2. Include crash history in task context (learn from failures)
3. Set proper timeout (900s default, 1800s for complex, 3600s+ for research)
4. Check rate limits (max 2 concurrent spawns per provider)

---

## Agent Routing Guidelines

**Task Type → Agent:**
- `complexity = 'easy'` → **Bob** (Gemini) — default worker
- `complexity = 'complex'` → **Stuart** (Sonnet) — senior dev
- UI/frontend → **Bob** with `ui` context
- Backend/API → **Stuart** with `backend` context
- Database/Prisma → **Stuart** with `db` context
- X/Twitter work → **Phil** (Gemini) with `birdx` skill
- Media analysis → **Echo** (Gemini) with transcription skill
- Deep research → **Nefario** (Sonnet) — **requires Boss approval first**

---

## Rate Limit Handling

**Problem:** Spawning multiple agents can hit provider rate limits.

**Solution:**
1. Max 2 concurrent spawns per provider (Gemini/Sonnet)
2. On rate limit failure:
   - Wait 60s
   - Respawn one at a time
3. Fallback chain: Gemini → Sonnet (if Gemini rate limited)
4. Track in `ops.provider_status` table

**Tools:**
```bash
# Check spawn advisor
./scripts/spawn-advisor.sh

# Get agent crash history
./scripts/get-agent-crashes.sh bob 5

# Detect crashes
./scripts/crash-detector.sh
```

---

## Coordination Patterns

### Pattern: Lead-Worker
Kevin delegates tasks to specialized workers, aggregates results.

**Use when:** Complex multi-step work that can be parallelized.

### Pattern: Pipeline
Agent A completes task → spawns Agent B for next step.

**Use when:** Sequential dependencies (research → implementation → testing).

### Pattern: Swarm
Multiple agents work on independent subtasks simultaneously.

**Use when:** High-volume parallel work (bulk processing, batch analysis).

---

## File Claim System (Coming Soon)

Prevents multiple agents from editing the same file simultaneously.

**Schema:**
```sql
ops.file_claims (
  file_path text,
  claimed_by text,  -- agent_id
  claimed_at timestamptz
)
```

**Process:**
1. Agent checks if file is claimed
2. If unclaimed → claim it
3. Edit file
4. Release claim
5. If claimed by another → wait or choose different file

---

## Tools & Scripts

**Spawning:**
- `./scripts/spawn-advisor.sh` — Pre-spawn checks (crash history, rate limits)
- `./scripts/get-agent-crashes.sh <agent> <limit>` — Get crash history for context

**Monitoring:**
- `openclaw sessions list` — View active agents
- `./scripts/crash-detector.sh` — Find unanalyzed crashes

**Recovery:**
- `./scripts/reset-orphan-reviews.sh` — Reset tasks with incomplete submissions
- `./scripts/fix-corrupt-sessions.sh` — Archive broken sessions

---

## Best Practices

1. **Always check crash history before spawning** — Include in task context
2. **Set appropriate timeouts** — 900s default, 1800s for complex, 3600s+ for research
3. **Never spawn without model parameter** — Prevents expensive model inheritance
4. **Use task-specific context** — Load only what the agent needs (ui/backend/db)
5. **Monitor for zombies** — Tasks running >30 min without heartbeat
6. **Learn from failures** — Log crashes to `ops.agent_crashes` for pattern analysis

---

## Database Schema

**Key tables:**
- `ops.task_queue` — Task status, agent assignment, heartbeats
- `ops.agent_crashes` — Crash analysis and lessons learned
- `ops.provider_status` — Rate limit tracking
- `ops.file_claims` — Edit conflict prevention (coming soon)

---

## Related Documentation

- **[Cost Management](../cost/)** — Model selection per agent
- **[Memory Management](../memory/)** — Context optimization
- **[Operations](../operations/)** — Monitoring and troubleshooting

---

## Contributing

Building interesting coordination patterns? Share them!

- Document your multi-agent workflows
- Contribute spawn strategies
- Add agent profiles for new specializations
- Share crash analysis insights
