"""Startup script: ensures DB columns exist, then starts uvicorn."""
import sys
import os

from sqlalchemy import create_engine, text, inspect

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./foodenough.db")


def ensure_columns():
    """Add any missing columns to existing tables (safe to run repeatedly)."""
    engine = create_engine(DATABASE_URL)
    is_sqlite = DATABASE_URL.startswith("sqlite")
    pk_type = "INTEGER PRIMARY KEY AUTOINCREMENT" if is_sqlite else "SERIAL PRIMARY KEY"
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

            if "is_premium" not in user_cols:
                print("[STARTUP] Adding is_premium to users...", flush=True)
                conn.execute(text("ALTER TABLE users ADD COLUMN is_premium INTEGER DEFAULT 1"))

            conn.commit()

        # Check food_logs table columns
        if insp.has_table("food_logs"):
            log_cols = {c["name"] for c in insp.get_columns("food_logs")}

            if "meal_type" not in log_cols:
                print("[STARTUP] Adding meal_type to food_logs...", flush=True)
                conn.execute(text("ALTER TABLE food_logs ADD COLUMN meal_type VARCHAR"))
                conn.commit()

        # Create ANI tables if missing
        if not insp.has_table("ani_recalibrations"):
            print("[STARTUP] Creating ani_recalibrations table...", flush=True)
            conn.execute(text(f"""
                CREATE TABLE ani_recalibrations (
                    id {pk_type},
                    user_id INTEGER NOT NULL REFERENCES users(id),
                    created_at TIMESTAMP,
                    period_start TIMESTAMP NOT NULL,
                    period_end TIMESTAMP NOT NULL,
                    prev_calorie_goal INTEGER NOT NULL,
                    prev_protein_goal INTEGER NOT NULL,
                    prev_carbs_goal INTEGER NOT NULL,
                    prev_fat_goal INTEGER NOT NULL,
                    new_calorie_goal INTEGER NOT NULL,
                    new_protein_goal INTEGER NOT NULL,
                    new_carbs_goal INTEGER NOT NULL,
                    new_fat_goal INTEGER NOT NULL,
                    analysis_json TEXT,
                    reasoning TEXT NOT NULL
                )
            """))
            conn.execute(text("CREATE INDEX ix_ani_recalibrations_user_id ON ani_recalibrations (user_id)"))
            conn.commit()

        if not insp.has_table("ani_insights"):
            print("[STARTUP] Creating ani_insights table...", flush=True)
            conn.execute(text(f"""
                CREATE TABLE ani_insights (
                    id {pk_type},
                    user_id INTEGER NOT NULL REFERENCES users(id),
                    recalibration_id INTEGER REFERENCES ani_recalibrations(id),
                    created_at TIMESTAMP,
                    insight_type VARCHAR NOT NULL,
                    title VARCHAR NOT NULL,
                    body TEXT NOT NULL
                )
            """))
            conn.execute(text("CREATE INDEX ix_ani_insights_user_id ON ani_insights (user_id)"))
            conn.commit()

        if not insp.has_table("health_metrics"):
            print("[STARTUP] Creating health_metrics table...", flush=True)
            conn.execute(text(f"""
                CREATE TABLE health_metrics (
                    id {pk_type},
                    user_id INTEGER NOT NULL REFERENCES users(id),
                    date VARCHAR NOT NULL,
                    total_expenditure FLOAT,
                    active_calories FLOAT,
                    resting_calories FLOAT,
                    steps INTEGER,
                    source VARCHAR DEFAULT 'manual',
                    created_at TIMESTAMP,
                    updated_at TIMESTAMP
                )
            """))
            conn.execute(text("CREATE INDEX ix_health_metrics_user_id ON health_metrics (user_id)"))
            conn.execute(text("CREATE UNIQUE INDEX ix_health_metrics_user_date ON health_metrics (user_id, date)"))
            conn.commit()

        print("[STARTUP] Database columns verified.", flush=True)

    engine.dispose()


if __name__ == "__main__":
    ensure_columns()

    # Start uvicorn
    port = os.getenv("PORT", "8000")
    os.execvp(sys.executable, [sys.executable, "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", port])
