import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from .base import Base  # <--- Import the SAME Base

class ChatHistory(Base):  # <--- ChatHistory also inherits from that Base
    __tablename__ = "chat_histories"

    # These columns are specific to the ChatHistory model
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    message = Column(String, nullable=False)
    response = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)