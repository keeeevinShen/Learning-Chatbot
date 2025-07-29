# Alternative: Ultra-Simple Router - Direct Agent Integration
# File: app/routers/simpleChat_router.py

import logging
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
            # Prepare agent state - clean and simple
            state = {
                "thread_id": thread_id,
                "user_id": str(current_user.id),
                "history_messages": [HumanMessage(content=message)],
                "search_query": [],
                "learning_checkpoints": [],
                "KnownKnowledge": [],
                "response": None,
                "error": None
            }
            
            # Stream directly from your agent - uses default config!
            async for event in graph.astream(state):
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
                    
                    # Final response step
                    elif node_name == "generate_response":
                        response = node_data.get("response", "")
                        if response:
                            yield f"data: \n**Answer:**\n\n"
                            # Stream word by word for better UX
                            words = response.split()
                            for word in words:
                                yield f"data: {word} "
                                # Optional: add tiny delay for dramatic effect
                                # await asyncio.sleep(0.01)
                            yield f"data: \n\n"
                            
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