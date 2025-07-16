# File: app/services/lecture_transcript.py

import logging
from playwright.sync_api import sync_playwright
import os
from dotenv import load_dotenv

load_dotenv()

unique_name = os.environ.get("UNIQUE_NAME")
password = os.environ.get("PASSWORD")

def get_transcript_url(url: str):
    """Opens the Canvas lecture URL and finds the transcript URL."""
    with sync_playwright() as p:
        try:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            
            logging.info("Navigating to lecture page: %s", url)
            page.goto(url, wait_until="networkidle")

            if page.locator('input[name="username"]').count() > 0:
                logging.info("Login required, attempting to log in.")
                page.locator('input[name="username"]').first.fill(unique_name)
                page.locator('input[type="password"]').first.fill(password)
                page.locator('button[type="submit"]').first.click()
                page.wait_for_load_state("networkidle")
                logging.info("Login completed.")
                page.goto(url, wait_until="networkidle")

            track_element = page.locator('track[kind="captions"]').first
            transcript_url = track_element.get_attribute('src')
            browser.close()

            if transcript_url:
                full_url = f"https://leccap.engin.umich.edu{transcript_url}"
                logging.info("Transcript URL found: %s", full_url)
                return full_url
            else:
                logging.warning("Transcript <track> element not found on page: %s", url)
                return None

        except Exception as e:
            logging.error("Failed while trying to get transcript URL from %s: %s", url, e, exc_info=True)
            return None

def open_trans_url(url: str):
    """Opens the direct transcript URL and extracts the text."""
    with sync_playwright() as p:
        try:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()

            logging.info("Navigating to transcript file URL: %s", url)
            page.goto(url, wait_until="networkidle")
            
            transcript_element = page.locator('pre').first
            transcript_text = transcript_element.inner_text()
            browser.close()

            if transcript_text:
                logging.info("Successfully extracted transcript text, length: %d", len(transcript_text))
                return transcript_text
            else:
                logging.warning("Could not find transcript text at URL: %s", url)
                return None
        except Exception as e:
            logging.error("Failed while trying to open transcript URL %s: %s", url, e, exc_info=True)
            return None

def handle_transcript_request(lecture_url: str):
    """Orchestrates the process of getting a lecture transcript."""
    try:
        transcript_file_url = get_transcript_url(lecture_url)
        if not transcript_file_url:
            logging.error("Could not find the transcript file URL. Aborting.")
            return None
        
        transcript_text = open_trans_url(transcript_file_url)
        return transcript_text

    except Exception as e:
        logging.critical("An unhandled exception occurred in handle_transcript_request: %s", e, exc_info=True)
        return None