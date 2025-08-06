# In your main application file (e.g., app/server.py)
from fastapi import FastAPI, HTTPException, Depends, APIRouter 
import asyncpg
from typing import List, Dict, Any
import logging

from ..dependencies import get_app_graph
from .auth_dependencies import get_current_user
from ..database.session import get_db_session
from ..models.operations import get_user_threads

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api",
    tags=["thread"]
)

@router.get("/threads")
async def get_user_recent_threads(
    current_user: dict = Depends(get_current_user),
    db_connection: asyncpg.Connection = Depends(get_db_session)
) -> List[Dict[str, Any]]:
    """
    Get the latest 5 conversations/threads for the current user.
    Returns thread_id and thread_name for displaying in the sidebar.
    """
    try:
        user_id = int(current_user['id'])
        logger.info(f"Getting recent threads for user: {user_id}")
        
        # Get the latest 5 threads for the user
        threads = await get_user_threads(
            connection=db_connection,
            user_id=user_id,
            limit=5
        )
        
        logger.info(f"Found {len(threads)} threads for user: {user_id}")
        
        # Return only the fields needed by the frontend
        return [
            {
                "thread_id": thread["thread_id"],
                "thread_name": thread["thread_name"],
                "created_at": thread["created_at"].isoformat() if thread["created_at"] else None,
                "updated_at": thread["updated_at"].isoformat() if thread["updated_at"] else None
            }
            for thread in threads
        ]
        
    except Exception as e:
        logger.error(f"Error retrieving threads for user {current_user.get('id', 'unknown')}: {e}")
        raise HTTPException(status_code=500, detail=f"Error retrieving threads: {e}")

