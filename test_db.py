# test_db.py
from sqlalchemy import create_engine, text
from app.db.session import engine  # or however you import your engine

# Check the actual connection URL
print("Engine URL:", engine.url)

# Test connection
with engine.connect() as conn:
    result = conn.execute(text("SELECT current_database(), current_user, inet_server_addr(), inet_server_port()"))
    db, user, host, port = result.fetchone()
    print(f"Connected to: {db} as {user} @ {host}:{port}")

# Check if chat_messages exists
with engine.connect() as conn:
    result = conn.execute(text("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'add paystack fields to order'
    """))
    print("paystack exists:", result.fetchone() is not None)