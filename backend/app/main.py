# backend/app/main.py

from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Depends
from typing import List, Optional
from .schemas.schemas1 import ChatRequest, ChatResponse, Attachment
import json

app = FastAPI()

async def process_files(files: List[UploadFile]) -> List[Attachment]:
    """
    Convert UploadFile objects to Attachment objects with byte content.
    This is where we extract the contents into bytes as you described.
    """
    attachments = []
    
    for file in files:
        try:
            # Extract the Contents into bytes (Backend): Read the file content
            content = await file.read()
            
            # Create the Attachment Object (Backend): Create Pydantic model
            attachment = Attachment(
                name=file.filename,
                size=len(content),
                type=file.content_type or "application/octet-stream",
                content=content
            )
            attachments.append(attachment)
            
            # Reset file pointer for potential re-reading
            await file.seek(0)
            
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Error processing file {file.filename}: {str(e)}")
    
    return attachments

@app.post("/chat", response_model=ChatResponse)
async def handle_chat(
    message: str = Form(...),
    conversation_id: str = Form(...),
    user_id: Optional[str] = Form(None),
    mode: str = Form("chat"),
    files: List[UploadFile] = File(default=[])
):
    """
    Enhanced chat endpoint that handles both JSON and multipart/form-data.
    
    Receive the "Shipping Box" (Backend): This endpoint receives multipart/form-data.
    FastAPI automatically provides UploadFile objects for the files.
    """
    try:
        # Process uploaded files if any
        attachments = []
        if files and files[0].filename:  # Check if files were actually uploaded
            attachments = await process_files(files)
        
        # Create ChatRequest object (even though we're not using Pydantic validation here,
        # we create it for consistency with our schemas)
        chat_request = ChatRequest(
            message=message,
            conversation_id=conversation_id,
            user_id=user_id,
            mode=mode,
            attachments=attachments
        )
        
        print(f"Received message: {chat_request.message}")
        print(f"Conversation ID: {chat_request.conversation_id}")
        print(f"Number of attachments: {len(chat_request.attachments)}")
        
        # Log file details
        for i, attachment in enumerate(chat_request.attachments):
            print(f"File {i+1}: {attachment.name} ({attachment.size} bytes, {attachment.type})")
        
        # Your chat logic will go here
        # For now, return a response that acknowledges the files
        response_text = f"You said: '{chat_request.message}'"
        if chat_request.attachments:
            file_names = [att.name for att in chat_request.attachments]
            response_text += f" and uploaded {len(chat_request.attachments)} file(s): {', '.join(file_names)}"
        
        return ChatResponse(
            response_text=response_text,
            message_id="msg_abcde",
            tool_calls=[]
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing request: {str(e)}")

# Keep the old endpoint for JSON-only requests (backward compatibility)
@app.post("/chat-json", response_model=ChatResponse)
def handle_chat_json(request: ChatRequest):
    """
    Legacy JSON-only endpoint for backward compatibility.
    """
    print(f"Received JSON message: {request.message}")
    print(f"Conversation ID: {request.conversation_id}")
    
    return ChatResponse(
        response_text=f"You said: '{request.message}'",
        message_id="msg_abcde",
        tool_calls=[]
    )

@app.get("/")
def read_root():
    return {"status": "API is running"}