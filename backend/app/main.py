# File: app/main.py

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import lecture_transcript_router

# Configure logging once, right when the app starts.
logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# Create the FastAPI app instance
app = FastAPI()

# Add CORS middleware to allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5174", "http://localhost:5173", "http://127.0.0.1:5174", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the router from your lecture_transcript_router.py file
app.include_router(lecture_transcript_router.router)

@app.get("/")
def read_root():
    """A simple endpoint to check if the API is running."""
    logging.info("Root endpoint was hit.")
    return {"status": "API is running"}