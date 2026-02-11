#!/usr/bin/env node
// X Search via xAI Responses API — uses native x_search server-side tool
// Usage: node x-search.mjs "query" [--handles user1,user2] [--from YYYY-MM-DD] [--to YYYY-MM-DD]

import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

function getApiKey() {
  const authPath = join(homedir(), '.openclaw/agents/main/agent/auth-profiles.json');
  const auth = JSON.parse(readFileSync(authPath, 'utf8'));
  return auth.profiles['xai:default']?.key;
}

const args = process.argv.slice(2);
let query = '', handles = [], fromDate = null, toDate = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--handles' && args[i+1]) { handles = args[++i].split(','); }
  else if (args[i] === '--from' && args[i+1]) { fromDate = args[++i]; }
  else if (args[i] === '--to' && args[i+1]) { toDate = args[++i]; }
  else if (!args[i].startsWith('--')) { query += (query ? ' ' : '') + args[i]; }
}

if (!query) {
  console.error('Usage: node x-search.mjs "query" [--handles user1,user2] [--from YYYY-MM-DD] [--to YYYY-MM-DD]');
  process.exit(1);
}

const apiKey = getApiKey();

// Build x_search tool for Responses API
const xSearchTool = { type: 'x_search' };
if (handles.length) xSearchTool.allowed_x_handles = handles;
if (fromDate) xSearchTool.from_date = fromDate;
if (toDate) xSearchTool.to_date = toDate;

const body = {
  model: 'grok-4-fast',
  input: [
    { role: 'system', content: 'You are a research assistant. Search X (Twitter) and return structured findings. Include: post text, author handle, date, engagement metrics if visible, and direct links. Format as a clear report.' },
    { role: 'user', content: query }
  ],
  tools: [xSearchTool],
  temperature: 0,
};

const resp = await fetch('https://api.x.ai/v1/responses', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(body),
});

if (!resp.ok) {
  const err = await resp.text();
  console.error(`API error ${resp.status}: ${err}`);
  process.exit(1);
}

const data = await resp.json();

// Extract text output from responses API
if (data.output) {
  for (const item of data.output) {
    if (item.type === 'message' && item.content) {
      for (const c of item.content) {
        if (c.type === 'output_text') console.log(c.text);
      }
    }
  }
  // Print citations if any
  if (data.output.some(o => o.type === 'x_search_call')) {
    console.log('\n--- X Search Results Used ---');
    for (const item of data.output) {
      if (item.type === 'x_search_call') {
        console.log(`Query: ${item.query || JSON.stringify(item)}`);
      }
    }
  }
} else {
  console.log(JSON.stringify(data, null, 2));
}
