# ============================================================
# FoodEnough Backend - main.py
# ------------------------------------------------------------
# FastAPI backend with JWT authentication.
# All food log endpoints are protected and scoped per user.
# ============================================================

from fastapi import FastAPI, Depends, HTTPException, Query, Request, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import create_engine, Column, Integer, Float, DateTime, Text, String, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
import bcrypt
import jwt as pyjwt
from jwt.exceptions import PyJWTError
from openai import OpenAI
import os
import json
import csv
from io import StringIO
import re
import sys
import base64
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded


# ============================================================
# Environment
# ============================================================
load_dotenv()

with open("prompt_template.txt", "r", encoding="utf-8") as _f:
    _PROMPT_TEMPLATE = _f.read()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "")
if not JWT_SECRET_KEY:
    raise RuntimeError("JWT_SECRET_KEY environment variable is required. Set it in .env before starting the server.")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

client = OpenAI(api_key=OPENAI_API_KEY)
security = HTTPBearer(auto_error=False)
limiter = Limiter(key_func=get_remote_address)


# ============================================================
# Database
# ============================================================
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./foodenough.db")

# SQLite requires check_same_thread=False; PostgreSQL does not accept it
_engine_kwargs: dict = {}
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    _engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_engine(SQLALCHEMY_DATABASE_URL, **_engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# ============================================================
# Models
# ============================================================
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    calorie_goal = Column(Integer, nullable=True)
    protein_goal = Column(Integer, nullable=True)
    carbs_goal = Column(Integer, nullable=True)
    fat_goal = Column(Integer, nullable=True)
    age = Column(Integer, nullable=True)
    sex = Column(String, nullable=True)          # 'M' or 'F'
    height_cm = Column(Float, nullable=True)
    activity_level = Column(String, nullable=True)  # 'sedentary','light','moderate','active','very_active'
    goal_type = Column(String, nullable=True)        # 'lose', 'maintain', 'gain'
    logs = relationship("FoodLog", back_populates="user")
    workouts = relationship("Workout", back_populates="user")
    weight_entries = relationship("WeightEntry", back_populates="user")
    fitness_profile = relationship("FitnessProfile", back_populates="user", uselist=False)
    workout_plans = relationship("WorkoutPlan", back_populates="user")


class FoodLog(Base):
    __tablename__ = "food_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    input_text = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    calories = Column(Float)
    protein = Column(Float)
    carbs = Column(Float)
    fat = Column(Float)
    fiber = Column(Float, nullable=True)
    sugar = Column(Float, nullable=True)
    sodium = Column(Float, nullable=True)    # milligrams
    parsed_json = Column(Text)
    user = relationship("User", back_populates="logs")


class Workout(Base):
    __tablename__ = "workouts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    exercises_json = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    user = relationship("User", back_populates="workouts")


class WeightEntry(Base):
    __tablename__ = "weight_entries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    weight_lbs = Column(Float, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    user = relationship("User", back_populates="weight_entries")


class FitnessProfile(Base):
    __tablename__ = "fitness_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    gym_access = Column(String, nullable=True)
    goal = Column(String, nullable=True)
    experience_level = Column(String, nullable=True)
    days_per_week = Column(Integer, nullable=True)
    session_duration_minutes = Column(Integer, nullable=True)
    limitations = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow)
    user = relationship("User", back_populates="fitness_profile")


class WorkoutPlan(Base):
    __tablename__ = "workout_plans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    is_active = Column(Integer, default=1)  # 1 = active, 0 = inactive
    total_weeks = Column(Integer, default=6)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    user = relationship("User", back_populates="workout_plans")
    sessions = relationship("PlanSession", back_populates="plan", cascade="all, delete-orphan")


class PlanSession(Base):
    __tablename__ = "plan_sessions"

    id = Column(Integer, primary_key=True, index=True)
    plan_id = Column(Integer, ForeignKey("workout_plans.id"), nullable=False, index=True)
    week_number = Column(Integer, nullable=False)
    day_number = Column(Integer, nullable=False)
    name = Column(String, nullable=False)
    exercises_json = Column(Text, nullable=True)
    is_completed = Column(Integer, default=0)  # 0 = pending, 1 = done
    completed_at = Column(DateTime, nullable=True)
    plan = relationship("WorkoutPlan", back_populates="sessions")


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, nullable=False, index=True)
    token = Column(String, unique=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Integer, default=0)  # 0 = unused, 1 = used


Base.metadata.create_all(bind=engine)


# ============================================================
# App + CORS
# ============================================================
app = FastAPI(
    title="FoodEnough API",
    description="AI-powered food logging backend with JWT authentication",
    version="2.0.0",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

_cors_origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000,https://food-enough.vercel.app").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


# ============================================================
# Helpers
# ============================================================
def extract_json(text: str):
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except Exception:
                pass
        raise ValueError("No valid JSON found in AI response.")


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRE_MINUTES)
    return pyjwt.encode(
        {"sub": str(user_id), "exp": expire},
        JWT_SECRET_KEY,
        algorithm=JWT_ALGORITHM,
    )


def send_password_reset_email(to_email: str, reset_url: str) -> bool:
    """Send a password reset email via SMTP. Returns True if sent, False if SMTP is not configured."""
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    smtp_from = os.getenv("SMTP_FROM") or smtp_user

    if not all([smtp_host, smtp_user, smtp_password]):
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Reset your FoodEnough password"
    msg["From"] = smtp_from
    msg["To"] = to_email

    text_body = (
        f"Click the link below to reset your FoodEnough password:\n\n"
        f"{reset_url}\n\n"
        f"This link expires in 1 hour. If you didn't request this, you can safely ignore this email."
    )
    html_body = f"""<html><body style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px">
<h2 style="color:#15803d">🌿 FoodEnough</h2>
<p>Click the button below to reset your password:</p>
<p><a href="{reset_url}" style="display:inline-block;padding:12px 24px;background:#16a34a;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">Reset Password</a></p>
<p style="color:#6b7280;font-size:13px">Or copy this link:<br><a href="{reset_url}" style="color:#16a34a">{reset_url}</a></p>
<p style="color:#6b7280;font-size:13px">This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
</body></html>"""

    msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    try:
        context = ssl.create_default_context()
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.ehlo()
            server.starttls(context=context)
            server.login(smtp_user, smtp_password)
            server.sendmail(smtp_from, to_email, msg.as_string())
        return True
    except Exception as e:
        print(f"[EMAIL] Failed to send reset email to {to_email}: {e}", file=sys.stderr, flush=True)
        return False


# ============================================================
# Nutrition Goal Calculation (Mifflin-St Jeor)
# ============================================================
ACTIVITY_MULTIPLIERS = {
    "sedentary":   1.2,    # desk job, no exercise
    "light":       1.375,  # light exercise 1-3 days/week
    "moderate":    1.55,   # moderate exercise 3-5 days/week
    "active":      1.725,  # hard exercise 6-7 days/week
    "very_active": 1.9,    # very hard exercise + physical job
}

def calculate_nutrition_goals(
    weight_lbs: float,
    height_cm: float,
    age: int,
    sex: str,
    activity_level: str,
    goal: str,  # 'lose', 'maintain', 'gain'
) -> dict:
    """
    Mifflin-St Jeor BMR -> TDEE -> macro split.
    Protein: 2g/kg (high protein works for all goals)
    Fat: 30% of adjusted calories
    Carbs: remainder
    """
    weight_kg = weight_lbs * 0.453592

    # BMR (Mifflin-St Jeor)
    if sex.upper() == "M":
        bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
    else:
        bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age - 161

    # TDEE
    multiplier = ACTIVITY_MULTIPLIERS.get(activity_level, 1.55)
    tdee = bmr * multiplier

    # Goal adjustment
    if goal == "lose":
        target_calories = tdee - 500      # ~0.5 kg/week deficit
    elif goal == "gain":
        target_calories = tdee + 300      # lean bulk
    else:
        target_calories = tdee            # maintain

    target_calories = max(1200, round(target_calories))  # safety floor

    # Macro split
    protein_g = round(weight_kg * 2.0)              # 2g per kg
    fat_g = round((target_calories * 0.30) / 9)     # 30% of calories from fat
    protein_cal = protein_g * 4
    fat_cal = fat_g * 9
    # If protein + fat exceed the target, trim protein to fit
    if protein_cal + fat_cal > target_calories:
        protein_cal = max(0, target_calories - fat_cal)
        protein_g = round(protein_cal / 4)
    carb_cal = max(0, target_calories - protein_cal - fat_cal)
    carbs_g = round(carb_cal / 4)

    return {
        "calorie_goal": target_calories,
        "protein_goal": protein_g,
        "carbs_goal": carbs_g,
        "fat_goal": fat_g,
        "tdee": round(tdee),
        "bmr": round(bmr),
    }


# ============================================================
# Dependencies
# ============================================================
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = credentials.credentials
    try:
        payload = pyjwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    try:
        user_db_id = int(user_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(User).filter(User.id == user_db_id).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# ============================================================
# Request Schemas
# ============================================================
class FoodInput(BaseModel):
    input_text: str = Field(max_length=2000)

    @field_validator("input_text")
    @classmethod
    def not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("input_text cannot be blank")
        return v


class RegisterInput(BaseModel):
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def password_valid(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if len(v.encode("utf-8")) > 72:
            raise ValueError("Password must be 72 characters or fewer")
        return v


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordInput(BaseModel):
    email: EmailStr


class ResetPasswordInput(BaseModel):
    token: str = Field(min_length=1, max_length=200)
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_valid(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if len(v.encode("utf-8")) > 72:
            raise ValueError("Password must be 72 characters or fewer")
        return v


class WorkoutInput(BaseModel):
    name: str = Field(max_length=200)
    exercises_json: Optional[str] = Field(default=None, max_length=5000)
    notes: Optional[str] = Field(default=None, max_length=2000)

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("name cannot be blank")
        return v


class WorkoutGenerateInput(BaseModel):
    goal: str = Field(max_length=500)
    available_equipment: Optional[str] = Field(default=None, max_length=500)
    duration_minutes: Optional[int] = None

    @field_validator("goal")
    @classmethod
    def goal_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("goal cannot be blank")
        return v

    @field_validator("duration_minutes")
    @classmethod
    def duration_positive(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v <= 0:
            raise ValueError("duration_minutes must be greater than 0")
        return v


class WeightInput(BaseModel):
    weight_lbs: float

    @field_validator("weight_lbs")
    @classmethod
    def weight_valid(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("weight_lbs must be greater than 0")
        if v > 1500:
            raise ValueError("weight_lbs must be 1500 or less")
        return v


class ProfileUpdate(BaseModel):
    calorie_goal: Optional[int] = None
    protein_goal: Optional[int] = None
    carbs_goal: Optional[int] = None
    fat_goal: Optional[int] = None
    age: Optional[int] = None
    sex: Optional[str] = None
    height_cm: Optional[float] = None
    activity_level: Optional[str] = None
    goal_type: Optional[str] = None  # 'lose', 'maintain', 'gain'

    @field_validator("calorie_goal", "protein_goal", "carbs_goal", "fat_goal")
    @classmethod
    def goals_positive(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v <= 0:
            raise ValueError("Goal values must be greater than 0")
        return v

    @field_validator("age")
    @classmethod
    def age_valid(cls, v):
        if v is not None and not (10 <= v <= 120):
            raise ValueError("Age must be between 10 and 120")
        return v

    @field_validator("sex")
    @classmethod
    def sex_valid(cls, v):
        if v is not None and v.upper() not in ("M", "F"):
            raise ValueError("Sex must be M or F")
        return v

    @field_validator("activity_level")
    @classmethod
    def activity_valid(cls, v):
        valid = {"sedentary", "light", "moderate", "active", "very_active"}
        if v is not None and v not in valid:
            raise ValueError(f"activity_level must be one of {valid}")
        return v

    @field_validator("height_cm")
    @classmethod
    def height_valid(cls, v):
        if v is not None and not (50 <= v <= 280):
            raise ValueError("height_cm must be between 50 and 280")
        return v


class FitnessProfileInput(BaseModel):
    gym_access: str = Field(max_length=50)
    goal: str = Field(max_length=100)
    experience_level: str = Field(max_length=50)
    days_per_week: int
    session_duration_minutes: int
    limitations: Optional[str] = Field(default=None, max_length=1000)

    @field_validator("days_per_week")
    @classmethod
    def days_valid(cls, v: int) -> int:
        if v < 1 or v > 7:
            raise ValueError("days_per_week must be between 1 and 7")
        return v

    @field_validator("session_duration_minutes")
    @classmethod
    def duration_valid(cls, v: int) -> int:
        if v < 10 or v > 180:
            raise ValueError("session_duration_minutes must be between 10 and 180")
        return v


class ParsedLogInput(BaseModel):
    input_text: str = Field(max_length=2000)
    calories: float
    protein: float
    carbs: float
    fat: float
    fiber: Optional[float] = None
    sugar: Optional[float] = None
    sodium: Optional[float] = None
    parsed_json: Optional[str] = Field(default=None, max_length=10000)

    @field_validator("calories", "protein", "carbs", "fat")
    @classmethod
    def macros_non_negative(cls, v: float) -> float:
        if v < 0:
            raise ValueError("Macro values must be non-negative")
        return v

    @field_validator("fiber", "sugar", "sodium")
    @classmethod
    def extended_non_negative(cls, v):
        if v is not None and v < 0:
            raise ValueError("Nutrient values must be non-negative")
        return v


class ManualLogInput(BaseModel):
    name: str = Field(max_length=500)
    calories: float = 0.0
    protein: float = 0.0
    carbs: float = 0.0
    fat: float = 0.0
    fiber: Optional[float] = None
    sugar: Optional[float] = None
    sodium: Optional[float] = None

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("name cannot be blank")
        return v

    @field_validator("calories", "protein", "carbs", "fat")
    @classmethod
    def macros_non_negative(cls, v: float) -> float:
        if v < 0:
            raise ValueError("Macro values must be non-negative")
        return v

    @field_validator("fiber", "sugar", "sodium")
    @classmethod
    def extended_non_negative(cls, v):
        if v is not None and v < 0:
            raise ValueError("Nutrient values must be non-negative")
        return v


# ============================================================
# Auth Endpoints
# ============================================================
@app.post("/auth/register")
@limiter.limit("5/minute")
def register(request: Request, data: RegisterInput, db: Session = Depends(get_db)):
    email = data.email.lower().strip()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=email,
        hashed_password=hash_password(data.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(user.id)
    return {"access_token": token, "token_type": "bearer"}


@app.post("/auth/login")
@limiter.limit("10/minute")
def login(request: Request, data: LoginInput, db: Session = Depends(get_db)):
    email = data.email.lower().strip()
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user.id)
    return {"access_token": token, "token_type": "bearer"}


# ============================================================
# POST /auth/forgot-password  — request a password reset token
# POST /auth/reset-password   — consume the token and set new password
# ============================================================
import secrets as _secrets

@app.post("/auth/forgot-password")
@limiter.limit("5/minute")
def forgot_password(request: Request, data: ForgotPasswordInput, db: Session = Depends(get_db)):
    email = data.email.lower().strip()
    user = db.query(User).filter(User.email == email).first()

    # Always return the same message so we don't leak whether an email exists
    generic = {"message": "If that email is registered, a reset link has been sent."}

    if not user:
        return generic

    # Expire any previous unused tokens for this email
    db.query(PasswordResetToken).filter(
        PasswordResetToken.email == email,
        PasswordResetToken.used == 0,
    ).update({"used": 1})
    db.commit()

    token = _secrets.token_urlsafe(32)
    reset = PasswordResetToken(
        email=email,
        token=token,
        expires_at=datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(hours=1),
    )
    db.add(reset)
    db.commit()

    reset_url = f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/reset-password?token={token}"
    sent = send_password_reset_email(email, reset_url)
    if not sent:
        print(f"\n[DEV] Password reset URL for {email}:\n{reset_url}\n", flush=True)

    return generic


@app.post("/auth/reset-password")
@limiter.limit("10/minute")
def reset_password(request: Request, data: ResetPasswordInput, db: Session = Depends(get_db)):
    record = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == data.token,
        PasswordResetToken.used == 0,
    ).first()

    if not record:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token.")

    if datetime.now(timezone.utc).replace(tzinfo=None) > record.expires_at:
        record.used = 1
        db.commit()
        raise HTTPException(status_code=400, detail="Reset token has expired. Please request a new one.")

    user = db.query(User).filter(User.email == record.email).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token.")

    user.hashed_password = hash_password(data.new_password)
    record.used = 1
    db.commit()

    return {"message": "Password updated successfully. You can now log in."}


# ============================================================
# DELETE /auth/account  — permanently delete account and all data
# ============================================================
@app.delete("/auth/account")
@limiter.limit("3/minute")
def delete_account(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Permanently delete the current user's account and all their data."""
    user_id = current_user.id
    email = current_user.email

    db.query(FoodLog).filter(FoodLog.user_id == user_id).delete()
    db.query(Workout).filter(Workout.user_id == user_id).delete()
    db.query(WeightEntry).filter(WeightEntry.user_id == user_id).delete()
    db.query(FitnessProfile).filter(FitnessProfile.user_id == user_id).delete()
    # WorkoutPlan has cascade="all, delete-orphan" on sessions, so deleting plans removes sessions
    db.query(WorkoutPlan).filter(WorkoutPlan.user_id == user_id).delete()
    db.query(PasswordResetToken).filter(PasswordResetToken.email == email).delete()
    db.delete(current_user)
    db.commit()
    return {"status": "deleted"}


# ============================================================
# POST /save_log  — parse and persist (protected)
# ============================================================
@app.post("/save_log")
@limiter.limit("30/minute")
def save_log(
    request: Request,
    data: FoodInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        base_prompt = _PROMPT_TEMPLATE

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": base_prompt},
                {"role": "user", "content": data.input_text},
            ],
            temperature=0.3,
        )

        ai_reply = response.choices[0].message.content

        try:
            parsed = extract_json(ai_reply)
            total = parsed["total"]
        except Exception as e:
            print("JSON parsing failed:", e)
            raise HTTPException(status_code=500, detail="AI response was not valid JSON")

        log = FoodLog(
            user_id=current_user.id,
            input_text=data.input_text,
            parsed_json=json.dumps(parsed),
            calories=total["calories"],
            protein=total["protein"],
            carbs=total["carbs"],
            fat=total["fat"],
        )

        db.add(log)
        db.commit()
        db.refresh(log)
        return {"status": "success", "entry_id": log.id}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print("/save_log error:", e)
        raise HTTPException(status_code=500, detail="An internal error occurred")


# ============================================================
# DELETE /logs/{log_id}  — delete a specific log (protected)
# ============================================================
@app.delete("/logs/{log_id}")
def delete_log(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    log = db.query(FoodLog).filter(FoodLog.id == log_id, FoodLog.user_id == current_user.id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")
    db.delete(log)
    db.commit()
    return {"status": "deleted"}


# ============================================================
# PUT /logs/{log_id}  — edit a food log entry (protected)
# ============================================================
@app.put("/logs/{log_id}")
@limiter.limit("20/minute")
def update_log(
    request: Request,
    log_id: int,
    data: FoodInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    log = db.query(FoodLog).filter(FoodLog.id == log_id, FoodLog.user_id == current_user.id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": _PROMPT_TEMPLATE},
                {"role": "user", "content": data.input_text},
            ],
            temperature=0.3,
        )
        ai_reply = response.choices[0].message.content
        try:
            parsed = extract_json(ai_reply)
            total = parsed["total"]
        except Exception:
            raise HTTPException(status_code=500, detail="AI response was not valid JSON")

        log.input_text = data.input_text
        log.parsed_json = json.dumps(parsed)
        log.calories = total["calories"]
        log.protein = total["protein"]
        log.carbs = total["carbs"]
        log.fat = total["fat"]
        db.commit()
        db.refresh(log)
        return {"status": "success", "entry_id": log.id}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"PUT /logs/{log_id} error:", e)
        raise HTTPException(status_code=500, detail="An internal error occurred")


# ============================================================
# POST /save_log/image  — photo food log via GPT-4o-mini vision
# ============================================================
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"}
MAX_IMAGE_BYTES = 5 * 1024 * 1024  # 5 MB

IMAGE_MAGIC_BYTES = {
    b"\xff\xd8\xff": "image/jpeg",
    b"\x89PNG\r\n\x1a\n": "image/png",
    b"RIFF": "image/webp",
    b"GIF87a": "image/gif",
    b"GIF89a": "image/gif",
}

def _validate_image_magic(contents: bytes) -> str | None:
    for magic, mime in IMAGE_MAGIC_BYTES.items():
        if contents[:len(magic)] == magic:
            return mime
    return None

IMAGE_PROMPT = """You are a calorie and macronutrient estimating assistant analyzing a photo of food.

Identify all food items visible in the image and estimate their calories and macros. Return a single valid JSON object in this exact format:

{
  "description": "Brief plain-text description of what you see (e.g. 'Grilled chicken with white rice and broccoli')",
  "items": [
    { "name": "grilled chicken", "calories": 250, "protein": 30, "carbs": 0, "fat": 6 },
    { "name": "white rice", "calories": 200, "protein": 4, "carbs": 40, "fat": 1 }
  ],
  "total": { "calories": 450, "protein": 34, "carbs": 40, "fat": 7 }
}

Rules:
- Output ONLY valid JSON. No code fences, no extra text, no markdown.
- Round all numbers to whole numbers.
- Estimate based on visible portion sizes; use typical serving sizes when unclear.
- Never guess high — use conservative, realistic estimates.
- If the image contains no food, return all zeros and set description to "No food detected".
- If the image is unclear or not a food photo, return all zeros and set description to "Could not identify food"."""


@app.post("/save_log/image")
@limiter.limit("15/minute")
async def save_log_from_image(
    request: Request,
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if image.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Image must be JPEG, PNG, WEBP, or GIF",
        )

    contents = await image.read()
    if len(contents) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=400, detail="Image must be 5 MB or smaller")

    detected_type = _validate_image_magic(contents)
    if not detected_type:
        raise HTTPException(status_code=400, detail="File content does not match a valid image format")

    b64_image = base64.b64encode(contents).decode("utf-8")
    media_type = detected_type

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": IMAGE_PROMPT},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{media_type};base64,{b64_image}",
                                "detail": "low",
                            },
                        },
                    ],
                }
            ],
            max_tokens=600,
        )

        ai_reply = response.choices[0].message.content

        try:
            parsed = extract_json(ai_reply)
            total = parsed["total"]
        except Exception as e:
            print("Image log JSON parse error:", e)
            raise HTTPException(status_code=500, detail="AI response was not valid JSON")

        description = parsed.get("description", "Photo log")

        log = FoodLog(
            user_id=current_user.id,
            input_text=f"📷 {description}",
            parsed_json=json.dumps(parsed),
            calories=total["calories"],
            protein=total["protein"],
            carbs=total["carbs"],
            fat=total["fat"],
        )
        db.add(log)
        db.commit()
        db.refresh(log)
        return {"status": "success", "entry_id": log.id, "description": description}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print("/save_log/image error:", e)
        raise HTTPException(status_code=500, detail="An internal error occurred")


# ============================================================
# POST /parse_log/image  — analyze image, return breakdown (no DB write)
# ============================================================
@app.post("/parse_log/image")
@limiter.limit("15/minute")
async def parse_log_from_image(
    request: Request,
    image: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    if image.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Image must be JPEG, PNG, WEBP, or GIF",
        )

    contents = await image.read()
    if len(contents) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=400, detail="Image must be 5 MB or smaller")

    detected_type = _validate_image_magic(contents)
    if not detected_type:
        raise HTTPException(status_code=400, detail="File content does not match a valid image format")

    b64_image = base64.b64encode(contents).decode("utf-8")
    media_type = detected_type

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": IMAGE_PROMPT},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{media_type};base64,{b64_image}",
                                "detail": "low",
                            },
                        },
                    ],
                }
            ],
            max_tokens=600,
        )

        ai_reply = response.choices[0].message.content

        try:
            parsed = extract_json(ai_reply)
        except Exception as e:
            print("/parse_log/image JSON parse error:", e)
            raise HTTPException(status_code=500, detail="AI response was not valid JSON")

        return {
            "description": parsed.get("description", "Photo log"),
            "items": parsed.get("items", []),
            "total": parsed.get("total", {"calories": 0, "protein": 0, "carbs": 0, "fat": 0}),
        }

    except HTTPException:
        raise
    except Exception as e:
        print("/parse_log/image error:", e)
        raise HTTPException(status_code=500, detail="An internal error occurred")


# ============================================================
# POST /logs/save-parsed  — save pre-analyzed data (no AI call)
# ============================================================
@app.post("/logs/save-parsed")
@limiter.limit("30/minute")
def save_parsed_log(
    request: Request,
    data: ParsedLogInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    log = FoodLog(
        user_id=current_user.id,
        input_text=data.input_text,
        parsed_json=data.parsed_json,
        calories=data.calories,
        protein=data.protein,
        carbs=data.carbs,
        fat=data.fat,
        fiber=data.fiber,
        sugar=data.sugar,
        sodium=data.sodium,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return {"status": "success", "entry_id": log.id}


# ============================================================
# POST /logs/manual  — manually entered food log (no AI)
# ============================================================
@app.post("/logs/manual")
@limiter.limit("60/minute")
def save_manual_log(
    request: Request,
    data: ManualLogInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    parsed = {
        "items": [{"name": data.name, "calories": data.calories, "protein": data.protein, "carbs": data.carbs, "fat": data.fat}],
        "total": {"calories": data.calories, "protein": data.protein, "carbs": data.carbs, "fat": data.fat},
    }
    log = FoodLog(
        user_id=current_user.id,
        input_text=f"✏️ {data.name}",
        parsed_json=json.dumps(parsed),
        calories=data.calories,
        protein=data.protein,
        carbs=data.carbs,
        fat=data.fat,
        fiber=data.fiber,
        sugar=data.sugar,
        sodium=data.sodium,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return {"status": "success", "entry_id": log.id}


# ============================================================
# GET /logs/today  — today's logs for current user
# ============================================================
@app.get("/logs/today")
def get_logs_today(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tz_offset_minutes: int = Query(default=0, ge=-720, le=840),
):
    now_utc = datetime.now(timezone.utc).replace(tzinfo=None)
    local_now = now_utc + timedelta(minutes=tz_offset_minutes)
    local_midnight = local_now.replace(hour=0, minute=0, second=0, microsecond=0)
    utc_start = local_midnight - timedelta(minutes=tz_offset_minutes)
    utc_end = utc_start + timedelta(days=1)

    logs = (
        db.query(FoodLog)
        .filter(FoodLog.user_id == current_user.id, FoodLog.timestamp >= utc_start, FoodLog.timestamp < utc_end)
        .order_by(FoodLog.timestamp.desc())
        .all()
    )

    results = [
        {
            "id": log.id,
            "input_text": log.input_text,
            "timestamp": log.timestamp.isoformat(),
            "calories": log.calories,
            "protein": log.protein,
            "carbs": log.carbs,
            "fat": log.fat,
            "fiber": log.fiber,
            "sugar": log.sugar,
            "sodium": log.sodium,
        }
        for log in logs
    ]

    return JSONResponse(content={"logs": results})


# ============================================================
# GET /logs/week  — last 7 days for current user
# ============================================================
@app.get("/logs/week")
def get_logs_week(
    offset_days: int = Query(default=0, ge=0, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    end = now - timedelta(days=offset_days)
    start = end - timedelta(days=7)

    logs = (
        db.query(FoodLog)
        .filter(
            FoodLog.user_id == current_user.id,
            FoodLog.timestamp >= start,
            FoodLog.timestamp < end,
        )
        .order_by(FoodLog.timestamp.desc())
        .all()
    )

    results = []
    for log in logs:
        try:
            parsed = json.loads(log.parsed_json) if log.parsed_json else None
        except Exception as e:
            print(f"JSON parse error on log ID {log.id}: {e}")
            parsed = None

        results.append({
            "input_text": log.input_text,
            "timestamp": log.timestamp.isoformat(),
            "calories": log.calories,
            "protein": log.protein,
            "carbs": log.carbs,
            "fat": log.fat,
            "fiber": log.fiber,
            "sugar": log.sugar,
            "sodium": log.sodium,
            "parsed_json": parsed,
        })

    return JSONResponse(content={"logs": results})


# ============================================================
# GET /logs/export  — CSV download for current user
# ============================================================
@app.get("/logs/export")
def export_logs_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    logs = (
        db.query(FoodLog)
        .filter(FoodLog.user_id == current_user.id)
        .order_by(FoodLog.timestamp.desc())
        .all()
    )

    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["timestamp", "input_text", "calories", "protein", "carbs", "fat"])

    for log in logs:
        writer.writerow([
            log.timestamp.isoformat(),
            log.input_text,
            log.calories,
            log.protein,
            log.carbs,
            log.fat,
        ])

    output.seek(0)
    return StreamingResponse(
        output,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=food_logs.csv"},
    )


# ============================================================
# GET /profile  — get current user's profile and goals
# ============================================================
@app.get("/profile")
def get_profile(
    current_user: User = Depends(get_current_user),
):
    return {
        "email": current_user.email,
        "calorie_goal": current_user.calorie_goal,
        "protein_goal": current_user.protein_goal,
        "carbs_goal": current_user.carbs_goal,
        "fat_goal": current_user.fat_goal,
        "age": current_user.age,
        "sex": current_user.sex,
        "height_cm": current_user.height_cm,
        "activity_level": current_user.activity_level,
        "goal_type": current_user.goal_type,
    }


# ============================================================
# PUT /profile  — update macro targets and calorie goal
# ============================================================
@app.put("/profile")
def update_profile(
    data: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Update manual goal fields if provided
    if data.calorie_goal is not None:
        current_user.calorie_goal = data.calorie_goal
    if data.protein_goal is not None:
        current_user.protein_goal = data.protein_goal
    if data.carbs_goal is not None:
        current_user.carbs_goal = data.carbs_goal
    if data.fat_goal is not None:
        current_user.fat_goal = data.fat_goal

    # Update anthropometric fields if provided
    if data.age is not None:
        current_user.age = data.age
    if data.sex is not None:
        current_user.sex = data.sex.upper()
    if data.height_cm is not None:
        current_user.height_cm = data.height_cm
    if data.activity_level is not None:
        current_user.activity_level = data.activity_level
    if data.goal_type is not None:
        current_user.goal_type = data.goal_type

    db.commit()
    db.refresh(current_user)

    return {
        "calorie_goal": current_user.calorie_goal,
        "protein_goal": current_user.protein_goal,
        "carbs_goal": current_user.carbs_goal,
        "fat_goal": current_user.fat_goal,
        "age": current_user.age,
        "sex": current_user.sex,
        "height_cm": current_user.height_cm,
        "activity_level": current_user.activity_level,
        "goal_type": current_user.goal_type,
    }


# ============================================================
# POST /profile/calculate-goals  — Mifflin-St Jeor goal calc
# ============================================================
@app.post("/profile/calculate-goals")
def calculate_goals(
    data: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Calculate nutrition goals using Mifflin-St Jeor formula.
    Saves anthropometric fields and computed goals to the user profile.
    Requires: age, sex, height_cm, activity_level.
    Uses latest weight entry for weight. Falls back to 70kg if no weight logged.
    """
    # Resolve fields: use provided values or fall back to stored values
    age = data.age or current_user.age
    sex = (data.sex or current_user.sex or "").upper()
    height_cm = data.height_cm or current_user.height_cm
    activity_level = data.activity_level or current_user.activity_level
    goal_type = data.goal_type or "maintain"

    if not all([age, sex, height_cm, activity_level]):
        raise HTTPException(
            status_code=422,
            detail="age, sex, height_cm, and activity_level are required to calculate goals"
        )

    # Get latest weight
    latest_weight = (
        db.query(WeightEntry)
        .filter(WeightEntry.user_id == current_user.id)
        .order_by(WeightEntry.timestamp.desc())
        .first()
    )
    weight_lbs = latest_weight.weight_lbs if latest_weight else 154.0  # 70kg default

    goals = calculate_nutrition_goals(
        weight_lbs=weight_lbs,
        height_cm=height_cm,
        age=age,
        sex=sex,
        activity_level=activity_level,
        goal=goal_type,
    )

    # Save everything to user
    current_user.age = age
    current_user.sex = sex
    current_user.height_cm = height_cm
    current_user.activity_level = activity_level
    current_user.goal_type = goal_type
    current_user.calorie_goal = goals["calorie_goal"]
    current_user.protein_goal = goals["protein_goal"]
    current_user.carbs_goal = goals["carbs_goal"]
    current_user.fat_goal = goals["fat_goal"]
    db.commit()
    db.refresh(current_user)

    return {
        **goals,
        "weight_lbs_used": weight_lbs,
    }


# ============================================================
# POST /weight  — log a weight entry
# ============================================================
@app.post("/weight")
@limiter.limit("30/minute")
def log_weight(
    request: Request,
    data: WeightInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = WeightEntry(user_id=current_user.id, weight_lbs=data.weight_lbs)
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return {"status": "success", "entry_id": entry.id, "weight_lbs": entry.weight_lbs}


# ============================================================
# GET /weight/history  — weight entries for current user
# ============================================================
@app.get("/weight/history")
def get_weight_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entries = (
        db.query(WeightEntry)
        .filter(WeightEntry.user_id == current_user.id)
        .order_by(WeightEntry.timestamp.desc())
        .limit(90)
        .all()
    )
    return {
        "entries": [
            {"id": e.id, "weight_lbs": e.weight_lbs, "timestamp": e.timestamp.isoformat()}
            for e in entries
        ]
    }


# ============================================================
# POST /workouts  — log a workout
# ============================================================
@app.post("/workouts")
@limiter.limit("30/minute")
def log_workout(
    request: Request,
    data: WorkoutInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workout = Workout(
        user_id=current_user.id,
        name=data.name,
        exercises_json=data.exercises_json,
        notes=data.notes,
    )
    db.add(workout)
    db.commit()
    db.refresh(workout)
    return {"status": "success", "workout_id": workout.id}


# ============================================================
# GET /workouts/history  — workout history for current user
# ============================================================
@app.get("/workouts/history")
def get_workout_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workouts = (
        db.query(Workout)
        .filter(Workout.user_id == current_user.id)
        .order_by(Workout.timestamp.desc())
        .limit(50)
        .all()
    )
    results = []
    for w in workouts:
        try:
            exercises = json.loads(w.exercises_json) if w.exercises_json else None
        except Exception:
            exercises = None
        results.append({
            "id": w.id,
            "name": w.name,
            "exercises": exercises,
            "notes": w.notes,
            "timestamp": w.timestamp.isoformat(),
        })
    return {"workouts": results}


# ============================================================
# DELETE /workouts/{workout_id}  — delete a workout
# ============================================================
@app.delete("/workouts/{workout_id}")
def delete_workout(
    workout_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workout = db.query(Workout).filter(Workout.id == workout_id, Workout.user_id == current_user.id).first()
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    db.delete(workout)
    db.commit()
    return {"status": "deleted"}


# ============================================================
# GET /summary/today  — real data for Today's Summary cards
# ============================================================
@app.get("/summary/today")
def get_today_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tz_offset_minutes: int = Query(default=0, ge=-720, le=840),
):
    now_utc = datetime.now(timezone.utc).replace(tzinfo=None)
    local_now = now_utc + timedelta(minutes=tz_offset_minutes)
    local_midnight = local_now.replace(hour=0, minute=0, second=0, microsecond=0)
    utc_start = local_midnight - timedelta(minutes=tz_offset_minutes)
    utc_end = utc_start + timedelta(days=1)

    # Today's food logs
    today_logs = (
        db.query(FoodLog)
        .filter(FoodLog.user_id == current_user.id, FoodLog.timestamp >= utc_start, FoodLog.timestamp < utc_end)
        .all()
    )
    calories_today = sum(log.calories or 0 for log in today_logs)
    protein_today = sum(log.protein or 0 for log in today_logs)
    carbs_today = sum(log.carbs or 0 for log in today_logs)
    fat_today = sum(log.fat or 0 for log in today_logs)
    fiber_today = sum(log.fiber or 0 for log in today_logs)
    sugar_today = sum(log.sugar or 0 for log in today_logs)
    sodium_today = sum(log.sodium or 0 for log in today_logs)

    # Calories remaining vs goal
    calorie_goal = current_user.calorie_goal
    calories_remaining = (calorie_goal - calories_today) if calorie_goal is not None else None

    # Latest weight entry
    latest_weight = (
        db.query(WeightEntry)
        .filter(WeightEntry.user_id == current_user.id)
        .order_by(WeightEntry.timestamp.desc())
        .first()
    )

    # Most recent workout
    latest_workout = (
        db.query(Workout)
        .filter(Workout.user_id == current_user.id)
        .order_by(Workout.timestamp.desc())
        .first()
    )

    return {
        "calories_today": round(calories_today),
        "calorie_goal": calorie_goal,
        "calories_remaining": round(calories_remaining) if calories_remaining is not None else None,
        "protein_today": round(protein_today),
        "carbs_today": round(carbs_today),
        "fat_today": round(fat_today),
        "protein_goal": current_user.protein_goal,
        "carbs_goal": current_user.carbs_goal,
        "fat_goal": current_user.fat_goal,
        "fiber_today": round(fiber_today, 1),
        "sugar_today": round(sugar_today, 1),
        "sodium_today": round(sodium_today),
        "latest_weight_lbs": latest_weight.weight_lbs if latest_weight else None,
        "latest_workout_name": latest_workout.name if latest_workout else None,
    }


# ============================================================
# GET /fitness-profile  — get user's quiz answers
# ============================================================
@app.get("/fitness-profile")
def get_fitness_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(FitnessProfile).filter(FitnessProfile.user_id == current_user.id).first()
    if not profile:
        return {"profile": None}
    return {
        "profile": {
            "gym_access": profile.gym_access,
            "goal": profile.goal,
            "experience_level": profile.experience_level,
            "days_per_week": profile.days_per_week,
            "session_duration_minutes": profile.session_duration_minutes,
            "limitations": profile.limitations,
        }
    }


# ============================================================
# PUT /fitness-profile  — save quiz answers (upsert)
# ============================================================
@app.put("/fitness-profile")
@limiter.limit("20/minute")
def update_fitness_profile(
    request: Request,
    data: FitnessProfileInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = db.query(FitnessProfile).filter(FitnessProfile.user_id == current_user.id).first()
    if not profile:
        profile = FitnessProfile(user_id=current_user.id)
        db.add(profile)
    profile.gym_access = data.gym_access
    profile.goal = data.goal
    profile.experience_level = data.experience_level
    profile.days_per_week = data.days_per_week
    profile.session_duration_minutes = data.session_duration_minutes
    profile.limitations = data.limitations
    profile.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    return {"status": "success"}


# ============================================================
# POST /workout-plans/generate  — AI-generate a 6-week plan
# ============================================================
@app.post("/workout-plans/generate")
@limiter.limit("5/minute")
def generate_workout_plan(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = db.query(FitnessProfile).filter(FitnessProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=400, detail="Complete your fitness profile quiz first")

    equipment_desc = {
        "full_gym": "a full gym with barbells, dumbbells, cables, and machines",
        "home_gym": "a home gym with dumbbells and/or resistance bands",
        "bodyweight": "bodyweight only — no equipment",
    }.get(profile.gym_access, profile.gym_access or "standard gym equipment")

    goal_desc = {
        "build_muscle": "build muscle and increase strength",
        "lose_weight": "lose weight and improve body composition",
        "improve_cardio": "improve cardiovascular fitness and endurance",
        "general_fitness": "improve general fitness and overall health",
    }.get(profile.goal, profile.goal or "general fitness")

    experience_desc = {
        "beginner": "beginner (less than 1 year of training)",
        "intermediate": "intermediate (1–3 years of training)",
        "advanced": "advanced (3+ years of training)",
    }.get(profile.experience_level, profile.experience_level or "intermediate")

    # Sanitize limitations: strip characters that could escape prompt structure
    _raw_limitations = (profile.limitations or "").strip()
    _safe_limitations = re.sub(r"[{}\[\]<>]", "", _raw_limitations)[:500]
    limitations_line = (
        f"Physical limitations to work around: {_safe_limitations}."
        if _safe_limitations
        else "No physical limitations."
    )

    prompt = f"""You are an expert personal trainer. Generate a complete 6-week progressive workout plan as valid JSON.

Athlete profile:
- Goal: {goal_desc}
- Equipment: {equipment_desc}
- Experience: {experience_desc}
- Training days per week: {profile.days_per_week}
- Session duration: {profile.session_duration_minutes} minutes
- {limitations_line}

Requirements:
- Exactly {profile.days_per_week} sessions per week for all 6 weeks
- Each session fits within {profile.session_duration_minutes} minutes
- Progressive overload: intensity and/or volume increases each week
- Week 1 = Foundation, Week 6 = Peak
- Each session: 4–6 exercises

Return ONLY valid JSON (no markdown, no code fences). Keep exercise notes very brief or omit them to stay within token limits:
{{
  "name": "Plan name",
  "notes": "1-2 sentence program description",
  "weeks": [
    {{
      "week_number": 1,
      "sessions": [
        {{
          "day_number": 1,
          "name": "Session name (e.g. Upper Body A, Push Day, Full Body 1)",
          "exercises": [
            {{"name": "Exercise name", "sets": 3, "reps": "8-10", "rest_seconds": 90}}
          ]
        }}
      ]
    }}
  ]
}}"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=12000,
        )
        ai_reply = response.choices[0].message.content
        try:
            parsed = extract_json(ai_reply)
        except Exception:
            raise HTTPException(status_code=500, detail="AI returned an unexpected response. Please try again.")

        # Deactivate any existing active plans for this user (part of the same transaction)
        db.query(WorkoutPlan).filter(
            WorkoutPlan.user_id == current_user.id,
            WorkoutPlan.is_active == 1,
        ).update({"is_active": 0})

        # Create the new plan
        plan = WorkoutPlan(
            user_id=current_user.id,
            name=parsed.get("name", "My 6-Week Plan"),
            notes=parsed.get("notes"),
            total_weeks=6,
            is_active=1,
        )
        db.add(plan)
        db.flush()  # get plan.id before adding sessions

        # Create all sessions
        for week_data in parsed.get("weeks", []):
            week_num = week_data.get("week_number", 1)
            for session_data in week_data.get("sessions", []):
                session = PlanSession(
                    plan_id=plan.id,
                    week_number=week_num,
                    day_number=session_data.get("day_number", 1),
                    name=session_data.get("name", "Workout"),
                    exercises_json=json.dumps(session_data.get("exercises", [])),
                    is_completed=0,
                )
                db.add(session)

        db.commit()
        db.refresh(plan)
        return {"status": "success", "plan_id": plan.id}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print("/workout-plans/generate error:", e)
        raise HTTPException(status_code=500, detail="An internal error occurred")


# ============================================================
# GET /workout-plans/active  — get the current active plan
# ============================================================
@app.get("/workout-plans/active")
def get_active_plan(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    plan = (
        db.query(WorkoutPlan)
        .filter(WorkoutPlan.user_id == current_user.id, WorkoutPlan.is_active == 1)
        .first()
    )
    if not plan:
        return {"plan": None}

    sessions = (
        db.query(PlanSession)
        .filter(PlanSession.plan_id == plan.id)
        .order_by(PlanSession.week_number, PlanSession.day_number)
        .all()
    )

    # Group sessions by week number
    weeks: dict = {}
    for s in sessions:
        wk = s.week_number
        if wk not in weeks:
            weeks[wk] = []
        try:
            exercises = json.loads(s.exercises_json) if s.exercises_json else []
        except Exception:
            exercises = []
        weeks[wk].append({
            "id": s.id,
            "day_number": s.day_number,
            "name": s.name,
            "exercises": exercises,
            "is_completed": bool(s.is_completed),
            "completed_at": s.completed_at.isoformat() if s.completed_at else None,
        })

    total_sessions = len(sessions)
    completed_sessions = sum(1 for s in sessions if s.is_completed)

    return {
        "plan": {
            "id": plan.id,
            "name": plan.name,
            "notes": plan.notes,
            "total_weeks": plan.total_weeks,
            "created_at": plan.created_at.isoformat(),
            "total_sessions": total_sessions,
            "completed_sessions": completed_sessions,
            "weeks": [
                {"week_number": wk, "sessions": weeks[wk]}
                for wk in sorted(weeks.keys())
            ],
        }
    }


# ============================================================
# DELETE /workout-plans/{plan_id}  — deactivate a plan
# ============================================================
@app.delete("/workout-plans/{plan_id}")
@limiter.limit("10/minute")
def deactivate_workout_plan(
    request: Request,
    plan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    plan = db.query(WorkoutPlan).filter(
        WorkoutPlan.id == plan_id,
        WorkoutPlan.user_id == current_user.id,
    ).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    plan.is_active = 0
    db.commit()
    return {"status": "deactivated"}


# ============================================================
# PUT /plan-sessions/{session_id}/complete  — mark session done
# ============================================================
@app.put("/plan-sessions/{session_id}/complete")
@limiter.limit("30/minute")
def complete_plan_session(
    request: Request,
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verify ownership via the plan
    session = (
        db.query(PlanSession)
        .join(WorkoutPlan)
        .filter(
            PlanSession.id == session_id,
            WorkoutPlan.user_id == current_user.id,
        )
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.is_completed:
        return {"status": "already_completed"}
    session.is_completed = 1
    session.completed_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    return {"status": "completed"}
