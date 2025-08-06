# File: app/main.py

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# --- LangGraph Imports ---
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver
from .graph.graph import get_graph

# --- App Module Imports ---
from app.core.log_config import setup_logging
# CHANGE: Import the shared resources dictionary from the new dependencies file
from .dependencies import shared_resources
from .routers import lecture_transcript_router, google_login_router, logout_router, simpleChat_router, traditional_login_router,get_thread_history_router,get_thread_router
from .database.session import create_tables

# Run setup functions
setup_logging()
logger = logging.getLogger(__name__)

# The shared_resources dictionary has been moved to app/dependencies.py

@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- Code here runs ONCE on startup ---
    logger.info("Application starting up...")
    
    # 1. Create database tables if they don't exist
    await create_tables()
    logger.info("Database tables verified.")

    # 2. Set up the checkpointer's database connection
    #    The 'async with' handles connection opening and closing
    checkpointer = AsyncSqliteSaver.from_conn_string("checkpoints.sqlite")
    async with checkpointer as db_checkpoint:
        
        # 3. Build the graph once using the checkpointer
        #    and store it in the shared dictionary from the dependencies module
        shared_resources["graph"] = get_graph(db_checkpoint)
        logger.info("LangGraph agent has been built and is ready.")
        
        yield # The app is now running and accepting requests

    # --- Code here runs ONCE on shutdown ---
    logger.info("Application shutting down...")
    # The 'async with' block ensures the checkpointer connection is closed gracefully

# Create the FastAPI app instance with our lifespan manager
app = FastAPI(lifespan=lifespan)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5174", "http://localhost:5173", "http://127.0.0.1:5174", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include your API routers
app.include_router(lecture_transcript_router.router)
app.include_router(google_login_router.router)
app.include_router(logout_router.router)
app.include_router(simpleChat_router.router)
app.include_router(traditional_login_router.router)
app.include_router(get_thread_history_router.router)
app.include_router(get_thread_router.router)


# CHANGE: The dependency function has been moved to app/dependencies.py

@app.get("/")
def read_root():
    """A simple endpoint to check if the API is running."""
    logger.info("Root endpoint was hit.")
    return {"status": "API is running"}
