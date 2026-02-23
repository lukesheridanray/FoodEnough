"""Startup script: runs Alembic migrations safely, then starts uvicorn."""
import subprocess
import sys
import os

from sqlalchemy import create_engine, text

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./foodenough.db")

def stamp_if_needed():
    """If tables exist but alembic_version doesn't, stamp to 001 so migrations 002+ can run."""
    if DATABASE_URL.startswith("sqlite"):
        return  # SQLite uses create_all, skip migrations

    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        # Check if alembic_version table exists
        result = conn.execute(text(
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'alembic_version')"
        ))
        has_alembic = result.scalar()

        if not has_alembic:
            # Tables exist from create_all but alembic hasn't been initialized
            # Check if users table exists (proof that create_all ran)
            result = conn.execute(text(
                "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')"
            ))
            has_users = result.scalar()

            if has_users:
                print("[STARTUP] Tables exist but no alembic_version. Stamping to 001...", flush=True)
                subprocess.run([sys.executable, "-m", "alembic", "stamp", "001"], check=True)
            else:
                print("[STARTUP] Fresh database, alembic will create everything.", flush=True)

    engine.dispose()

if __name__ == "__main__":
    stamp_if_needed()

    # Run pending migrations
    print("[STARTUP] Running alembic upgrade head...", flush=True)
    result = subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"])
    if result.returncode != 0:
        print("[STARTUP] WARNING: alembic upgrade failed, continuing anyway...", flush=True)

    # Start uvicorn
    port = os.getenv("PORT", "8000")
    os.execvp(sys.executable, [sys.executable, "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", port])
