# Change Report: Fix goal_weight_lbs Column Migration

## Executive Summary

The previous commit (`9af527d`) added `goal_weight_lbs` to the SQLAlchemy `User` model but relied on `Base.metadata.create_all()` to create the column. `create_all()` only creates **new tables** — it never adds columns to existing tables. This caused every query against the `users` table to fail with an `OperationalError: no such column: users.goal_weight_lbs`, which broke:

- Profile loading (GET /profile → 500)
- All authenticated endpoints (get_current_user queries users table)
- The entire profile page: no account data, no logout button visible (page stuck or errored)

## Root Cause

`Base.metadata.create_all(bind=engine)` is a no-op for tables that already exist. The `goal_weight_lbs` column was added to the Python model but never to the physical SQLite database. SQLAlchemy generates SQL like `SELECT users.goal_weight_lbs ...` which fails when the column doesn't exist.

## Files Changed

| File | Change |
|------|--------|
| `Backend/main.py` | Added `_ensure_columns()` migration function (lines 285-294) |

## What Was Added

A lightweight column migration that runs at startup, immediately after `create_all()`:

1. Uses `sqlalchemy.inspect(engine)` to read actual column names from the `users` table
2. If `goal_weight_lbs` is missing, runs `ALTER TABLE users ADD COLUMN goal_weight_lbs REAL`
3. Wrapped in `engine.begin()` for proper transaction handling
4. Works for both SQLite and PostgreSQL

## What Was NOT Changed

- No frontend changes
- No schema changes (the model already had the column from the previous commit)
- No data loss — existing rows get `NULL` for the new column, which is correct (`nullable=True`)

## QA Violations in Previous Commit

Per CLAUDE.md QA Standards, the previous commit (`9af527d`) violated:

1. **Functional Testing**: "Any feature that reads from the database must be tested with empty data, partial data, and full data" — not tested against an existing DB missing the column
2. **Integration Testing**: "Any feature that touches existing functionality must be regression tested to confirm nothing broke" — adding a column to User affects all user queries
3. **Edge Cases**: "What happens when the backend returns an unexpected response" — the 500 errors from missing column were not caught

## Verification Steps Performed

1. `python -m py_compile Backend/main.py` — passes
2. `npx tsc --noEmit` — passes
3. `npm run build` — compiles successfully, all 16 pages generated
4. `git diff` — only Backend/main.py modified, 12 lines added
5. No unstaged dependencies — the change is self-contained in Backend/main.py

## Lesson Learned

Any time a new column is added to an existing SQLAlchemy model, a corresponding `_ensure_columns()` migration entry MUST be added. `create_all()` is not sufficient for schema evolution on existing tables.
