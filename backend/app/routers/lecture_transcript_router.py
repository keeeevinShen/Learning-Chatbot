# File: app/routers/lecture_transcript_router.py

import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ..services.lecture_transcript import *

# Request model for JSON body
class LectureRequest(BaseModel):
    lecture_url: str

router = APIRouter(
    prefix="/api",
    tags=["Lectures"]
)


@router.post("/transcript")
async def get_transcript_from_url(request: LectureRequest):
    """
    This endpoint receives a lecture URL, calls the service to scrape
    the transcript, and returns success status with filename (no transcript text).
    """
    lecture_url = request.lecture_url
    logging.info("Router received request for URL: %s", lecture_url)
    
    
    try:
        transcript_text = handle_transcript_request(lecture_url)

        if not transcript_text:
            # Failed to get transcript
            return {
                "success": False
            }

        # Successfully got transcript, generate filename
        lecture_filename = handle_lecture_name(lecture_url)
        
        return {
            "success": True,
            "filename": lecture_filename
        }

    except Exception as e:
        logging.error("Unhandled exception in router for URL %s", lecture_url, exc_info=True)
        return {
            "success": False
        }