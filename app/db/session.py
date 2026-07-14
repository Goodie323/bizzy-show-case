import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

# Load environment variables (fallback to local sqlite if DATABASE_URL isn't set)
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./bizzy.db")

# Adjust connect_args only if we are using SQLite (handles multi-threading)
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

# 1. Create the database Engine (manages the connection pool)
engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,       # Checks if connection is alive before handing it out
    pool_size=10,             # Maintains up to 10 active connections
    max_overflow=20,          # Allows up to 20 temporary extra connections under load
    echo=False                # Set to True if you want to debug SQL queries in your logs
)

# 2. Create SessionLocal (the transaction factory used by your workers)
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# 3. Standard declarative base class for your SQL models
class Base(DeclarativeBase):
    pass