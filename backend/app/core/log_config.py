import logging
import sys
from pathlib import Path

def setup_logging():
    """Configure logging for the entire application."""
    
    # Create logs directory
    logs_dir = Path("logs")
    logs_dir.mkdir(exist_ok=True)
    
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            # Save to file
            logging.FileHandler('logs/app.log'),
            # Print to console  
            logging.StreamHandler(sys.stdout)
        ]
    )
    
    logging.info("Logging configuration complete")