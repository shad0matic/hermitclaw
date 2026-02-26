# Postgres Setup — openclaw_db

**Updated:** 26/02/2026
**PG Version:** 17.x / 18.x | **pgvector:** 0.8.x
**DB:** `openclaw_db`

---

## macOS Setup (Homebrew)

If you're on macOS, use Homebrew. This is the easiest path.

```bash
# 1. Install Postgres
brew install postgresql@17
brew services start postgresql@17

# 2. Install pgvector
brew install pgvector

# 3. Create database
createdb openclaw_db

# 4. Enable pgvector extension
psql -d openclaw_db -c "CREATE EXTENSION IF NOT EXISTS vector;"

# 5. Verify
psql -d openclaw_db -c "SELECT version();"
```

**Note:** On macOS with Homebrew, you connect as your current user (no `sudo -u postgres` needed). The socket is at `/tmp/.s.PGSQL.5432`.

**Connection string for Node.js:**
```javascript
const pool = new pg.Pool({ 
  database: 'openclaw_db',
  host: '/tmp'  // Homebrew uses /tmp for socket
});
```

---

## Linux Setup (Ubuntu/Debian)

```bash
# 1. Create role and database
sudo -u postgres psql <<'SQL'
CREATE ROLE openclaw WITH LOGIN;
CREATE DATABASE openclaw_db OWNER openclaw;
GRANT ALL PRIVILEGES ON DATABASE openclaw_db TO openclaw;
SQL

# 2. Enable pgvector
sudo -u postgres psql -d openclaw_db -c "CREATE EXTENSION IF NOT EXISTS vector;"

# 3. Verify connection
psql -d openclaw_db -c "SELECT version();"
```

**Socket location:** `/var/run/postgresql`

---

## Schemas

### memory (private brain)
| Table | Purpose |
|-------|---------|
| `memories` | Long-term memories with vector(1536) embeddings |
| `daily_notes` | Daily markdown mirrors (one per date) |
| `agent_profiles` | Agent identity + level (1-4) + trust score |
| `performance_reviews` | Level change history + feedback |
| `entities` | Named entities (people, tools, concepts) |
| `entity_relations` | Relationships between entities |
| `mistakes` | Tracked errors for learning |
| `compounds` | Compound memories (synthesized) |

### ops (shared operations)
| Table | Purpose |
|-------|---------|
| `agent_events` | Activity log (actions, tokens, costs) |
| `tasks` | Workflow task queue with atomic claiming |
| `task_queue` | Real-time task queue (LISTEN/NOTIFY) |
| `task_runs` | Task execution history with cost tracking |
| `runs` / `steps` | Workflow execution tracking |
| `workflows` | YAML workflow definitions |
| `file_claims` | Multi-agent file locking |
| `subscriptions` | API subscription tracking |
| `fx_rates` | EUR/USD exchange rates for cost conversion |
| `cost_snapshots` | Hourly cost aggregations |
| `system_metrics` | 24h rolling buffer for dashboard |
| `x_bookmarks` / `x_bookmark_categories` | X/Twitter bookmark archive |
| `telegram_messages` | Message history for context |
| `live_sessions` | Active agent session tracking |
| `zombie_events` | Stalled agent detection |

### kb (knowledge base)
| Table | Purpose |
|-------|---------|
| `x_bookmarks` | X/Twitter bookmarks (Smaug extraction) |
| `bookmark_folders` | Folder organization |

---

## Schema Setup

**Fresh install?** Run the SQL below to create the essential tables. This is all you need to get started.

**Migrating from existing setup?** Restore from a backup file (`pg-YYYY-MM-DD.sql.gz`).

### Essential Tables (Fresh Install)

```sql
-- Core schemas
CREATE SCHEMA IF NOT EXISTS memory;
CREATE SCHEMA IF NOT EXISTS ops;
CREATE SCHEMA IF NOT EXISTS kb;

-- Essential: agent_profiles
CREATE TABLE memory.agent_profiles (
    id SERIAL PRIMARY KEY,
    agent_id TEXT UNIQUE NOT NULL,
    name TEXT,
    level INTEGER DEFAULT 1 CHECK (level BETWEEN 1 AND 4),
    trust_score NUMERIC(3,2) DEFAULT 0.50,
    total_tasks INTEGER DEFAULT 0,
    successful_tasks INTEGER DEFAULT 0,
    reports_to TEXT REFERENCES memory.agent_profiles(agent_id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Essential: memories (with pgvector)
CREATE TABLE memory.memories (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    embedding vector(1536),
    tags TEXT[] DEFAULT '{}',
    importance INTEGER DEFAULT 5,
    source_file TEXT,
    agent_id TEXT DEFAULT 'main',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX memories_embedding_idx ON memory.memories 
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Essential: agent_events
CREATE TABLE ops.agent_events (
    id SERIAL PRIMARY KEY,
    agent_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    detail JSONB,
    tokens_used INTEGER,
    cost_usd NUMERIC(10,6),
    session_key TEXT,
    task_id INTEGER,
    context_id INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_events_agent ON ops.agent_events(agent_id);
CREATE INDEX idx_events_type ON ops.agent_events(event_type);
```

---

## Restore from Backup

When restoring, fix ownership if the OS user has changed:

```bash
zcat pg-YYYY-MM-DD.sql.gz \
  | sed 's/OWNER TO shad/OWNER TO openclaw/g; /\\restrict/d; /\\unrestrict/d' \
  | psql -d openclaw_db
```

**If you get permission errors on `kb` schema:**
```bash
sudo -u postgres psql -d openclaw_db -c "
  ALTER SCHEMA kb OWNER TO openclaw;
  GRANT ALL ON ALL TABLES IN SCHEMA kb TO openclaw;
  GRANT ALL ON ALL SEQUENCES IN SCHEMA kb TO openclaw;
"
```

---

## Security
- `listen_addresses = 'localhost'` — no external access
- Port 5432 bound to 127.0.0.1 and ::1 only
- Peer auth for local unix socket connections
- No TCP password configured (not needed — local only)

## Timezone
```bash
sudo timedatectl set-timezone Europe/Paris
psql -d openclaw_db -c "SHOW timezone;"
```

---

## Connection

**Node.js (Linux):**
```javascript
import pg from 'pg';
const pool = new pg.Pool({ database: 'openclaw_db', host: '/var/run/postgresql' });
```

**Node.js (macOS/Homebrew):**
```javascript
import pg from 'pg';
const pool = new pg.Pool({ database: 'openclaw_db', host: '/tmp' });
```

**CLI (both):**
```bash
psql -d openclaw_db
```

---

## Tools

| Script | Purpose |
|--------|---------|
| `tools/pg-import-memories.mjs` | Import markdown → Postgres with embeddings |
| `tools/pg-memory.mjs` | Search/insert/log helper |
| `tools/workflow-runner.mjs` | Register/run/status workflows |
| `tools/agent-levels.mjs` | Agent leveling system |
| `tools/cost-tracker.mjs` | Cost monitoring |

---

## Embeddings
- Model: `text-embedding-3-small` (OpenAI)
- Dimensions: 1536
- Index: IVFFlat (cosine) — rebuild with more lists once >1000 rows
- Cost: ~€0.01/1000 chunks

---

## Backup

Daily backup via `scripts/backup-openclaw.sh`:
- `pg-YYYY-MM-DD.sql.gz` — Full `pg_dump`
- Keeps 14 daily + 4 weekly backups

```bash
# Manual backup
pg_dump -h /var/run/postgresql openclaw_db | gzip > pg-$(date +%Y-%m-%d).sql.gz
```
