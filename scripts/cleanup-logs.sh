#!/bin/bash
# OpenClaw log cleanup — keeps 7 days of file logs
# Run daily via cron

LOG_DIR="/tmp/openclaw"

# Delete log files older than 7 days
find "$LOG_DIR" -name "openclaw-*.log" -mtime +7 -delete 2>/dev/null

# Compress logs older than 1 day (skip today's)
find "$LOG_DIR" -name "openclaw-*.log" -mtime +1 ! -name "*.gz" -exec gzip {} \; 2>/dev/null

# Trim journald for our user (keeps 50MB max)
journalctl --user --vacuum-size=50M 2>/dev/null

echo "$(date -u '+%Y-%m-%d %H:%M UTC') — Log cleanup done"
