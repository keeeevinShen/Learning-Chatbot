from fastapi import APIRouter, Depends, HTTPException
from .auth_dependencies import get_current_user
from ..models import User

router = APIRouter()

@router.post("/chat/messages")
async def send_chat_message(
    message_data: dict, 
    current_user: User = Depends(get_current_user)
):
    """
    An endpoint that is protected. 
    Only logged-in users can access this.
    """
    # If the code reaches this point, the user is authenticated.
    # The 'current_user' variable holds the authenticated user's data.
    
    if not current_user.is_active:
        raise HTTPException(status_code=403, detail="Your account is suspended.")



    print(f"User {current_user.email} is sending a message.")
    
    return {
        "status": "message sent",
        "sent_by": current_user.email,
        "message": message_data.get("text")
    }
