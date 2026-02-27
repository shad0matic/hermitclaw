# Compact Context System

Minimizes token costs by maintaining small, auto-summarized JSON context files per scope (topic, project, task).

## Structure

```
memory/context/
├── telegram/topic_<id>.json
├── project/<name>.json
└── task/<id>.json
```

## Schema

```json
{
  "version": 1,
  "last_updated_utc": "2026-02-26T08:00:00Z",
  "source_id": "4706",
  "summary": {
    "current_focus": "string",
    "key_decisions": ["string"],
    "pending_actions": ["string"],
    "active_items": [123, 456]
  }
}
```

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/update-telegram-context.sh <topic_id>` | Refresh context for a Telegram topic |

## Refresh Triggers

| Scope | Trigger | Fallback |
|-------|---------|----------|
| Telegram topic | Every 5-10 messages | Daily cron |
| Project | Task status change | Daily cron |
| Task | Comment/status update | On access |

## Usage

1. Agent reads compact context before any operation
2. Gets 90% of needed info at ~5% token cost
3. Falls back to full sources only when needed

## Versioning

All context files are Git-tracked. History available via `git log memory/context/`.
