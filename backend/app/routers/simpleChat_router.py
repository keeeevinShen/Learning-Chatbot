# File: app/routers/simpleChat_router.py

import logging
from typing import Optional, List
from fastapi import APIRouter, Form, File, UploadFile, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from ..services.chat import handle_chat
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None

@router.post("/simplechat")
async def simple_chat_stream(
    message: Optional[str] = Form(None),
    conversation_id: Optional[str] = Form(None),
    files: List[UploadFile] = File(default=[])
):
    """
    🚀 Simple Chat Endpoint with Streaming Support
    
    Handles both text-only and file upload requests.
    Always returns streaming responses for better UX.
    """
    try:
        logger.info(f"Simple chat request - Message: {message}, Conversation ID: {conversation_id}, Files: {len(files)}")
        
        # Validate input
        if not message and len(files) == 0:
            raise HTTPException(status_code=400, detail="Message or files required")
        
        # Handle file processing if needed
        file_info = []
        if files and len(files) > 0:
            for file in files:
                if file.filename:  # Skip empty file entries
                    file_content = await file.read()
                    file_info.append({
                        'name': file.filename,
                        'size': len(file_content),
                        'type': file.content_type
                    })
                    logger.info(f"Received file: {file.filename} ({len(file_content)} bytes)")
        
        # Prepare the message with file context if files are present
        final_message = message or "Please analyze the uploaded files."
        if file_info:
            file_context = f"\n\nFiles uploaded: {len(file_info)} file(s)\n"
            for info in file_info:
                file_context += f"- {info['name']} ({info['size']} bytes)\n"
            final_message += file_context
        
        # Define the streaming generator
        async def generate_stream():
            try:
                # Use the existing chat service for streaming
                async for token in handle_chat(
                    message=final_message,
                    session_id=conversation_id or "default",
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


