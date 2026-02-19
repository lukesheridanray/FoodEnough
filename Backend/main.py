# ============================================================
# FoodEnough Backend - main.py
# ------------------------------------------------------------
# FastAPI backend with JWT authentication.
# All food log endpoints are protected and scoped per user.
# ============================================================

from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import create_engine, Column, Integer, Float, DateTime, Text, String, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from datetime import datetime, timedelta
from dotenv import load_dotenv
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
import bcrypt
from jose import JWTError, jwt
from openai import OpenAI
import os
import json
import csv
from io import StringIO
import re
import sys
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded


# ============================================================
# Environment
# ============================================================
load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "change-this-in-production")
if JWT_SECRET_KEY == "change-this-in-production":
    print("WARNING: JWT_SECRET_KEY is using the insecure default. Set JWT_SECRET_KEY in .env before deploying.", file=sys.stderr, flush=True)
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

client = OpenAI(api_key=OPENAI_API_KEY)
security = HTTPBearer(auto_error=False)
limiter = Limiter(key_func=get_remote_address)


# ============================================================
# Database
# ============================================================
SQLALCHEMY_DATABASE_URL = "sqlite:///./foodenough.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
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
    logs = relationship("FoodLog", back_populates="user")


class FoodLog(Base):
    __tablename__ = "food_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    input_text = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    calories = Column(Float)
    protein = Column(Float)
    carbs = Column(Float)
    fat = Column(Float)
    parsed_json = Column(Text)
    user = relationship("User", back_populates="logs")


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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
    expire = datetime.utcnow() + timedelta(minutes=JWT_EXPIRE_MINUTES)
    return jwt.encode(
        {"sub": str(user_id), "exp": expire},
        JWT_SECRET_KEY,
        algorithm=JWT_ALGORITHM,
    )


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
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
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


class LoginInput(BaseModel):
    email: EmailStr
    password: str


# ============================================================
# Auth Endpoints
# ============================================================
@app.post("/auth/register")
@limiter.limit("5/minute")
def register(request: Request, data: RegisterInput, db: Session = Depends(get_db)):
    if len(data.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    if len(data.password.encode("utf-8")) > 72:
        raise HTTPException(status_code=400, detail="Password must be 72 characters or fewer")
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
# POST /log  — parse food but do not save (protected)
# ============================================================
@app.post("/log")
@limiter.limit("30/minute")
def get_macros_from_input(
    request: Request,
    data: FoodInput,
    current_user: User = Depends(get_current_user),
):
    try:
        with open("prompt_template.txt", "r", encoding="utf-8") as f:
            base_prompt = f.read()

        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": base_prompt},
                {"role": "user", "content": data.input_text},
            ],
            temperature=0.3,
        )

        ai_reply = response.choices[0].message.content

        try:
            parsed = extract_json(ai_reply)
            return {"result": parsed}
        except Exception:
            return {"raw_output": ai_reply, "warning": "Could not parse clean JSON"}

    except HTTPException:
        raise
    except Exception as e:
        print("/log error:", e)
        raise HTTPException(status_code=500, detail="An internal error occurred")


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
        with open("prompt_template.txt", "r", encoding="utf-8") as f:
            base_prompt = f.read()

        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
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
# GET /logs/today  — today's logs for current user
# ============================================================
@app.get("/logs/today")
def get_logs_today(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = datetime.utcnow()
    start = datetime(now.year, now.month, now.day)

    logs = (
        db.query(FoodLog)
        .filter(FoodLog.user_id == current_user.id, FoodLog.timestamp >= start)
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
        }
        for log in logs
    ]

    return JSONResponse(content={"logs": results})


# ============================================================
# GET /logs/week  — last 7 days for current user
# ============================================================
@app.get("/logs/week")
def get_logs_week(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = datetime.utcnow()
    start = now - timedelta(days=7)

    logs = (
        db.query(FoodLog)
        .filter(FoodLog.user_id == current_user.id, FoodLog.timestamp >= start)
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
