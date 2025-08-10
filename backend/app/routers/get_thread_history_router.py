# In your main application file (e.g., app/server.py)
from fastapi import FastAPI, HTTPException, Depends,APIRouter # <-- Add Depends
from ..dependencies import get_app_graph


router = APIRouter(
    prefix="/api",
    tags=["thread"]
)

@router.get("/thread_history/{thread_id}")
async def get_thread_history(thread_id: str, graph = Depends(get_app_graph)):
    """
    Retrieves the message history for a specific thread without running the agent.
    """
    config = {"configurable": {"thread_id": thread_id}}

    try:
        # Use get_state() to load the latest saved state from the checkpointer
        state_snapshot = await graph.aget_state(config) # Use aget_state for async

        # Extract the messages from the state
        history_messages = state_snapshot.values.get("history_messages", [])

        # Return the history to the frontend
        return {"messages": history_messages}

    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Thread not found or error retrieving state: {e}")