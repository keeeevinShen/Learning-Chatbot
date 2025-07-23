from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from .base import Base

class User(Base):
    __tablename__ = "users"

    # These columns are specific to the User model
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String, unique=True, index=True, nullable=False)
    
    # Google OAuth fields
    google_id = Column(String, unique=True, index=True, nullable=True)
    name = Column(String, nullable=True)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    picture = Column(String, nullable=True)
    
    # Traditional auth fields (optional for Google users)
    hashed_password = Column(String, nullable=True)
    
    # Status fields
    is_active = Column(Boolean, default=True)
    verified_email = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
