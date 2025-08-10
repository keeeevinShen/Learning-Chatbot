# File: app/routers/simpleChat_router.py

import logging
from fastapi import APIRouter, Form, HTTPException, Depends
from fastapi.responses import StreamingResponse
from langchain_core.messages import HumanMessage, AIMessage

from ..dependencies import get_app_graph
from .auth_dependencies import *

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api")

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
                    node_name = event["name"]  # In v1, the node name is in the 'name' field
                    node_data = (event.get("data") or {}).get("output") or {}

                    # Skip if there's no output data
                    if not node_data:
                        continue
                    
                    # Now, process the output from each specific node
                    if node_name == "generate_learning_goals":
                        goals = node_data.get("learning_checkpoints", [])
                        if goals:
                            logger.info("## 📚 Learning Plan")
                            for i, goal in enumerate(goals, 1):
                                logger.info(f"**{i}.** {goal}")
                            logger.info("---")

                    elif node_name == "central_response_node":
                        error = node_data.get("error")
                        if error:
                            yield f"data: ❌ **Error:** {error}\n\n"
                        else:
                            messages = node_data.get("history_messages") or []
                            if messages:
                                latest_message = messages[-1]
                                if isinstance(latest_message, AIMessage):
                                    response_text = latest_message.content or ""
                                    # SSE requires each line of data to be prefixed with 'data:'
                                    for line in response_text.splitlines():
                                        yield f"data: {line}\n"
                                    # End of one SSE message event
                                    yield "\n"

                        if node_data.get("learning_complete", False):
                            congrats_text = "🎉 **Congratulations!** You've mastered all the learning checkpoints!"
                            for line in congrats_text.splitlines():
                                yield f"data: {line}\n"
                            yield "\n"
                    
                    elif node_name == "store_known_knowledge":
                        yield "data: ✅ I have also stored what you learnt in this conversation into your personal knowledge database, used for future reference.\n\n"

        except Exception as e:
            logger.exception(f"Critical agent error in thread {thread_id}")
            yield "data: ❌ I'm having a critical problem. Please try again in a moment.\n\n"

    return StreamingResponse(
        stream_agent_response(),
        media_type="text/event-stream"
    )