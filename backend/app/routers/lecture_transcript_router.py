# File: app/routers/lecture_transcript_router.py

import logging
from fastapi import APIRouter, Form, HTTPException
from ..services import lecture_transcript

router = APIRouter(
    prefix="/lectures",
    tags=["Lectures"]
)

@router.post("/transcript")
async def get_transcript_from_url(lecture_url: str = Form(...)):
    """
    This endpoint receives a lecture URL, calls the service to scrape
    the transcript, and returns it.
    """
    logging.info("Router received request for URL: %s", lecture_url)
    
    try:
        transcript_text = lecture_transcript.handle_transcript_request(lecture_url)

        if not transcript_text:
            raise HTTPException(
                status_code=404, 
                detail="Transcript could not be found or extracted for the provided URL."
            )

        return {
            "status": "success",
            "lecture_url": lecture_url,
            "transcript": transcript_text
        }

    except Exception as e:
        logging.error("Unhandled exception in router for URL %s", lecture_url, exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail="An internal server error occurred while processing the transcript."
        )