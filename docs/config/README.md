# Configuration & Onboarding 🎛️

Templates, guides, and best practices for configuring your OpenClaw agent identity, memory, and behavior.

## Overview

Your agent's personality, memory structure, and operational rules are defined through configuration files in `~/.openclaw/workspace/`. This section covers:
- Identity files (AGENTS.md, SOUL.md, USER.md)
- Memory structure (MEMORY.md, daily logs)
- Operational rules (HEARTBEAT.md, TOOLS.md)
- Onboarding new agents

---

## Core Configuration Files

### AGENTS.md
**Your operational manual.** Defines:
- How to wake up each session (what to read first)
- Memory management discipline
- Safety rules and boundaries
- Group chat behavior
- Tool usage guidelines
- Heartbeat routines

**Template:** `templates/AGENTS.md` in hermitclaw repo

**Key sections:**
- First Run (bootstrap process)
- Every Session (what to read)
- Memory (3-tier system explanation)
- Safety (don't exfiltrate, don't destroy)
- External vs Internal (ask before sending)
- Group Chats (when to speak, when to stay silent)

---

### SOUL.md
**Your personality and values.** Defines:
- Core truths (what you care about)
- Boundaries (what you won't do)
- Vibe (how you communicate)
- Continuity (how memory persists)
- Delegation rules (who handles what)

**Template:** `templates/SOUL.md` in hermitclaw repo

**Key sections:**
- Core Truths (be resourceful, have opinions, earn trust)
- Formatting (platform-specific rules)
- Boundaries (privacy, safety)
- Vibe (concise, competent, not corporate)
- Memory Management Discipline (3-tier commitment)

---

### USER.md
**About your human.** Contains:
- Name, timezone, contact info
- Professional context (job, team, tools)
- Projects & focus areas
- Weekly availability
- Time for side projects
- Pet peeves & preferences
- Family & key dates

**Template:** `templates/USER.md` in hermitclaw repo

**Privacy:** This file contains personal data. Never commit to public repos.

---

### HEARTBEAT.md
**Proactive routines.** Defines:
- What to check on heartbeat polls (every 30 min)
- Priority order (mistakes → task comments → secondary tasks)
- Auto-fix procedures (corrupted sessions, orphan tasks)
- Context trimming discipline
- Daily self-check questions

**Template:** `templates/HEARTBEAT.md` in hermitclaw repo

**Key sections:**
- Priority #0: Recall mistakes
- Priority #1: Task comments
- Secondary tasks (context trim, auto-fixes, learning)
- Daily self-check
- Morning routines (X bookmarks, etc.)

---

### MEMORY.md
**Your long-term curated memory.** Contains:
- Significant decisions
- Lessons learned
- Important context
- Project notes
- User preferences

**Format:** Freeform markdown

**Privacy:** Contains personal/project context. Don't share publicly.

**Maintenance:** Review and update during heartbeats (every few days).

---

### TOOLS.md
**Environment-specific notes.** Contains:
- Camera names and locations
- SSH hosts and aliases
- Preferred voices for TTS
- Device nicknames
- Git repos
- Topic IDs (Telegram, Discord)

**Purpose:** Keep instance-specific details separate from reusable templates.

---

### IDENTITY.md
**Quick reference card.** Contains:
- Agent name
- Role
- Emoji
- Avatar link

**Purpose:** Fast identity lookup for multi-agent systems.

---

## Onboarding Checklist

### 1. Clone Templates
```bash
cp ~/hermitclaw/templates/* ~/.openclaw/workspace/
```

### 2. Customize Identity Files
- [ ] **AGENTS.md** — Update memory paths, tool locations
- [ ] **SOUL.md** — Define personality, boundaries, delegation rules
- [ ] **USER.md** — Fill in human's details, preferences, schedule
- [ ] **IDENTITY.md** — Set agent name, role, emoji

### 3. Set Up Memory Structure
- [ ] Create `memory/` folder
- [ ] Initialize `MEMORY.md` with seed content
- [ ] Set up daily log format (YYYY-MM-DD.md)
- [ ] Configure pg_vector (see [Setup: Postgres](../setup/postgres-setup.md))

### 4. Configure Operational Rules
- [ ] **HEARTBEAT.md** — Define proactive routines
- [ ] **TOOLS.md** — Add environment-specific notes
- [ ] Set context discipline thresholds (20%/30%/40%)

### 5. Test & Iterate
- [ ] Send first message, verify response
- [ ] Trigger heartbeat, check routines run
- [ ] Test memory recall from MEMORY.md
- [ ] Verify context trimming works
- [ ] Check cost tracking

---

## Best Practices

### Identity Files
1. **SOUL.md is your north star** — Everything else derives from it
2. **AGENTS.md is executable** — Should be clear enough to follow mechanically
3. **USER.md evolves** — Update as you learn preferences
4. **HEARTBEAT.md is discipline** — Don't let it drift

### Memory Management
1. **Daily logs are raw** — Don't overthink, just capture
2. **MEMORY.md is curated** — Quality over quantity
3. **pg_vector is searchable** — Capture decisions/learnings immediately
4. **Review periodically** — Update MEMORY.md from daily logs every few days

### Configuration Iteration
1. **Start simple** — Don't over-configure on day 1
2. **Learn what works** — Adjust based on real usage
3. **Document changes** — Commit to git with clear messages
4. **Share learnings** — Contribute improved templates back to hermitclaw

---

## Multi-Agent Configuration

When running multiple agents on one machine:

### Shared Configuration
- Database (same Postgres instance)
- API keys (same secrets.json)
- Tools & scripts (hermitclaw repo)

### Per-Agent Configuration
- Workspace folder (separate for each)
- Identity files (AGENTS.md, SOUL.md, IDENTITY.md)
- Memory (separate MEMORY.md, daily logs)
- Session key (different Telegram accounts, channels)

**Guide:** [Setup: Multi-Instance](../setup/multi-instance-setup.md)

---

## Common Patterns

### Pattern: Lead + Workers
**Lead minion** (e.g., Kevin) handles strategy, delegates to specialists.

**Configuration:**
- Lead: SOUL.md emphasizes "no coding, delegate everything"
- Workers: SOUL.md focuses on technical execution
- Shared: Same USER.md, different focus areas

### Pattern: Specialist Agents
Each agent has deep expertise in one area (UI, backend, research).

**Configuration:**
- Separate SOUL.md with specialization
- Different model assignments (Gemini vs Sonnet)
- Unique TOOLS.md with domain-specific notes

### Pattern: Context Zones
Agents work in different contexts (work, personal, projects).

**Configuration:**
- Separate USER.md per context
- Different MEMORY.md (work vs personal)
- Isolated workspaces, shared tools

---

## Template Customization

### AGENTS.md Sections to Customize
- **First Run:** Your bootstrap process
- **Every Session:** What files to read
- **Tools:** Your specific skills (gog, weather, voice-call, etc.)
- **Group Chats:** Platform-specific rules (Discord, Telegram, Slack)

### SOUL.md Sections to Customize
- **Core Truths:** Your values and priorities
- **Formatting:** Platform preferences (markdown, voice, etc.)
- **Delegation:** Who handles what (agent routing)
- **Memory Management:** Your context discipline thresholds

### HEARTBEAT.md Sections to Customize
- **Priority #1:** Your urgent checks (task comments, emails, etc.)
- **Secondary tasks:** Your proactive routines
- **Daily self-check:** Your reflection questions
- **Morning routines:** Your scheduled checks

---

## Troubleshooting

**Agent doesn't follow SOUL.md:**
- Check if file is loaded in workspace context
- Verify no conflicting instructions in AGENTS.md
- Review session history for contradictions

**Memory not persisting:**
- Verify MEMORY.md is being read on boot
- Check pg_vector is configured (see [Setup: Postgres](../setup/postgres-setup.md))
- Ensure memory-sync.mjs runs regularly

**Heartbeat not running:**
- Check cron job is configured
- Verify HEARTBEAT.md is in workspace
- Review logs for errors

**Context keeps growing:**
- Check trimming thresholds in SOUL.md/HEARTBEAT.md
- Verify proactive trimming is running
- May need to lower threshold (15%?)

---

## Related Documentation

- **[Setup](../setup/)** — Initial installation
- **[Memory Management](../memory/)** — Context optimization
- **[Operations](../operations/)** — Maintenance & troubleshooting
- **[Agents](../agents/)** — Multi-agent coordination

---

## Contributing

Have configuration patterns to share?

- Document your agent personality
- Share specialized templates (researcher, coder, writer)
- Add onboarding guides for specific use cases
- Contribute HEARTBEAT routines that work well
