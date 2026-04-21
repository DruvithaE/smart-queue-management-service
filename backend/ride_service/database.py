from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# Update this with your actual PostgreSQL credentials
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    # "postgresql://postgres:password@localhost:5432/smart_queue_db"
    "postgresql://postgres:1234@localhost:5432/smart_queue_db"
)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """Dependency that provides a DB session and closes it after use."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()