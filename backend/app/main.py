# File: app/main.py

import logging
from fastapi import FastAPI
from .routers import lecture_transcript_router

# Configure logging once, right when the app starts.
logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# Create the FastAPI app instance
app = FastAPI()

# Include the router from your lecture_transcript_router.py file
app.include_router(lecture_transcript_router.router)

@app.get("/")
def read_root():
    """A simple endpoint to check if the API is running."""
    logging.info("Root endpoint was hit.")
    return {"status": "API is running"}