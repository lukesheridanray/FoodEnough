from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text
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

# Load env vars
load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Setup FastAPI
app = FastAPI()

# Enable CORS
origins = ["http://localhost:3000", "http://127.0.0.1:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Setup DB
SQLALCHEMY_DATABASE_URL = "sqlite:///./foodenough.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class FoodLog(Base):
    __tablename__ = "food_logs"
    id = Column(Integer, primary_key=True, index=True)
    input_text = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)
    calories = Column(Float)
    protein = Column(Float)
    carbs = Column(Float)
    fat = Column(Float)
    parsed_json = Column(Text)  # Stored as stringified JSON

Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class FoodInput(BaseModel):
    input_text: str


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
        return {"result": ai_reply}

    except Exception as e:
        print("/log error:", e)
        raise HTTPException(status_code=500, detail=str(e))


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

        parsed = json.loads(ai_reply)
        total = parsed["total"]

        log = FoodLog(
            input_text=data.input_text,
            parsed_json=json.dumps(parsed),  # Save stringified version
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


@app.get("/logs/today")
def get_logs_today(db: Session = Depends(get_db)):
    now = datetime.utcnow()
    start = datetime(now.year, now.month, now.day)

    logs = db.query(FoodLog).filter(FoodLog.timestamp >= start).order_by(FoodLog.timestamp.desc()).all()
    results = []
    for log in logs:
        results.append({
            "input_text": log.input_text,
            "timestamp": log.timestamp.isoformat(),
            "calories": log.calories,
            "protein": log.protein,
            "carbs": log.carbs,
            "fat": log.fat
        })

    return JSONResponse(content={"logs": results})


@app.get("/logs/week")
def get_logs_week(db: Session = Depends(get_db)):
    now = datetime.utcnow()
    start = now - timedelta(days=7)

    logs = db.query(FoodLog).filter(FoodLog.timestamp >= start).order_by(FoodLog.timestamp.desc()).all()

    results = []
    for log in logs:
        try:
            parsed = json.loads(log.parsed_json) if isinstance(log.parsed_json, str) else log.parsed_json
        except Exception as e:
            print("JSON parse error on log ID", log.id, ":", e)
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
    return StreamingResponse(output, media_type="text/csv", headers={
        "Content-Disposition": "attachment; filename=food_logs.csv"
    })
