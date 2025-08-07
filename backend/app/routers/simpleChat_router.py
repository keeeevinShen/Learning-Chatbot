# File: app/routers/simpleChat_router.py

import logging
from fastapi import APIRouter, Form, HTTPException, Depends
from fastapi.responses import StreamingResponse
from langchain_core.messages import HumanMessage, AIMessage

from ..dependencies import get_app_graph
from .auth_dependencies import *

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/simplechat")
async def chat_with_agent(
    message: str = Form(...),
    thread_id: str = Form(...),
    current_user: dict = Depends(get_current_user),
    graph = Depends(get_app_graph),
):
    if not current_user.get('is_active', True):
        raise HTTPException(status_code=403, detail="Account suspended")

    async def stream_agent_response():
        try:
            config = {
                "configurable": {
                    "thread_id": thread_id,
                    "user_id": int(current_user['id'])}
            }
            
            # The input should be a dictionary where keys match the AgentState.
            # This is the standard way to pass new data to be added to the state.
            input_payload = {
                "history_messages": [HumanMessage(content=message)]
            }

            logger.info(f"Starting graph stream for thread: {thread_id}, user: {current_user['id']}")
            
            # Use graph.astream_events for more granular control
            async for event in graph.astream_events(input_payload, config, version="v1"):
                kind = event["event"]
                
                # Focus only on events where nodes finish running
                if kind == "on_chain_end":
                    node_name = event["name"] # In v1, the node name is in the 'name' field
                    node_data = event["data"].get("output")

                    # Skip if there's no output data
                    if not node_data:
                        continue
                    
                    # Now, process the output from each specific node
                    if node_name == "generate_learning_goals":
                        goals = node_data.get("learning_checkpoints", [])
                        if goals:
                            yield "data: 📚 **Learning Plan:**\n\n"
                            for i, goal in enumerate(goals, 1):
                                yield f"data: {i}. {goal}\n\n"
                            yield "data: \n\n"

                    elif node_name == "central_response_node":
                        error = node_data.get("error")
                        if error:
                            yield f"data: ❌ **Error:** {error}\n\n"
                        else:
                            latest_message = node_data.get("history_messages", [])[-1]
                            if isinstance(latest_message, AIMessage):
                                response_text = latest_message.content
                                yield "data:    \n\n"
                                yield f"data: {response_text}\n\n"

                        if node_data.get("learning_complete", False):
                            yield "data: \n\n🎉 **Congratulations!** You've mastered all the learning checkpoints!\n\n"
                    
                    elif node_name == "store_known_knowledge":
                        yield "data: ✅ I have also stored what you learnt in this conversation into your personal knowledge database, used for future reference.\n\n"

        except Exception as e:
            logger.exception(f"Critical agent error in thread {thread_id}")
            yield "data: ❌ I'm having a critical problem. Please try again in a moment.\n\n"

    return StreamingResponse(
        stream_agent_response(),
        media_type="text/event-stream"
    )