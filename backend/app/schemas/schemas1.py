# backend/app/schemas.py

from pydantic import BaseModel, Field
from typing import List, Optional, Literal

class ChatRequest(BaseModel):
    message: str
    conversation_id: str
    user_id: Optional[str] = None # To fetch user-specific info

class ChatResponse(BaseModel):
    response_text: str
    message_id: str