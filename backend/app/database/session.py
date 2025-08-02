# backend/app/database/session.py

import os
import asyncpg
from dotenv import load_dotenv,find_dotenv

load_dotenv(find_dotenv())
_pool = None
#a dependecy to get connection
async def get_db_session():
    global _pool
    if not _pool:
        _pool = await asyncpg.create_pool(
            host=os.getenv("DB_HOST", "localhost"),
            port=int(os.getenv("DB_PORT", "5432")),
            user=os.getenv("DB_USER", "postgres"),
            password=os.getenv("DB_PASSWORD"),
            database=os.getenv("DB_NAME", "chatbot_db")
        )
    
    async with _pool.acquire() as connection:
        yield connection


async def get_db_connection():
    """Gets a direct connection from the pool for use in non-FastAPI contexts like the agent."""
    global _pool
    if not _pool:
        _pool = await asyncpg.create_pool(
            host=os.getenv("DB_HOST", "localhost"),
            port=int(os.getenv("DB_PORT", "5432")),
            user=os.getenv("DB_USER", "postgres"),
            password=os.getenv("DB_PASSWORD"),
            database=os.getenv("DB_NAME", "chatbot_db")
        )
    return await _pool.acquire()


async def create_tables():
    """
    OPTION 2: Read SQL from separate file
    Pro: Clean separation, easy to version control SQL changes
    Con: One extra file to manage
    """
    global _pool
    if not _pool:
        print("--- DATABASE CONNECTION DEBUG ---")
        print(f"HOST: {os.getenv('DB_HOST', 'localhost')}")
        print(f"PORT: {os.getenv('DB_PORT', '5432')}")
        print(f"USER: {os.getenv('DB_USER', 'postgres')}")
        print("---------------------------------")

        _pool = await asyncpg.create_pool(
            host=os.getenv("DB_HOST", "localhost"),
            port=int(os.getenv("DB_PORT", "5432")),
            user=os.getenv("DB_USER", "postgres"),
            password=os.getenv("DB_PASSWORD"),
            database=os.getenv("DB_NAME", "chatbot_db")
        )
    
    # Read the SQL file
    schema_path = os.path.join(os.path.dirname(__file__), "schema.sql")
    
    try:
        with open(schema_path, 'r') as f:
            sql_commands = f.read()
        
        async with _pool.acquire() as conn:
            # Execute all the SQL from the file
            await conn.execute(sql_commands)
            print("✅ Tables created from schema.sql!")
            
    except FileNotFoundError:
        print("❌ schema.sql file not found!")
        raise
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        raise