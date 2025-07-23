# in a new file, e.g., 'auth_dependencies.py'

import os
from dotenv import load_dotenv,find_dotenv
from fastapi import Request, Depends, HTTPException, status
from sqlalchemy.orm import Session
from jose import JWTError, jwt

from ..database import get_db_session # Import your DB session function
from ..models import User # Import your User model

# Load environment variables from .env file
load_dotenv(find_dotenv())

# Get JWT settings from environment variables
SECRET_KEY = os.getenv("JWT_SECRET")
ALGORITHM = os.getenv("JWT_ALGORITHM")

# Define an exception for invalid credentials
credentials_exception = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)

async def get_current_user(
    request: Request, db: Session = Depends(get_db_session)
) -> User:
    """
    Dependency to get the current user from the JWT in the cookie.
    
    1. Extracts the token from the request's cookie.
    2. Decodes and validates the JWT.
    3. Fetches the user from the database.
    """
    # 1. Extract the token from the cookie
    token = request.cookies.get("session_token")
    if token is None:
        raise credentials_exception

    try:
        # 2. Decode the token using the same secret and algorithm
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        # The 'sub' claim holds our user ID
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
            
    except JWTError:
        # This catches any error from jwt.decode (e.g., bad signature, expired)
        raise credentials_exception

    # 3. Fetch the user from the database
    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception

    return user