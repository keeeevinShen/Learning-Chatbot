# backend/app/routers/traditional_login_router.py
from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
import asyncpg

from ..models.operations import find_or_create_user_traditional,get_user_threads
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

        # Get user's latest 10 threads
        user_threads = await get_user_threads(connection, user['id'], limit=10)

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