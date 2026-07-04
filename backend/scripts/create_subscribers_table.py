"""Run this script to create the subscribers table if it doesn't exist.
Usage: python scripts/create_subscribers_table.py
"""
from app import create_app
from app.extensions import db

app = create_app()

with app.app_context():
    # Use SQLAlchemy to create the table if missing
    from sqlalchemy import text
    stmt = text(
        """
        CREATE TABLE IF NOT EXISTS subscribers (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            name VARCHAR(255),
            created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (now())
        );
        """
    )
    db.session.execute(stmt)
    db.session.commit()
    print("✓ subscribers table ensured")
