from sqlalchemy import Column, Integer, Float, Text, DateTime, func, JSON, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# SQLite local DB (you can change the URL if you move to PostgreSQL later)
DATABASE_URL = "sqlite:///./foodenough.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}  # Needed for SQLite
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class FoodLog(Base):
    __tablename__ = "food_logs"

    id = Column(Integer, primary_key=True, index=True)
    input_text = Column(Text, nullable=False)
    parsed_json = Column(JSON, nullable=False)  # Store as actual JSON
    calories = Column(Float)
    protein = Column(Float)
    carbs = Column(Float)
    fat = Column(Float)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

# Create the table(s)
def init_db():
    Base.metadata.create_all(bind=engine)
