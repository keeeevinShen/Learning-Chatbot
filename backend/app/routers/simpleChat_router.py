# Alternative: Ultra-Simple Router - Direct Agent Integration
# File: app/routers/simpleChat_router.py

import logging
import json
from fastapi import APIRouter, Form, HTTPException
from fastapi.responses import StreamingResponse
from langchain_core.messages import HumanMessage
from ..graph.graph import graph
from auth_dependencies import *

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/simplechat")
async def chat_with_agent(
    message: str = Form(...),  # Required message
    thread_id: str = Form(...),  # Required thread ID
    current_user: User = Depends(get_current_user),
):
    """
    🎯 Ultra-Simple Chat - Direct Agent Integration
    
    Clean and simple: message + thread_id required, direct agent integration, full streaming.
    """
    if not current_user.is_active:
        raise HTTPException(status_code=403, detail="Account suspended")
    
    async def stream_agent_response():
        """Stream responses directly from your LangGraph agent"""
        try:
            config = {
                "configurable": {
                    "thread_id": thread_id,  # for state persistence
                    "user_id": current_user.id
                }

            }

            input_state = {
                "history_messages": [HumanMessage(content=message)]
                # LangGraph merges this with existing state automaticallys
            }
            thread_name = None
            # Stream directly from your agent - uses default config!
            async for event in graph.astream(input_state, config):
                for node_name, node_data in event.items():
                    
                    # Learning goals step
                    if node_name == "generate_learning_goals":
                        goals = node_data.get("learning_checkpoints", [])
                        if goals:
                            yield f"data: 📚 **Learning Plan:**\n\n"
                            for i, goal in enumerate(goals, 1):
                                yield f"data: {i}. {goal}\n\n"
                            yield f"data: \n\n"
                    
                    # Knowledge retrieval step  
                    elif node_name == "search_relevant":
                        knowledge = node_data.get("KnownKnowledge", [])
                        if knowledge:
                            yield f"data: 🔍 *Drawing from your learning materials...*\n\n"


                    elif node_name == "store_thread":
                        # Check if thread was actually created (not just checked)
                        if not node_data.get("error"):
                            # Extract thread name from learning goals
                            learning_goals = node_data.get("learning_checkpoints", [])
                            if learning_goals:
                                thread_name = "Learning: " + ", ".join(learning_goals[:2])
                            else:
                                thread_name = "New Conversation"
                                                        
                            # Send thread metadata as special message
                            thread_metadata = {
                                "type": "thread_update",
                                "thread_id": thread_id,
                                "thread_name": thread_name
                            }
                            yield f"data: __THREAD_UPDATE__{json.dumps(thread_metadata)}\n\n"
                    
                    # Final response step
                    elif node_name == "central_chat":
                        response = node_data.get("history_messages", "")[-1]
                        response_content = response.content
                        if response_content:
                            yield f"data: \n**Answer:**\n\n"
                            # Stream word by word for better UX
                            words = response_content.split()
                            for word in words:
                                yield f"data: {word} "
                                # Optional: add tiny delay for dramatic effect
                                # await asyncio.sleep(0.01)
                            yield f"data: \n\n"

                    elif node_name == "store_known_knowledge":
                        yield f"data: ✅ I have also stored what you learnt in this conversation into your personal knowledge database, used for future reference.\n\n"

                            
        except Exception as e:
            logger.error(f"Agent error: {e}")
            yield f"data: ❌ I'm having trouble right now. Please try again in a moment.\n\n"
    
    return StreamingResponse(
        stream_agent_response(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
        }
    )