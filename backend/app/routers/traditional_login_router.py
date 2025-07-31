# backend/app/routers/traditional_login_router.py
from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
import asyncpg

from ..models.operations import find_or_create_user_traditional
from ..database.session import get_db_session
from .google_login_router import create_access_token  # Reusing your JWT creation function

router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"]
)

class TraditionalLoginPayload(BaseModel):
    email: str
    password: str

@router.post("/login")
async def traditional_login(
    payload: TraditionalLoginPayload,
    response: Response,
    connection: asyncpg.Connection = Depends(get_db_session)
):
    """
    Traditional email/password login endpoint.
    If user exists, verifies password. If not, creates new account.
    """
    try:
        # Find existing user or create new one
        user = await find_or_create_user_traditional(
            connection, 
            payload.email, 
            payload.password
        )
        
        # Check if account is active
        if not user.get('is_active', True):
            raise HTTPException(
                status_code=403,
                detail="Account is deactivated"
            )

        # Create and set the session token
        session_token = create_access_token(data={"sub": str(user['id'])})
        response.set_cookie(
            key="session_token",
            value=session_token,
            httponly=True,
            secure=False,  # Set to True in production with HTTPS
            samesite='lax',
            max_age=50000 * 60
        )

        return {
            "user": {
                "id": user['id'],
                "name": user['name'],
                "email": user['email'],
                "picture": user['picture']
            }
        }
        
    except ValueError as e:
        # This catches password verification errors
        raise HTTPException(
            status_code=401,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Login failed: {str(e)}"
        )