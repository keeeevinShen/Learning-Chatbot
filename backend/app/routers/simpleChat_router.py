# File: app/routers/simpleChat_router.py

import logging
from typing import Optional, List
from fastapi import APIRouter, Form, File, UploadFile, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from ..services.chat import handle_chat
import json
from auth_dependencies import *

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    thread_id: Optional[str] = None

@router.post("/simplechat")
async def simple_chat_stream(
    message: Optional[str] = Form(None),
    thread_id: Optional[str] = Form(None),
    files: List[UploadFile] = File(default=[]),
    current_user: User = Depends(get_current_user)
):
    """
    🚀 Simple Chat Endpoint with Streaming Support
    
    Handles both text-only and file upload requests.
    Always returns streaming responses for better UX.
    """
    try:
        logger.info(f"Simple chat request - Message: {message}, Conversation ID: {thread_id}, Files: {len(files)}")
        if not current_user.is_active:
            raise HTTPException(status_code=403, detail="Your account is suspended.")
        
    
        # Prepare the message with file context if files are present
        final_message = message or "Please analyze the uploaded files."
        
        # Define the streaming generator
        async def generate_stream():
            try:
                # Use the existing chat service for streaming
                async for token in handle_chat(
                    message=final_message,
                    session_id=thread_id or "default",
                    mode="default"
                ):
                    # Format as Server-Sent Events (SSE) - required even for LangGraph SDK
                    yield f"data: {token}\n\n"
                    
            except Exception as e:
                logger.error(f"Error in streaming: {str(e)}")
                yield f"data: Error: {str(e)}\n\n"
        
        # Return streaming response with SSE format
        return StreamingResponse(
            generate_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*",
            }
        )
        
    except Exception as e:
        logger.error(f"Error in simple chat endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


