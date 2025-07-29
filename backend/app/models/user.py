# backend/app/models/user.py

from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class User(BaseModel):
    """
    Simple type-safe model - just tells Python what fields exist.
    The actual database structure is defined in SQL schema.
    """
    user_id: str
    email: str
    
    thread_ids: list[str]
    thread_names: list[str]
    
    # Google OAuth fields
    google_id: Optional[str] = None
    name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    picture: Optional[str] = None
    
    # Traditional auth fields
    hashed_password: Optional[str] = None
    
    # Status fields
    is_active: bool = True
    verified_email: bool = False
    
    # Timestamps
    created_at: datetime
    updated_at: datetime

    class Config:
        # This lets you create User objects from database rows
        from_attributes = True