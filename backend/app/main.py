# File: app/main.py

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import lecture_transcript_router, google_login_router, logout_router, simpleChat_router, traditional_login_router
from .database.session import create_tables

# Configure logging once, right when the app starts.
logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s - %(levelname)s - %(message)s'
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create database tables
    await create_tables()
    logging.info("Database tables created")
    yield
    # Shutdown: Clean up resources if needed
    logging.info("Application shutdown")

# Create the FastAPI app instance
app = FastAPI(lifespan=lifespan)

# Add CORS middleware to allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5174", "http://localhost:5173", "http://127.0.0.1:5174", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(lecture_transcript_router.router)
app.include_router(google_login_router.router)
app.include_router(logout_router.router)
app.include_router(simpleChat_router.router)
app.include_router(traditional_login_router.router)

@app.get("/")
def read_root():
    """A simple endpoint to check if the API is running."""
    logging.info("Root endpoint was hit.")
    return {"status": "API is running"}