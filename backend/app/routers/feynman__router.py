import logging
from fastapi import APIRouter, Form, HTTPException, Depends
from fastapi.responses import StreamingResponse
from langchain_core.messages import HumanMessage, AIMessage

from ..dependencies import get_feynman_graph
from .auth_dependencies import *


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api")


@router.post("/feynman")
async def chat_with_feynman_agent(
    message: str = Form(...),
    thread_id: str = Form(...),
    current_user: dict = Depends(get_current_user),
    graph = Depends(get_feynman_graph),
):
    if not current_user.get('is_active', True):
        raise HTTPException(status_code=403, detail="Account suspended")

    async def stream_agent_response():
        try:
            config = {
                "configurable": {
                    "thread_id": thread_id,
                    "user_id": int(current_user['id'])
                }
            }

            input_payload = {
                "history_messages": [HumanMessage(content=message)]
            }

            logger.info(f"Starting Feynman graph stream for thread: {thread_id}, user: {current_user['id']}")

            async for event in graph.astream_events(input_payload, config, version="v1"):
                kind = event["event"]

                if kind == "on_chain_end":
                    node_name = event["name"]
                    node_data = (event.get("data") or {}).get("output") or {}

                    if not node_data:
                        continue

                    # Feynman-specific node handling
                    if node_name == "assess_context_need":
                        needs_more = bool(node_data.get("needs_more_context", False))
                        if needs_more:
                            yield "data: 🔍 I'll search online for more helpful context.\n\n"
                        else:
                            yield "data: ✅ We have enough context. Let’s evaluate your explanation.\n\n"

                    elif node_name == "search_online":
                        # Optional: surface that new knowledge was added
                        knowledge = node_data.get("KnownKnowledge") or []
                        if knowledge:
                            preview = (knowledge[-1] or "").strip().splitlines()[0][:180]
                            if preview:
                                yield f"data: 📚 Found extra context: {preview}\n\n"

                    elif node_name == "evaluate_user_explanation":
                        messages = node_data.get("history_messages") or []
                        if messages:
                            latest_message = messages[-1]
                            if isinstance(latest_message, AIMessage):
                                response_text = latest_message.content or ""
                                for line in response_text.splitlines():
                                    yield f"data: {line}\n"
                                yield "\n"

                        if node_data.get("learning_complete", False):
                            congrats_text = "🎉 Congratulations! You've mastered this concept."
                            for line in congrats_text.splitlines():
                                yield f"data: {line}\n"
                            yield "\n"

                    elif node_name == "store_mastered_concept":
                        yield "data: ✅ I've stored your mastered concept into your personal knowledge database.\n\n"

        except Exception:
            logger.exception(f"Critical Feynman agent error in thread {thread_id}")
            yield "data: ❌ I'm having a critical problem. Please try again in a moment.\n\n"

    return StreamingResponse(
        stream_agent_response(),
        media_type="text/event-stream"
    )


