#!/bin/bash
# Description: Generates a compact, versioned JSON summary for a Telegram topic.

# --- Arguments ---
TOPIC_ID=$1
MESSAGE_LIMIT=25

# --- File Paths ---
CONTEXT_DIR="memory/context/telegram"
CONTEXT_FILE="${CONTEXT_DIR}/topic_${TOPIC_ID}.json"
TEMP_HISTORY_FILE="/tmp/topic_${TOPIC_ID}_history.txt"

# --- Pre-computation ---
# Get DB name from env var, default to openclaw_db
DB_NAME="${OPENCLAW_DB_NAME:-openclaw_db}"

# --- Logic ---

# 1. Ensure context directory exists.
mkdir -p $CONTEXT_DIR

# 2. Get recent message history.
# This query needs to be adapted to the actual schema. Assuming a 'messages' table.
# The output format should be simple text for the LLM to parse easily.
psql -d "${DB_NAME}" -t -A -F'|' -c "SELECT to_char(created_at, 'YYYY-MM-DD HH24:MI'), sender_id, message FROM messages WHERE channel_id = 'telegram:${TOPIC_ID}' ORDER BY created_at DESC LIMIT ${MESSAGE_LIMIT}" > ${TEMP_HISTORY_FILE}


# 3. Read the existing JSON context.
OLD_CONTEXT_JSON="{}"
if [ -f "$CONTEXT_FILE" ]; then
    OLD_CONTEXT_JSON=$(cat "$CONTEXT_FILE")
fi

# 4. Prepare the JSON-focused summarization task.
TASK_PROMPT="
You are a context summarizer agent. Your sole purpose is to update a JSON context object.
- Analyze the previous JSON context and the new messages.
- Return ONLY the updated, raw JSON object. Do not include any explanations, code blocks, or markdown.
- The schema must be: {version, last_updated_utc, source_topic_id, summary: {current_focus, key_decisions, pending_actions, active_tasks_mentioned}}.
- Increment the version number from the previous context.

**Previous JSON Context:**
\`\`\`json
${OLD_CONTEXT_JSON}
\`\`\`

**New Messages (most recent first, format: timestamp|sender|message):**
\`\`\`
$(cat ${TEMP_HISTORY_FILE})
\`\`\`

Generate the updated raw JSON now.
"

# 5. Spawn a low-cost sub-agent to get the new JSON.
# We'll use a general-purpose agent for this and rely on the prompt.
# Note: The 'sessions_spawn' tool is not directly available in shell scripts.
# This part is illustrative; a wrapper or direct API call would be needed to invoke the agent.
# For now, we'll simulate this by calling a placeholder script.
# In a real scenario, this would be an API call to the OpenClaw gateway.
echo "{\"version\": 1, \"last_updated_utc\": \"$(date -u +'%Y-%m-%dT%H:%M:%SZ')\", \"source_topic_id\": ${TOPIC_ID}, \"summary\": {\"current_focus\": \"Placeholder for AI summary\", \"key_decisions\": [], \"pending_actions\": [], \"active_tasks_mentioned\": []}}" > "${CONTEXT_FILE}.tmp"
# NEW_CONTEXT_JSON=$(openclaw-agent-run --model="haiku" --prompt="${TASK_PROMPT}")


# 6. Validate and write the new summary.
# This is a placeholder for the real agent's output
NEW_CONTEXT_JSON=$(cat "${CONTEXT_FILE}.tmp")

if [[ -n "$NEW_CONTEXT_JSON" && "$NEW_CONTEXT_JSON" == {* ]]; then
    echo "${NEW_CONTEXT_JSON}" > ${CONTEXT_FILE}
else
    echo "Error: Agent returned invalid JSON."
    rm "${CONTEXT_FILE}.tmp"
    exit 1
fi

# 7. Add and commit the change to Git.
git add ${CONTEXT_FILE}
git commit -m "ctx: update telegram topic ${TOPIC_ID}" --author="Kevin <kevin@openclaw.ai>"

# 8. Clean up.
rm ${TEMP_HISTORY_FILE}
rm "${CONTEXT_FILE}.tmp"

echo "Context for topic ${TOPIC_ID} has been updated and versioned."
