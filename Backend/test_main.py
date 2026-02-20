"""
FoodEnough backend test suite.
Run with: pytest test_main.py -v

Uses an isolated on-disk SQLite test database that is created fresh before
each test and dropped afterwards, so tests never touch foodenough.db.
"""

import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Point to a separate test database before importing main so the
# module-level engine is not used in tests.
os.environ.setdefault("DATABASE_URL", "sqlite:///./test_foodenough.db")
os.environ.setdefault("OPENAI_API_KEY", "test-key-not-used")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-pytest")

from main import app, Base, get_db  # noqa: E402

# ---------------------------------------------------------------------------
# Test database setup
# ---------------------------------------------------------------------------
TEST_DB_URL = "sqlite:///./test_foodenough.db"
test_engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)


@pytest.fixture(autouse=True)
def fresh_db():
    """Drop and recreate all tables before each test for full isolation."""
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def register(email="test@example.com", password="password123"):
    return client.post("/auth/register", json={"email": email, "password": password})


def login(email="test@example.com", password="password123"):
    return client.post("/auth/login", json={"email": email, "password": password})


def auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def get_token(email="test@example.com", password="password123") -> str:
    register(email, password)
    res = login(email, password)
    return res.json()["access_token"]


# ---------------------------------------------------------------------------
# Auth tests
# ---------------------------------------------------------------------------
class TestRegister:
    def test_register_success(self):
        res = register()
        assert res.status_code == 200
        assert "access_token" in res.json()

    def test_register_duplicate_email(self):
        register()
        res = register()
        assert res.status_code == 400
        assert "already registered" in res.json()["detail"].lower()

    def test_register_short_password(self):
        res = client.post("/auth/register", json={"email": "a@b.com", "password": "short"})
        assert res.status_code == 400

    def test_register_invalid_email(self):
        res = client.post("/auth/register", json={"email": "not-an-email", "password": "password123"})
        assert res.status_code == 422


class TestLogin:
    def test_login_success(self):
        register()
        res = login()
        assert res.status_code == 200
        assert "access_token" in res.json()

    def test_login_wrong_password(self):
        register()
        res = client.post("/auth/login", json={"email": "test@example.com", "password": "wrongpass"})
        assert res.status_code == 401

    def test_login_unknown_email(self):
        res = client.post("/auth/login", json={"email": "nobody@example.com", "password": "password123"})
        assert res.status_code == 401

    def test_login_email_case_insensitive(self):
        register(email="Case@Example.COM")
        res = client.post("/auth/login", json={"email": "case@example.com", "password": "password123"})
        assert res.status_code == 200


class TestPasswordReset:
    def test_forgot_password_always_returns_generic(self):
        # Should return 200 regardless of whether the email exists
        res = client.post("/auth/forgot-password", json={"email": "nobody@example.com"})
        assert res.status_code == 200
        assert "message" in res.json()

    def test_forgot_password_known_email(self):
        register()
        res = client.post("/auth/forgot-password", json={"email": "test@example.com"})
        assert res.status_code == 200


# ---------------------------------------------------------------------------
# Food log tests (use /logs/save-parsed to avoid OpenAI calls)
# ---------------------------------------------------------------------------
class TestFoodLogs:
    def _save_log(self, token: str, text="chicken and rice", calories=500):
        return client.post(
            "/logs/save-parsed",
            json={
                "input_text": text,
                "calories": calories,
                "protein": 40.0,
                "carbs": 50.0,
                "fat": 10.0,
            },
            headers=auth_header(token),
        )

    def test_save_log_success(self):
        token = get_token()
        res = self._save_log(token)
        assert res.status_code == 200
        assert res.json()["status"] == "success"
        assert "entry_id" in res.json()

    def test_save_log_requires_auth(self):
        res = client.post(
            "/logs/save-parsed",
            json={"input_text": "food", "calories": 100, "protein": 10, "carbs": 10, "fat": 5},
        )
        assert res.status_code == 403

    def test_get_today_logs(self):
        token = get_token()
        self._save_log(token, "breakfast", 300)
        self._save_log(token, "lunch", 600)
        res = client.get("/logs/today", headers=auth_header(token))
        assert res.status_code == 200
        assert len(res.json()["logs"]) == 2

    def test_get_week_logs(self):
        token = get_token()
        self._save_log(token)
        res = client.get("/logs/week", headers=auth_header(token))
        assert res.status_code == 200
        assert len(res.json()["logs"]) == 1

    def test_delete_log(self):
        token = get_token()
        save_res = self._save_log(token)
        log_id = save_res.json()["entry_id"]
        del_res = client.delete(f"/logs/{log_id}", headers=auth_header(token))
        assert del_res.status_code == 200
        assert del_res.json()["status"] == "deleted"
        # Verify gone
        logs = client.get("/logs/today", headers=auth_header(token)).json()["logs"]
        assert len(logs) == 0

    def test_delete_log_wrong_user(self):
        token_a = get_token("a@example.com")
        token_b = get_token("b@example.com")
        log_id = self._save_log(token_a).json()["entry_id"]
        res = client.delete(f"/logs/{log_id}", headers=auth_header(token_b))
        assert res.status_code == 404

    def test_data_isolation_today(self):
        token_a = get_token("a@example.com")
        token_b = get_token("b@example.com")
        self._save_log(token_a, "user a food")
        logs_b = client.get("/logs/today", headers=auth_header(token_b)).json()["logs"]
        assert len(logs_b) == 0

    def test_negative_macros_rejected(self):
        token = get_token()
        res = client.post(
            "/logs/save-parsed",
            json={"input_text": "food", "calories": -100, "protein": 10, "carbs": 10, "fat": 5},
            headers=auth_header(token),
        )
        assert res.status_code == 422


# ---------------------------------------------------------------------------
# Profile tests
# ---------------------------------------------------------------------------
class TestProfile:
    def test_get_profile(self):
        token = get_token()
        res = client.get("/profile", headers=auth_header(token))
        assert res.status_code == 200
        data = res.json()
        assert data["email"] == "test@example.com"
        assert data["calorie_goal"] is None

    def test_update_profile_goals(self):
        token = get_token()
        res = client.put(
            "/profile",
            json={"calorie_goal": 2000, "protein_goal": 150, "carbs_goal": 200, "fat_goal": 65},
            headers=auth_header(token),
        )
        assert res.status_code == 200
        data = res.json()
        assert data["calorie_goal"] == 2000
        assert data["protein_goal"] == 150

    def test_profile_requires_auth(self):
        res = client.get("/profile")
        assert res.status_code == 403


# ---------------------------------------------------------------------------
# Weight tests
# ---------------------------------------------------------------------------
class TestWeight:
    def test_log_weight(self):
        token = get_token()
        res = client.post("/weight", json={"weight_lbs": 175.5}, headers=auth_header(token))
        assert res.status_code == 200
        assert res.json()["weight_lbs"] == 175.5

    def test_weight_history(self):
        token = get_token()
        client.post("/weight", json={"weight_lbs": 175.0}, headers=auth_header(token))
        client.post("/weight", json={"weight_lbs": 174.5}, headers=auth_header(token))
        res = client.get("/weight/history", headers=auth_header(token))
        assert res.status_code == 200
        assert len(res.json()["entries"]) == 2

    def test_invalid_weight_rejected(self):
        token = get_token()
        res = client.post("/weight", json={"weight_lbs": -5}, headers=auth_header(token))
        assert res.status_code == 422

    def test_weight_isolation(self):
        token_a = get_token("a@example.com")
        token_b = get_token("b@example.com")
        client.post("/weight", json={"weight_lbs": 180.0}, headers=auth_header(token_a))
        entries_b = client.get("/weight/history", headers=auth_header(token_b)).json()["entries"]
        assert len(entries_b) == 0


# ---------------------------------------------------------------------------
# Workout tests
# ---------------------------------------------------------------------------
class TestWorkouts:
    def test_log_workout(self):
        token = get_token()
        res = client.post(
            "/workouts",
            json={"name": "Push Day", "notes": "Felt strong"},
            headers=auth_header(token),
        )
        assert res.status_code == 200
        assert "workout_id" in res.json()

    def test_workout_history(self):
        token = get_token()
        client.post("/workouts", json={"name": "Leg Day"}, headers=auth_header(token))
        res = client.get("/workouts/history", headers=auth_header(token))
        assert res.status_code == 200
        assert len(res.json()["workouts"]) == 1

    def test_delete_workout(self):
        token = get_token()
        wid = client.post("/workouts", json={"name": "Pull Day"}, headers=auth_header(token)).json()["workout_id"]
        res = client.delete(f"/workouts/{wid}", headers=auth_header(token))
        assert res.status_code == 200
        assert client.get("/workouts/history", headers=auth_header(token)).json()["workouts"] == []

    def test_delete_workout_wrong_user(self):
        token_a = get_token("a@example.com")
        token_b = get_token("b@example.com")
        wid = client.post("/workouts", json={"name": "Test"}, headers=auth_header(token_a)).json()["workout_id"]
        res = client.delete(f"/workouts/{wid}", headers=auth_header(token_b))
        assert res.status_code == 404


# ---------------------------------------------------------------------------
# Account deletion tests
# ---------------------------------------------------------------------------
class TestAccountDeletion:
    def test_delete_account(self):
        token = get_token()
        res = client.delete("/auth/account", headers=auth_header(token))
        assert res.status_code == 200
        assert res.json()["status"] == "deleted"
        # Token is now invalid
        res2 = client.get("/profile", headers=auth_header(token))
        assert res2.status_code == 401

    def test_delete_account_cascades_logs(self):
        token = get_token()
        client.post(
            "/logs/save-parsed",
            json={"input_text": "food", "calories": 100, "protein": 10, "carbs": 10, "fat": 5},
            headers=auth_header(token),
        )
        client.delete("/auth/account", headers=auth_header(token))
        # Re-register with same email should work (data wiped)
        res = register()
        assert res.status_code == 200
