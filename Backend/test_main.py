"""
FoodEnough backend test suite.
Run with: pytest test_main.py -v

Uses an isolated on-disk SQLite test database that is created fresh before
each test and dropped afterwards, so tests never touch foodenough.db.
"""

import os
import io
import json
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Point to a separate test database before importing main so the
# module-level engine is not used in tests.
os.environ.setdefault("DATABASE_URL", "sqlite:///./test_foodenough.db")
os.environ.setdefault("OPENAI_API_KEY", "test-key-not-used")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-pytest")

from main import app, Base, get_db, limiter  # noqa: E402

limiter.enabled = False

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


# ---------------------------------------------------------------------------
# Mock helpers for OpenAI
# ---------------------------------------------------------------------------
def _make_openai_response(content: str):
    mock_message = MagicMock()
    mock_message.content = content
    mock_choice = MagicMock()
    mock_choice.message = mock_message
    mock_response = MagicMock()
    mock_response.choices = [mock_choice]
    return mock_response


MOCK_FOOD_JSON = json.dumps({
    "items": [
        {"name": "grilled chicken", "calories": 250, "protein": 30, "carbs": 0, "fat": 6},
        {"name": "white rice", "calories": 200, "protein": 4, "carbs": 40, "fat": 1},
    ],
    "total": {"calories": 450, "protein": 34, "carbs": 40, "fat": 7},
})

MOCK_IMAGE_JSON = json.dumps({
    "description": "Grilled chicken with white rice and broccoli",
    "items": [
        {"name": "grilled chicken", "calories": 250, "protein": 30, "carbs": 0, "fat": 6},
        {"name": "white rice", "calories": 200, "protein": 4, "carbs": 40, "fat": 1},
        {"name": "broccoli", "calories": 50, "protein": 3, "carbs": 8, "fat": 0},
    ],
    "total": {"calories": 500, "protein": 37, "carbs": 48, "fat": 7},
})

MOCK_WORKOUT_PLAN_JSON = json.dumps({
    "name": "6-Week Strength Builder",
    "notes": "Progressive overload program for building strength.",
    "weeks": [
        {
            "week_number": 1,
            "sessions": [
                {
                    "day_number": 1,
                    "name": "Upper Body A",
                    "exercises": [
                        {"name": "Bench Press", "sets": 3, "reps": "8-10", "rest_seconds": 90},
                        {"name": "Barbell Row", "sets": 3, "reps": "8-10", "rest_seconds": 90},
                    ],
                },
                {
                    "day_number": 2,
                    "name": "Lower Body A",
                    "exercises": [
                        {"name": "Squat", "sets": 4, "reps": "6-8", "rest_seconds": 120},
                    ],
                },
            ],
        },
    ],
})

TINY_PNG = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01"
    b"\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00"
    b"\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00"
    b"\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82"
)


def _save_parsed_log(token, text="chicken and rice", calories=500):
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


def _create_fitness_profile(token):
    return client.put(
        "/fitness-profile",
        json={
            "gym_access": "full_gym",
            "goal": "build_muscle",
            "experience_level": "intermediate",
            "days_per_week": 4,
            "session_duration_minutes": 60,
            "limitations": None,
        },
        headers=auth_header(token),
    )


def _create_workout_plan_in_db(token):
    _create_fitness_profile(token)
    with patch("main.client.chat.completions.create", return_value=_make_openai_response(MOCK_WORKOUT_PLAN_JSON)):
        return client.post("/workout-plans/generate", headers=auth_header(token))


# ---------------------------------------------------------------------------
# POST /save_log tests (mocked OpenAI)
# ---------------------------------------------------------------------------
class TestSaveLogWithAI:
    @patch("main.client.chat.completions.create", return_value=_make_openai_response(MOCK_FOOD_JSON))
    def test_save_log_success(self, mock_openai):
        token = get_token()
        res = client.post("/save_log", json={"input_text": "chicken and rice"}, headers=auth_header(token))
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "success"
        assert "entry_id" in data
        mock_openai.assert_called_once()

    @patch("main.client.chat.completions.create", return_value=_make_openai_response(MOCK_FOOD_JSON))
    def test_save_log_persists_to_db(self, mock_openai):
        token = get_token()
        client.post("/save_log", json={"input_text": "chicken and rice"}, headers=auth_header(token))
        logs = client.get("/logs/today", headers=auth_header(token)).json()["logs"]
        assert len(logs) == 1
        assert logs[0]["calories"] == 450
        assert logs[0]["protein"] == 34

    def test_save_log_requires_auth(self):
        res = client.post("/save_log", json={"input_text": "chicken"})
        assert res.status_code in (401, 403)

    def test_save_log_blank_text(self):
        token = get_token()
        res = client.post("/save_log", json={"input_text": "   "}, headers=auth_header(token))
        assert res.status_code == 422

    @patch("main.client.chat.completions.create", return_value=_make_openai_response("this is not json"))
    def test_save_log_ai_invalid_json(self, mock_openai):
        token = get_token()
        res = client.post("/save_log", json={"input_text": "chicken"}, headers=auth_header(token))
        assert res.status_code == 500


# ---------------------------------------------------------------------------
# PUT /logs/{log_id} tests (mocked OpenAI)
# ---------------------------------------------------------------------------
class TestUpdateLogWithAI:
    @patch("main.client.chat.completions.create", return_value=_make_openai_response(MOCK_FOOD_JSON))
    def test_update_log_success(self, mock_openai):
        token = get_token()
        save_res = _save_parsed_log(token)
        log_id = save_res.json()["entry_id"]
        res = client.put(f"/logs/{log_id}", json={"input_text": "steak and potatoes"}, headers=auth_header(token))
        assert res.status_code == 200
        assert res.json()["status"] == "success"
        assert res.json()["entry_id"] == log_id
        mock_openai.assert_called_once()

    @patch("main.client.chat.completions.create", return_value=_make_openai_response(MOCK_FOOD_JSON))
    def test_update_log_values_changed(self, mock_openai):
        token = get_token()
        save_res = _save_parsed_log(token, calories=999)
        log_id = save_res.json()["entry_id"]
        client.put(f"/logs/{log_id}", json={"input_text": "steak"}, headers=auth_header(token))
        logs = client.get("/logs/today", headers=auth_header(token)).json()["logs"]
        updated = [l for l in logs if l["id"] == log_id][0]
        assert updated["calories"] == 450

    def test_update_log_not_found(self):
        token = get_token()
        res = client.put("/logs/99999", json={"input_text": "food"}, headers=auth_header(token))
        assert res.status_code == 404

    def test_update_log_wrong_user(self):
        token_a = get_token("a@example.com")
        token_b = get_token("b@example.com")
        log_id = _save_parsed_log(token_a).json()["entry_id"]
        res = client.put(f"/logs/{log_id}", json={"input_text": "food"}, headers=auth_header(token_b))
        assert res.status_code == 404

    def test_update_log_requires_auth(self):
        res = client.put("/logs/1", json={"input_text": "food"})
        assert res.status_code in (401, 403)

    @patch("main.client.chat.completions.create", return_value=_make_openai_response("not json at all"))
    def test_update_log_ai_invalid_json(self, mock_openai):
        token = get_token()
        log_id = _save_parsed_log(token).json()["entry_id"]
        res = client.put(f"/logs/{log_id}", json={"input_text": "food"}, headers=auth_header(token))
        assert res.status_code == 500


# ---------------------------------------------------------------------------
# POST /save_log/image tests (mocked OpenAI vision)
# ---------------------------------------------------------------------------
class TestSaveLogImage:
    @patch("main.client.chat.completions.create", return_value=_make_openai_response(MOCK_IMAGE_JSON))
    def test_save_log_image_success(self, mock_openai):
        token = get_token()
        res = client.post(
            "/save_log/image",
            files={"image": ("food.png", io.BytesIO(TINY_PNG), "image/png")},
            headers=auth_header(token),
        )
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "success"
        assert "entry_id" in data
        assert data["description"] == "Grilled chicken with white rice and broccoli"
        mock_openai.assert_called_once()

    @patch("main.client.chat.completions.create", return_value=_make_openai_response(MOCK_IMAGE_JSON))
    def test_save_log_image_persists(self, mock_openai):
        token = get_token()
        client.post(
            "/save_log/image",
            files={"image": ("food.png", io.BytesIO(TINY_PNG), "image/png")},
            headers=auth_header(token),
        )
        logs = client.get("/logs/today", headers=auth_header(token)).json()["logs"]
        assert len(logs) == 1
        assert logs[0]["calories"] == 500

    def test_save_log_image_requires_auth(self):
        res = client.post(
            "/save_log/image",
            files={"image": ("food.png", io.BytesIO(TINY_PNG), "image/png")},
        )
        assert res.status_code in (401, 403)

    def test_save_log_image_rejects_bad_content_type(self):
        token = get_token()
        res = client.post(
            "/save_log/image",
            files={"image": ("doc.pdf", io.BytesIO(b"%PDF-1.4"), "application/pdf")},
            headers=auth_header(token),
        )
        assert res.status_code == 400

    @patch("main.client.chat.completions.create", return_value=_make_openai_response("not json"))
    def test_save_log_image_ai_invalid_json(self, mock_openai):
        token = get_token()
        res = client.post(
            "/save_log/image",
            files={"image": ("food.png", io.BytesIO(TINY_PNG), "image/png")},
            headers=auth_header(token),
        )
        assert res.status_code == 500


# ---------------------------------------------------------------------------
# POST /parse_log/image tests (mocked OpenAI vision, no DB write)
# ---------------------------------------------------------------------------
class TestParseLogImage:
    @patch("main.client.chat.completions.create", return_value=_make_openai_response(MOCK_IMAGE_JSON))
    def test_parse_log_image_success(self, mock_openai):
        token = get_token()
        res = client.post(
            "/parse_log/image",
            files={"image": ("food.png", io.BytesIO(TINY_PNG), "image/png")},
            headers=auth_header(token),
        )
        assert res.status_code == 200
        data = res.json()
        assert data["description"] == "Grilled chicken with white rice and broccoli"
        assert len(data["items"]) == 3
        assert data["total"]["calories"] == 500
        mock_openai.assert_called_once()

    @patch("main.client.chat.completions.create", return_value=_make_openai_response(MOCK_IMAGE_JSON))
    def test_parse_log_image_does_not_persist(self, mock_openai):
        token = get_token()
        client.post(
            "/parse_log/image",
            files={"image": ("food.png", io.BytesIO(TINY_PNG), "image/png")},
            headers=auth_header(token),
        )
        logs = client.get("/logs/today", headers=auth_header(token)).json()["logs"]
        assert len(logs) == 0

    def test_parse_log_image_requires_auth(self):
        res = client.post(
            "/parse_log/image",
            files={"image": ("food.png", io.BytesIO(TINY_PNG), "image/png")},
        )
        assert res.status_code in (401, 403)

    def test_parse_log_image_rejects_bad_content_type(self):
        token = get_token()
        res = client.post(
            "/parse_log/image",
            files={"image": ("doc.txt", io.BytesIO(b"hello"), "text/plain")},
            headers=auth_header(token),
        )
        assert res.status_code == 400


# ---------------------------------------------------------------------------
# POST /workout-plans/generate tests (mocked OpenAI)
# ---------------------------------------------------------------------------
class TestGenerateWorkoutPlan:
    @patch("main.client.chat.completions.create", return_value=_make_openai_response(MOCK_WORKOUT_PLAN_JSON))
    def test_generate_plan_success(self, mock_openai):
        token = get_token()
        _create_fitness_profile(token)
        res = client.post("/workout-plans/generate", headers=auth_header(token))
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "success"
        assert "plan_id" in data
        mock_openai.assert_called_once()

    @patch("main.client.chat.completions.create", return_value=_make_openai_response(MOCK_WORKOUT_PLAN_JSON))
    def test_generate_plan_creates_sessions(self, mock_openai):
        token = get_token()
        _create_fitness_profile(token)
        client.post("/workout-plans/generate", headers=auth_header(token))
        active = client.get("/workout-plans/active", headers=auth_header(token)).json()["plan"]
        assert active is not None
        assert active["name"] == "6-Week Strength Builder"
        assert active["total_sessions"] == 2
        assert len(active["weeks"]) == 1
        assert len(active["weeks"][0]["sessions"]) == 2

    def test_generate_plan_requires_fitness_profile(self):
        token = get_token()
        res = client.post("/workout-plans/generate", headers=auth_header(token))
        assert res.status_code == 400
        assert "fitness profile" in res.json()["detail"].lower()

    def test_generate_plan_requires_auth(self):
        res = client.post("/workout-plans/generate")
        assert res.status_code in (401, 403)

    @patch("main.client.chat.completions.create", return_value=_make_openai_response("not valid json"))
    def test_generate_plan_ai_invalid_json(self, mock_openai):
        token = get_token()
        _create_fitness_profile(token)
        res = client.post("/workout-plans/generate", headers=auth_header(token))
        assert res.status_code == 500

    @patch("main.client.chat.completions.create", return_value=_make_openai_response(MOCK_WORKOUT_PLAN_JSON))
    def test_generate_plan_deactivates_previous(self, mock_openai):
        token = get_token()
        _create_fitness_profile(token)
        res1 = client.post("/workout-plans/generate", headers=auth_header(token))
        plan_id_1 = res1.json()["plan_id"]
        res2 = client.post("/workout-plans/generate", headers=auth_header(token))
        plan_id_2 = res2.json()["plan_id"]
        assert plan_id_1 != plan_id_2
        active = client.get("/workout-plans/active", headers=auth_header(token)).json()["plan"]
        assert active["id"] == plan_id_2


# ---------------------------------------------------------------------------
# GET /workout-plans/active tests
# ---------------------------------------------------------------------------
class TestGetActivePlan:
    def test_no_active_plan(self):
        token = get_token()
        res = client.get("/workout-plans/active", headers=auth_header(token))
        assert res.status_code == 200
        assert res.json()["plan"] is None

    def test_active_plan_returned(self):
        token = get_token()
        _create_workout_plan_in_db(token)
        res = client.get("/workout-plans/active", headers=auth_header(token))
        assert res.status_code == 200
        plan = res.json()["plan"]
        assert plan is not None
        assert plan["name"] == "6-Week Strength Builder"
        assert "weeks" in plan

    def test_active_plan_requires_auth(self):
        res = client.get("/workout-plans/active")
        assert res.status_code in (401, 403)

    def test_active_plan_isolation(self):
        token_a = get_token("a@example.com")
        token_b = get_token("b@example.com")
        _create_workout_plan_in_db(token_a)
        plan_b = client.get("/workout-plans/active", headers=auth_header(token_b)).json()["plan"]
        assert plan_b is None


# ---------------------------------------------------------------------------
# DELETE /workout-plans/{plan_id} tests
# ---------------------------------------------------------------------------
class TestDeactivateWorkoutPlan:
    def test_deactivate_plan_success(self):
        token = get_token()
        plan_res = _create_workout_plan_in_db(token)
        plan_id = plan_res.json()["plan_id"]
        res = client.delete(f"/workout-plans/{plan_id}", headers=auth_header(token))
        assert res.status_code == 200
        assert res.json()["status"] == "deactivated"
        active = client.get("/workout-plans/active", headers=auth_header(token)).json()["plan"]
        assert active is None

    def test_deactivate_plan_not_found(self):
        token = get_token()
        res = client.delete("/workout-plans/99999", headers=auth_header(token))
        assert res.status_code == 404

    def test_deactivate_plan_wrong_user(self):
        token_a = get_token("a@example.com")
        token_b = get_token("b@example.com")
        plan_id = _create_workout_plan_in_db(token_a).json()["plan_id"]
        res = client.delete(f"/workout-plans/{plan_id}", headers=auth_header(token_b))
        assert res.status_code == 404

    def test_deactivate_plan_requires_auth(self):
        res = client.delete("/workout-plans/1")
        assert res.status_code in (401, 403)


# ---------------------------------------------------------------------------
# PUT /plan-sessions/{session_id}/complete tests
# ---------------------------------------------------------------------------
class TestCompletePlanSession:
    def test_complete_session_success(self):
        token = get_token()
        _create_workout_plan_in_db(token)
        plan = client.get("/workout-plans/active", headers=auth_header(token)).json()["plan"]
        session_id = plan["weeks"][0]["sessions"][0]["id"]
        res = client.put(f"/plan-sessions/{session_id}/complete", headers=auth_header(token))
        assert res.status_code == 200
        assert res.json()["status"] == "completed"

    def test_complete_session_already_completed(self):
        token = get_token()
        _create_workout_plan_in_db(token)
        plan = client.get("/workout-plans/active", headers=auth_header(token)).json()["plan"]
        session_id = plan["weeks"][0]["sessions"][0]["id"]
        client.put(f"/plan-sessions/{session_id}/complete", headers=auth_header(token))
        res = client.put(f"/plan-sessions/{session_id}/complete", headers=auth_header(token))
        assert res.status_code == 200
        assert res.json()["status"] == "already_completed"

    def test_complete_session_not_found(self):
        token = get_token()
        res = client.put("/plan-sessions/99999/complete", headers=auth_header(token))
        assert res.status_code == 404

    def test_complete_session_wrong_user(self):
        token_a = get_token("a@example.com")
        token_b = get_token("b@example.com")
        _create_workout_plan_in_db(token_a)
        plan = client.get("/workout-plans/active", headers=auth_header(token_a)).json()["plan"]
        session_id = plan["weeks"][0]["sessions"][0]["id"]
        res = client.put(f"/plan-sessions/{session_id}/complete", headers=auth_header(token_b))
        assert res.status_code == 404

    def test_complete_session_updates_plan_count(self):
        token = get_token()
        _create_workout_plan_in_db(token)
        plan = client.get("/workout-plans/active", headers=auth_header(token)).json()["plan"]
        assert plan["completed_sessions"] == 0
        session_id = plan["weeks"][0]["sessions"][0]["id"]
        client.put(f"/plan-sessions/{session_id}/complete", headers=auth_header(token))
        plan = client.get("/workout-plans/active", headers=auth_header(token)).json()["plan"]
        assert plan["completed_sessions"] == 1


# ---------------------------------------------------------------------------
# GET /fitness-profile and PUT /fitness-profile tests
# ---------------------------------------------------------------------------
class TestFitnessProfile:
    def test_get_fitness_profile_none(self):
        token = get_token()
        res = client.get("/fitness-profile", headers=auth_header(token))
        assert res.status_code == 200
        assert res.json()["profile"] is None

    def test_create_fitness_profile(self):
        token = get_token()
        res = _create_fitness_profile(token)
        assert res.status_code == 200
        assert res.json()["status"] == "success"

    def test_get_fitness_profile_after_create(self):
        token = get_token()
        _create_fitness_profile(token)
        res = client.get("/fitness-profile", headers=auth_header(token))
        assert res.status_code == 200
        profile = res.json()["profile"]
        assert profile["gym_access"] == "full_gym"
        assert profile["goal"] == "build_muscle"
        assert profile["experience_level"] == "intermediate"
        assert profile["days_per_week"] == 4
        assert profile["session_duration_minutes"] == 60

    def test_update_fitness_profile_upsert(self):
        token = get_token()
        _create_fitness_profile(token)
        res = client.put(
            "/fitness-profile",
            json={
                "gym_access": "bodyweight",
                "goal": "lose_weight",
                "experience_level": "beginner",
                "days_per_week": 3,
                "session_duration_minutes": 30,
                "limitations": "bad knees",
            },
            headers=auth_header(token),
        )
        assert res.status_code == 200
        profile = client.get("/fitness-profile", headers=auth_header(token)).json()["profile"]
        assert profile["gym_access"] == "bodyweight"
        assert profile["days_per_week"] == 3
        assert profile["limitations"] == "bad knees"

    def test_fitness_profile_requires_auth(self):
        res = client.get("/fitness-profile")
        assert res.status_code in (401, 403)

    def test_fitness_profile_validation_days(self):
        token = get_token()
        res = client.put(
            "/fitness-profile",
            json={
                "gym_access": "full_gym",
                "goal": "build_muscle",
                "experience_level": "beginner",
                "days_per_week": 0,
                "session_duration_minutes": 60,
            },
            headers=auth_header(token),
        )
        assert res.status_code == 422

    def test_fitness_profile_validation_duration(self):
        token = get_token()
        res = client.put(
            "/fitness-profile",
            json={
                "gym_access": "full_gym",
                "goal": "build_muscle",
                "experience_level": "beginner",
                "days_per_week": 3,
                "session_duration_minutes": 5,
            },
            headers=auth_header(token),
        )
        assert res.status_code == 422

    def test_fitness_profile_isolation(self):
        token_a = get_token("a@example.com")
        token_b = get_token("b@example.com")
        _create_fitness_profile(token_a)
        profile_b = client.get("/fitness-profile", headers=auth_header(token_b)).json()["profile"]
        assert profile_b is None


# ---------------------------------------------------------------------------
# POST /profile/calculate-goals tests
# ---------------------------------------------------------------------------
class TestCalculateGoals:
    def test_calculate_goals_success(self):
        token = get_token()
        client.post("/weight", json={"weight_lbs": 180.0}, headers=auth_header(token))
        res = client.post(
            "/profile/calculate-goals",
            json={
                "age": 30,
                "sex": "M",
                "height_cm": 180.0,
                "activity_level": "moderate",
                "goal_type": "maintain",
            },
            headers=auth_header(token),
        )
        assert res.status_code == 200
        data = res.json()
        assert "calorie_goal" in data
        assert "protein_goal" in data
        assert "carbs_goal" in data
        assert "fat_goal" in data
        assert "tdee" in data
        assert "bmr" in data
        assert data["weight_lbs_used"] == 180.0
        assert data["calorie_goal"] > 0

    def test_calculate_goals_default_weight(self):
        token = get_token()
        res = client.post(
            "/profile/calculate-goals",
            json={
                "age": 25,
                "sex": "F",
                "height_cm": 165.0,
                "activity_level": "light",
                "goal_type": "lose",
            },
            headers=auth_header(token),
        )
        assert res.status_code == 200
        assert res.json()["weight_lbs_used"] == 154.0

    def test_calculate_goals_missing_fields(self):
        token = get_token()
        res = client.post(
            "/profile/calculate-goals",
            json={"age": 30},
            headers=auth_header(token),
        )
        assert res.status_code == 422

    def test_calculate_goals_saves_to_profile(self):
        token = get_token()
        client.post(
            "/profile/calculate-goals",
            json={
                "age": 30,
                "sex": "M",
                "height_cm": 175.0,
                "activity_level": "active",
                "goal_type": "gain",
            },
            headers=auth_header(token),
        )
        profile = client.get("/profile", headers=auth_header(token)).json()
        assert profile["calorie_goal"] is not None
        assert profile["calorie_goal"] > 0
        assert profile["age"] == 30
        assert profile["sex"] == "M"
        assert profile["activity_level"] == "active"
        assert profile["goal_type"] == "gain"

    def test_calculate_goals_requires_auth(self):
        res = client.post("/profile/calculate-goals", json={"age": 30})
        assert res.status_code in (401, 403)


# ---------------------------------------------------------------------------
# GET /summary/today tests
# ---------------------------------------------------------------------------
class TestTodaySummary:
    def test_summary_empty(self):
        token = get_token()
        res = client.get("/summary/today", headers=auth_header(token))
        assert res.status_code == 200
        data = res.json()
        assert data["calories_today"] == 0
        assert data["protein_today"] == 0
        assert data["calorie_goal"] is None
        assert data["calories_remaining"] is None
        assert data["latest_weight_lbs"] is None
        assert data["latest_workout_name"] is None

    def test_summary_with_data(self):
        token = get_token()
        client.put(
            "/profile",
            json={"calorie_goal": 2000, "protein_goal": 150, "carbs_goal": 200, "fat_goal": 65},
            headers=auth_header(token),
        )
        _save_parsed_log(token, "breakfast", 400)
        _save_parsed_log(token, "lunch", 600)
        client.post("/weight", json={"weight_lbs": 175.0}, headers=auth_header(token))
        client.post("/workouts", json={"name": "Push Day"}, headers=auth_header(token))
        res = client.get("/summary/today", headers=auth_header(token))
        assert res.status_code == 200
        data = res.json()
        assert data["calories_today"] == 1000
        assert data["calorie_goal"] == 2000
        assert data["calories_remaining"] == 1000
        assert data["latest_weight_lbs"] == 175.0
        assert data["latest_workout_name"] == "Push Day"

    def test_summary_requires_auth(self):
        res = client.get("/summary/today")
        assert res.status_code in (401, 403)


# ---------------------------------------------------------------------------
# GET /logs/export tests
# ---------------------------------------------------------------------------
class TestLogsExport:
    def test_export_empty(self):
        token = get_token()
        res = client.get("/logs/export", headers=auth_header(token))
        assert res.status_code == 200
        assert res.headers["content-type"].startswith("text/csv")
        lines = res.text.strip().split("\n")
        assert len(lines) == 1
        assert "calories" in lines[0]

    def test_export_with_logs(self):
        token = get_token()
        _save_parsed_log(token, "breakfast", 300)
        _save_parsed_log(token, "lunch", 500)
        res = client.get("/logs/export", headers=auth_header(token))
        assert res.status_code == 200
        lines = res.text.strip().split("\n")
        assert len(lines) == 3

    def test_export_requires_auth(self):
        res = client.get("/logs/export")
        assert res.status_code in (401, 403)

    def test_export_isolation(self):
        token_a = get_token("a@example.com")
        token_b = get_token("b@example.com")
        _save_parsed_log(token_a, "food", 500)
        res = client.get("/logs/export", headers=auth_header(token_b))
        lines = res.text.strip().split("\n")
        assert len(lines) == 1


# ---------------------------------------------------------------------------
# POST /logs/manual tests
# ---------------------------------------------------------------------------
class TestManualLog:
    def test_manual_log_success(self):
        token = get_token()
        res = client.post(
            "/logs/manual",
            json={"name": "Protein Bar", "calories": 200, "protein": 20, "carbs": 25, "fat": 8},
            headers=auth_header(token),
        )
        assert res.status_code == 200
        assert res.json()["status"] == "success"
        assert "entry_id" in res.json()

    def test_manual_log_persists(self):
        token = get_token()
        client.post(
            "/logs/manual",
            json={"name": "Banana", "calories": 105, "protein": 1, "carbs": 27, "fat": 0},
            headers=auth_header(token),
        )
        logs = client.get("/logs/today", headers=auth_header(token)).json()["logs"]
        assert len(logs) == 1
        assert logs[0]["calories"] == 105

    def test_manual_log_blank_name(self):
        token = get_token()
        res = client.post(
            "/logs/manual",
            json={"name": "   ", "calories": 100, "protein": 10, "carbs": 10, "fat": 5},
            headers=auth_header(token),
        )
        assert res.status_code == 422

    def test_manual_log_negative_calories(self):
        token = get_token()
        res = client.post(
            "/logs/manual",
            json={"name": "food", "calories": -50, "protein": 10, "carbs": 10, "fat": 5},
            headers=auth_header(token),
        )
        assert res.status_code == 422

    def test_manual_log_requires_auth(self):
        res = client.post("/logs/manual", json={"name": "food", "calories": 100})
        assert res.status_code in (401, 403)

    def test_manual_log_with_extended_nutrients(self):
        token = get_token()
        res = client.post(
            "/logs/manual",
            json={
                "name": "Oatmeal", "calories": 150, "protein": 5, "carbs": 27, "fat": 3,
                "fiber": 4.0, "sugar": 1.0, "sodium": 2.0,
            },
            headers=auth_header(token),
        )
        assert res.status_code == 200
        logs = client.get("/logs/today", headers=auth_header(token)).json()["logs"]
        assert logs[0]["fiber"] == 4.0
        assert logs[0]["sugar"] == 1.0
        assert logs[0]["sodium"] == 2.0


# ---------------------------------------------------------------------------
# POST /logs/save-parsed tests (additional coverage)
# ---------------------------------------------------------------------------
class TestSaveParsedLog:
    def test_save_parsed_with_extended_nutrients(self):
        token = get_token()
        res = client.post(
            "/logs/save-parsed",
            json={
                "input_text": "oatmeal with berries",
                "calories": 300, "protein": 10, "carbs": 50, "fat": 5,
                "fiber": 8.0, "sugar": 12.0, "sodium": 5.0,
            },
            headers=auth_header(token),
        )
        assert res.status_code == 200
        logs = client.get("/logs/today", headers=auth_header(token)).json()["logs"]
        assert logs[0]["fiber"] == 8.0

    def test_save_parsed_with_parsed_json(self):
        token = get_token()
        parsed = json.dumps({"items": [{"name": "test", "calories": 100}], "total": {"calories": 100}})
        res = client.post(
            "/logs/save-parsed",
            json={
                "input_text": "test food",
                "calories": 100, "protein": 10, "carbs": 10, "fat": 5,
                "parsed_json": parsed,
            },
            headers=auth_header(token),
        )
        assert res.status_code == 200
