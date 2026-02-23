"""Startup script: ensures DB columns exist, then starts uvicorn."""
import sys
import os

from sqlalchemy import create_engine, text, inspect

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./foodenough.db")


def ensure_columns():
    """Add any missing columns to existing tables (safe to run repeatedly)."""
    if DATABASE_URL.startswith("sqlite"):
        return  # SQLite uses create_all in main.py

    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        insp = inspect(engine)

        # Check users table columns
        if insp.has_table("users"):
            user_cols = {c["name"] for c in insp.get_columns("users")}

            if "is_verified" not in user_cols:
                print("[STARTUP] Adding is_verified to users...", flush=True)
                conn.execute(text("ALTER TABLE users ADD COLUMN is_verified INTEGER DEFAULT 0"))

            if "verification_token" not in user_cols:
                print("[STARTUP] Adding verification_token to users...", flush=True)
                conn.execute(text("ALTER TABLE users ADD COLUMN verification_token VARCHAR"))

            conn.commit()

        # Check food_logs table columns
        if insp.has_table("food_logs"):
            log_cols = {c["name"] for c in insp.get_columns("food_logs")}

            if "meal_type" not in log_cols:
                print("[STARTUP] Adding meal_type to food_logs...", flush=True)
                conn.execute(text("ALTER TABLE food_logs ADD COLUMN meal_type VARCHAR"))
                conn.commit()

        print("[STARTUP] Database columns verified.", flush=True)

    engine.dispose()


if __name__ == "__main__":
    ensure_columns()

    # Start uvicorn
    port = os.getenv("PORT", "8000")
    os.execvp(sys.executable, [sys.executable, "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", port])
