# File: app/routers/simpleChat_router.py

import logging
import json
from fastapi import APIRouter, Form, HTTPException, Depends # Import Depends
from fastapi.responses import StreamingResponse
from langchain_core.messages import HumanMessage

# --- Updated Imports ---
from ..main import get_app_graph  # Import the dependency function
from .auth_dependencies import *

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/simplechat")
async def chat_with_agent(
    message: str = Form(...),
    thread_id: str = Form(...),
    current_user: dict = Depends(get_current_user),
    # 1. Inject the shared graph instance using Depends
    graph = Depends(get_app_graph),
):
    """
    🎯 Chat endpoint that uses a shared, stateful LangGraph agent.
    """
    if not current_user.get('is_active', True):
        raise HTTPException(status_code=403, detail="Account suspended")
    
    async def stream_agent_response():
        """Stream responses directly from the injected LangGraph agent"""
        try:
            # The config is correct, with user_id as an integer
            config = {
                "configurable": {
                    "thread_id": thread_id,
                    "user_id": int(current_user['id'])
                }
            }

            # The input is correct, containing only the new message
            input_state = {
                "history_messages": [HumanMessage(content=message)],
            }

            logger.info(f"Starting graph stream for thread: {thread_id}, user: {current_user['id']}")

            # 2. Use the injected graph instance
            async for event in graph.astream(input_state, config):
                # Your event handling logic remains the same
                for node_name, node_data in event.items():
                    if node_name == "generate_learning_goals":
                        goals = node_data.get("learning_checkpoints", [])
                        if goals:
                            yield f"data: 📚 **Learning Plan:**\n\n"
                            for i, goal in enumerate(goals, 1):
                                yield f"data: {i}. {goal}\n\n"
                            yield f"data: \n\n"
                    # ... and so on for your other nodes ...
                    elif node_name == "store_known_knowledge":
                        yield f"data: ✅ I have also stored what you learnt in this conversation into your personal knowledge database, used for future reference.\n\n"
                            
        except Exception as e:
            logger.error(f"Agent error: {e}")
            yield f"data: ❌ I'm having trouble right now. Please try again in a moment.\n\n"
    
    return StreamingResponse(
        stream_agent_response(),
        media_type="text/event-stream"
    )