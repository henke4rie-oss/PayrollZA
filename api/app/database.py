from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import declarative_base, sessionmaker

from api.app.config import settings

# Base class for SQLAlchemy ORM models
Base = declarative_base()

# Configure SQLAlchemy engine
# Set pool_pre_ping=True to verify connections before handing them out
engine = None
SessionLocal = None


def get_engine():
    global engine, SessionLocal
    if engine is None:
        engine = create_engine(
            settings.database_url,
            pool_pre_ping=True,
            echo=False,
        )
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return engine


# Dependency for database sessions in FastAPI routes
def get_db():
    get_engine()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Health check helper that pings the database with a fast SELECT 1 query
def check_database_health() -> str:
    try:
        eng = get_engine()
        with eng.connect() as connection:
            connection.execute(text("SELECT 1"))
        return "healthy"
    except (SQLAlchemyError, OSError, RuntimeError):
        return "disconnected"
