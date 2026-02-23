#!/usr/bin/env bash
# ============================================================
# FoodEnough Automated Audit System
# ------------------------------------------------------------
# Runs 4 audit rounds, 2 hours apart, over ~8 hours.
# Each round performs a full QA audit, writes a markdown report,
# and implements the top 3 highest-priority fixes.
#
# Usage:  ./run-audit.sh
# Output: audit-logs/round-{1..4}-{timestamp}.md
#         audit-logs/round-{1..4}-{timestamp}-raw.txt
# ============================================================

set -euo pipefail

# Unset to allow claude -p to run (blocked inside existing Claude Code sessions)
unset CLAUDECODE 2>/dev/null || true

AUDIT_DIR="$(cd "$(dirname "$0")" && pwd)/audit-logs"
ROUNDS=4
INTERVAL_SECONDS=7200  # 2 hours

mkdir -p "$AUDIT_DIR"

echo "========================================"
echo "  FoodEnough Automated Audit"
echo "  Rounds: $ROUNDS | Interval: $((INTERVAL_SECONDS / 60)) min"
echo "  Reports: $AUDIT_DIR"
echo "========================================"
echo ""

for round in $(seq 1 $ROUNDS); do
  TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
  REPORT_FILE="$AUDIT_DIR/round-${round}-${TIMESTAMP}.md"
  RAW_FILE="$AUDIT_DIR/round-${round}-${TIMESTAMP}-raw.txt"

  # Gather previous round context (if any)
  PREV_CONTEXT=""
  if [ "$round" -gt 1 ]; then
    PREV_REPORT=$(ls -t "$AUDIT_DIR"/round-*.md 2>/dev/null | head -1)
    if [ -n "$PREV_REPORT" ]; then
      PREV_CONTEXT="

=== PREVIOUS ROUND REPORT ===
Pay close attention to the 'Remaining Items for Next Round' section and prioritize fixing those items first.

$(cat "$PREV_REPORT")

=== END PREVIOUS ROUND REPORT ==="
    fi
  fi

  echo "[$TIMESTAMP] Starting Round $round of $ROUNDS..."

  # Run the audit via Claude non-interactive mode
  claude -p "You are performing a comprehensive audit of the FoodEnough web application (FastAPI backend in Backend/ + Next.js frontend in Frontend/). This is audit round $round of $ROUNDS. Be extremely thorough and detailed in your report.

PHASE 1 - QA TESTING:
- Test every backend endpoint by reading the source code and tracing the logic (auth, food logs, workouts, weight, goals, macros, profile, delete account, email verification, password reset, plan generation)
- For each endpoint, verify: correct HTTP method, input validation, authentication checks, proper error responses, edge cases
- Test with valid and invalid inputs — trace what happens with missing fields, wrong types, boundary values
- Test with and without JWT tokens — verify all protected routes return 401 when unauthenticated
- Test data isolation between users — verify no endpoint leaks data across user boundaries
- Check for missing error handling — unhandled exceptions, bare .json() calls, missing try/catch
- List every endpoint tested and what you found

PHASE 2 - RECOMMENDATIONS:
- Security issues with severity rating (Critical/High/Medium/Low) — explain the problem, the risk, and the suggested fix for each
- Performance concerns — N+1 queries, unnecessary re-renders, missing indexes, slow operations, synchronous blocking
- UX improvements — loading states, error messages, accessibility (ARIA), mobile responsiveness, user flow friction
- Code quality issues — code duplication, missing types, inconsistent patterns, dead code, TODO items

PHASE 3 - IMPLEMENTATION:
- Pick the top 3 most critical issues found in Phase 1 and Phase 2 and fix them directly in the codebase
- For each fix, document: what file was changed, what the old code did, what the new code does, and why the change was necessary

Write the full report as a markdown file with this exact structure:

# FoodEnough Audit - Round $round
**Date:** $(date +"%Y-%m-%d %H:%M")

## Executive Summary
(3-5 sentences: overall findings, critical issues count, what was fixed, overall trajectory)

## Endpoints Tested
(Markdown table with columns: Endpoint, Method, Test Case, Result (PASS/FAIL/WARN), Notes)
(Include EVERY endpoint — do not skip any)

## Issues Found
(Markdown table with columns: ID, Severity, Category, Description, Affected File(s), Risk)
(Number issues sequentially: R${round}-001, R${round}-002, etc.)

## Recommendations

### Security
(Detailed paragraph for each security recommendation — explain problem, risk, and fix)

### Performance
(Detailed paragraph for each performance recommendation)

### UX
(Detailed paragraph for each UX recommendation)

### Code Quality
(Detailed paragraph for each code quality recommendation)

## Changes Implemented

### Fix 1: [title]
**Issue:** (what was wrong)
**Risk:** (what could go wrong if not fixed)
**File(s):** (files changed)
**Before:** (code snippet of old code)
**After:** (code snippet of new code)
**Why:** (explanation of why this fix is correct)

### Fix 2: [title]
(same structure)

### Fix 3: [title]
(same structure)

## Remaining Items for Next Round
(All issues not yet addressed, ordered by priority — highest first)

## Overall Health Score: X/10
(Justify the score based on security posture, code quality, test coverage, UX polish, and production readiness)
$PREV_CONTEXT" > "$RAW_FILE" 2>&1

  # Extract the markdown report from raw output
  cp "$RAW_FILE" "$REPORT_FILE"

  echo "[$TIMESTAMP] Round $round complete."
  echo "  Report: $REPORT_FILE"
  echo "  Raw:    $RAW_FILE"
  echo ""

  # Wait before next round (skip wait after final round)
  if [ "$round" -lt "$ROUNDS" ]; then
    NEXT_TIME=$(date -d "+${INTERVAL_SECONDS} seconds" +"%H:%M:%S" 2>/dev/null || date -v+${INTERVAL_SECONDS}S +"%H:%M:%S" 2>/dev/null || echo "~2 hours")
    echo "  Next round at: $NEXT_TIME"
    echo "  Waiting $((INTERVAL_SECONDS / 60)) minutes..."
    echo ""
    sleep "$INTERVAL_SECONDS"
  fi
done

echo "========================================"
echo "  All $ROUNDS audit rounds complete!"
echo "  Reports saved to: $AUDIT_DIR"
echo "========================================"
