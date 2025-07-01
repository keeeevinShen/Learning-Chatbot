# backend/app/main.py

from fastapi import FastAPI
from .schemas import ChatRequest, ChatResponse # Import the new model

app = FastAPI()

@app.post("/chat", response_model=ChatResponse )
def handle_chat(request: ChatRequest): # Use the model as a type hint
    """
    FastAPI will automatically:
    1. Check if the incoming request body is valid JSON.
    2. Validate that it has a 'message' (string) and a 'conversation_id' (string).
    3. If it's valid, it converts the JSON into a ChatRequest object called 'request'.
    """
    print(f"Received message: {request.message}")
    print(f"Conversation ID: {request.conversation_id}")
    
    # Your chat logic will go here
    
    return {"response_text": f"You said: '{request.message}'", "message_id": "msg_abcde"}

@app.get("/")
def read_root():
    return {"status": "API is running"}