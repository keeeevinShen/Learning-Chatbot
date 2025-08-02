# backend/app/routers/google_login_router.py
from fastapi import APIRouter, HTTPException, Depends, Response
from pydantic import BaseModel
from dotenv import load_dotenv, find_dotenv
import os
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
import asyncpg
import logging

load_dotenv(find_dotenv())

# Import the authentication function from services and find_or_create_user from operations
from ..services.google_login import authenticate_google_user
from ..models.operations import find_or_create_user,get_user_threads
from ..database.session import get_db_session

router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"]
)

class GoogleAuthPayload(BaseModel):
    code: str

# Load the redirect URI from environment variables
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI") 

# JWT Configuration
SECRET_KEY = os.getenv("JWT_SECRET")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = 50000


def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


@router.post("/google")
async def google_auth_callback(
    payload: GoogleAuthPayload, 
    response: Response,
    db_connection: asyncpg.Connection = Depends(get_db_session)
):
    """
    This endpoint is called by the frontend after it receives the
    authorization code from Google.
    """
    try:
        # 1. Pass the code and the redirect_uri to your service
        auth_result = await authenticate_google_user(
            authorization_code=payload.code,
            redirect_uri=GOOGLE_REDIRECT_URI
        )

        if not auth_result.get("success"):
            raise HTTPException(
                status_code=401, 
                detail=f"Authentication failed: {auth_result.get('error', 'Unknown error')}"
            )

        user_data = auth_result.get("user")
        
        # 2. Find or create the user in your database
        user = await find_or_create_user(db_connection, user_data)
        
        # 3. Get user's latest 10 threads
        user_threads = await get_user_threads(db_connection, user['id'], limit=10)
        
        # 4. Create a session token (JWT) for the user
        session_token = create_access_token(data={"sub": str(user['id'])})

        # Remember to set secure to True when hosting live 
        response.set_cookie(
            key="session_token", 
            value=session_token,
            httponly=True,
            secure=False,
            samesite='lax',
            max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )

        # 5. Return the user data and their threads
        return {
            "user": {
                "id": user['id'],
                "name": user.get('name'),
                "email": user['email'],
                "picture": user.get('picture')
            },
            "threads": [
                {
                    "thread_id": thread['thread_id'],
                    "thread_name": thread['thread_name'],
                    "created_at": thread['created_at'].isoformat() if thread['created_at'] else None,
                    "updated_at": thread['updated_at'].isoformat() if thread['updated_at'] else None
                }
                for thread in user_threads
            ]
        }

    except Exception as e:
        logging.error("Error in google_auth_callback", exc_info=True)

        raise HTTPException(
            status_code=500,
            detail=f"Authentication failed: {str(e)}"
        )