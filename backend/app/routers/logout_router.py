from fastapi import APIRouter, Response, status

router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"]
)

@router.post("/logout")
async def logout(response: Response):
    """
    This endpoint clears the session_token cookie, effectively logging the user out.
    """
    # The key to clearing a cookie is to set it again with the same parameters
    # but with a max_age of 0. This tells the browser it has expired.
    response.set_cookie(
        key="session_token",
        value="",             # The value does not matter, but empty is conventional
        httponly=True,
        secure=False,         # Should be True in production (HTTPS)
        samesite='lax',
        max_age=0             # Set max_age to 0 to expire the cookie immediately
    )
    
    # Return a success message
    return {
        "message": "Successfully logged out"
    }