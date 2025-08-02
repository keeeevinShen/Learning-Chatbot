# backend/app/auth_dependencies.py

import os
from dotenv import load_dotenv, find_dotenv
from fastapi import Request, Depends, HTTPException, status
from jose import JWTError, jwt
import asyncpg  # Import asyncpg

# Import your database session function
from ..database.session import get_db_session

# Load environment variables
load_dotenv(find_dotenv())
SECRET_KEY = os.getenv("JWT_SECRET")
ALGORITHM = os.getenv("JWT_ALGORITHM")

credentials_exception = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)

async def get_current_user(
    request: Request,
    db_connection: asyncpg.Connection = Depends(get_db_session) # Use the asyncpg connection
) -> dict: # Return a dict instead of a User model
    """
    Dependency to get the current user from the JWT in the cookie.
    """
    token = request.cookies.get("session_token")
    if token is None:
        raise credentials_exception

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
            
    except JWTError:
        raise credentials_exception

    # Fetch the user from the database using a raw SQL query
    user_record = await db_connection.fetchrow(
        "SELECT * FROM users WHERE id = $1", int(user_id)
    )
    
    if user_record is None:
        raise credentials_exception

    # Return the user data as a dictionary
    return dict(user_record)