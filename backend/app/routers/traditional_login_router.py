# backend/app/routers/traditional_login_router.py
from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..models.user import User
from ..database.session import get_database_session
from ..services.password_service import verify_password
from .google_login_router import create_access_token # Reusing your JWT creation function

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
    db_session: AsyncSession = Depends(get_database_session)
):
    # Find the user by email
    stmt = select(User).where(User.email == payload.email)
    result = await db_session.execute(stmt)
    user = result.scalar_one_or_none()

    # Check if user exists and password is correct
    if not user or not user.hashed_password or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Create and set the session token
    session_token = create_access_token(data={"sub": str(user.id)})
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=False, # Set to True in production
        samesite='lax',
        max_age=50000 * 60
    )

    return {
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "picture": user.picture
        }
    }