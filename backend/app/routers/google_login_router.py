from fastapi import APIRouter, HTTPException, Depends, Response
from pydantic import BaseModel
from dotenv import load_dotenv, find_dotenv
import os
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

load_dotenv(find_dotenv())

# Import the authentication function you created
from ..services.google_login import authenticate_google_user, find_or_create_user
from ..models.user import User
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


#get a user id in, and add the exp time to the dictionary which is called data, and encryt it
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    
    # The jwt.encode() function creates the JWT string
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

@router.post("/google")
async def google_auth_callback(
    payload: GoogleAuthPayload, 
    response: Response,
    db_session: AsyncSession = Depends(get_db_session)
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
        user = await find_or_create_user(db_session, user_data)
        
        # 3. Create a session token (JWT) for the user
        session_token = create_access_token(data={"sub": str(user.id)})

#just remember to set secure to True when host live 
        response.set_cookie(
            key="session_token", 
            value=session_token,
            httponly=True,        # Prevents JavaScript from reading the cookie
            secure=False,         # Set to False for local development (HTTP)
            samesite='lax',       # Helps prevent CSRF attacks
            max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60 # Cookie expiration in seconds
        )

        # 4. Return the user info to the frontend
        return {
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "picture": user.picture
            }
        }

    except Exception as e:
        # Handle any unexpected errors
        raise HTTPException(status_code=500, detail=str(e))

