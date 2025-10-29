# ============================================================
# FoodEnough Backend - main.py
# ------------------------------------------------------------
# FastAPI backend that:
#  - Accepts natural language food logs
#  - Uses OpenAI GPT to estimate calories/macros
#  - Saves data in a local SQLite DB
#  - Exposes endpoints for logging, summaries, and export
#  - Safely extracts JSON from GPT responses (even if extra text is returned)
# ============================================================

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy import create_engine, Column, Integer, Float, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from datetime import datetime, timedelta
from dotenv import load_dotenv
from pydantic import BaseModel
from openai import OpenAI
import os
import json
import csv
from io import StringIO
import re


# ============================================================
# 1️⃣ Environment Setup
# ------------------------------------------------------------
# Load secrets (like OPENAI_API_KEY) from .env
# ============================================================
load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


# ============================================================
# 2️⃣ Utility: JSON Extractor
# ------------------------------------------------------------
# Extracts valid JSON from GPT output even if extra text appears.
# ============================================================
def extract_json(text: str):
    """
    Attempts to extract and parse the first valid JSON object from a GPT response.
    If parsing fails, raises a ValueError.
    """
    try:
        # Try direct JSON parsing first
        return json.loads(text)
    except json.JSONDecodeError:
        # If GPT adds extra text, try extracting JSON between braces
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except Exception:
                pass
        raise ValueError("No valid JSON found in AI response.")


# ============================================================
# 3️⃣ FastAPI App Initialization
# ============================================================
app = FastAPI(
    title="FoodEnough API",
    description="AI-powered food logging backend built with FastAPI and OpenAI",
    version="1.1.0"
)


# ============================================================
# 4️⃣ CORS Configuration
# ------------------------------------------------------------
# Allows requests from the frontend (Next.js running on port 3000)
# ============================================================
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# 5️⃣ Database Setup (SQLite)
# ------------------------------------------------------------
# Creates a SQLite database for local persistence.
# ============================================================
SQLALCHEMY_DATABASE_URL = "sqlite:///./foodenough.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# ============================================================
# 6️⃣ Database Model
# ------------------------------------------------------------
# Stores user-entered text, AI-parsed macros, and timestamps.
# ============================================================
class FoodLog(Base):
    __tablename__ = "food_logs"

    id = Column(Integer, primary_key=True, index=True)
    input_text = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)
    calories = Column(Float)
    protein = Column(Float)
    carbs = Column(Float)
    fat = Column(Float)
    parsed_json = Column(Text)  # stores AI response as JSON string


# Create tables if they don't exist
Base.metadata.create_all(bind=engine)


# ============================================================
# 7️⃣ Dependency: Database Session
# ============================================================
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ============================================================
# 8️⃣ Request Schema
# ============================================================
class FoodInput(BaseModel):
    input_text: str


# ============================================================
# 9️⃣ POST /log
# ------------------------------------------------------------
# Uses GPT to parse a food description but DOES NOT save it.
# Returns structured data if possible; raw text if not.
# ============================================================
@app.post("/log")
def get_macros_from_input(data: FoodInput):
    try:
        with open("prompt_template.txt", "r") as f:
            base_prompt = f.read()

        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": base_prompt},
                {"role": "user", "content": data.input_text}
            ],
            temperature=0.3
        )

        ai_reply = response.choices[0].message.content

        # Try to parse JSON from GPT response
        try:
            parsed = extract_json(ai_reply)
            return {"result": parsed}
        except Exception:
            return {"raw_output": ai_reply, "warning": "Could not parse clean JSON"}

    except Exception as e:
        print("/log error:", e)
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# 🔟 POST /save_log
# ------------------------------------------------------------
# Sends input to GPT, extracts JSON safely, and saves result.
# ============================================================
@app.post("/save_log")
def save_log(data: FoodInput, db: Session = Depends(get_db)):
    try:
        print("Saving log for input:", data.input_text)

        with open("prompt_template.txt", "r") as f:
            base_prompt = f.read()

        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": base_prompt},
                {"role": "user", "content": data.input_text}
            ],
            temperature=0.3
        )

        ai_reply = response.choices[0].message.content
        print("AI response:", ai_reply)

        # Attempt to safely extract JSON even if GPT adds text or formatting
        try:
            parsed = extract_json(ai_reply)
            total = parsed["total"]
        except Exception as e:
            print("⚠️ JSON parsing failed:", e)
            print("Raw AI reply:", ai_reply)
            raise HTTPException(status_code=500, detail="AI response was not valid JSON")

        log = FoodLog(
            input_text=data.input_text,
            parsed_json=json.dumps(parsed),
            calories=total["calories"],
            protein=total["protein"],
            carbs=total["carbs"],
            fat=total["fat"]
        )

        db.add(log)
        db.commit()
        db.refresh(log)
        return {"status": "success", "entry_id": log.id}

    except Exception as e:
        db.rollback()
        print("/save_log error:", e)
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# 11️⃣ GET /logs/today
# ------------------------------------------------------------
# Returns logs created today (UTC) sorted by time.
# ============================================================
@app.get("/logs/today")
def get_logs_today(db: Session = Depends(get_db)):
    now = datetime.utcnow()
    start = datetime(now.year, now.month, now.day)

    logs = db.query(FoodLog).filter(FoodLog.timestamp >= start).order_by(FoodLog.timestamp.desc()).all()
    results = [
        {
            "input_text": log.input_text,
            "timestamp": log.timestamp.isoformat(),
            "calories": log.calories,
            "protein": log.protein,
            "carbs": log.carbs,
            "fat": log.fat
        }
        for log in logs
    ]

    return JSONResponse(content={"logs": results})


# ============================================================
# 12️⃣ GET /logs/week
# ------------------------------------------------------------
# Returns logs from the last 7 days including parsed JSON.
# ============================================================
@app.get("/logs/week")
def get_logs_week(db: Session = Depends(get_db)):
    now = datetime.utcnow()
    start = now - timedelta(days=7)

    logs = db.query(FoodLog).filter(FoodLog.timestamp >= start).order_by(FoodLog.timestamp.desc()).all()
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
            "parsed_json": parsed
        })

    return JSONResponse(content={"logs": results})


# ============================================================
# 13️⃣ GET /logs/export
# ------------------------------------------------------------
# Exports all logs as a downloadable CSV file.
# ============================================================
@app.get("/logs/export")
def export_logs_csv(db: Session = Depends(get_db)):
    logs = db.query(FoodLog).order_by(FoodLog.timestamp.desc()).all()

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
            log.fat
        ])

    output.seek(0)
    return StreamingResponse(
        output,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=food_logs.csv"}
    )
