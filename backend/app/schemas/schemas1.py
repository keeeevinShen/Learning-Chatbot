# backend/app/schemas.py

from pydantic import BaseModel, Field
from typing import List, Optional, Literal

class Attachment(BaseModel):
    name: str = Field(description="The name of the attached file.")
    size: int = Field(description="The size of the file in bytes.")
    type: str = Field(description="The MIME type of the file.")
    content: Optional[bytes] = Field(None, description="The file content in bytes.")

class ToolCall(BaseModel):
    tool_name: str = Field(description="The name of the tool that was called.")
    parameters: dict = Field({}, description="The parameters passed to the tool.")
    result: Optional[str] = Field(None, description="The result returned by the tool.")



class ChatRequest(BaseModel):
    message: str
    conversation_id: str
    user_id: Optional[str] = None # To fetch user-specific info

    mode: Literal["chat","query"] = Field("chat",description = "the mode of interaction. ")  # set by the user in frontend 
    attachments: List[Attachment] = Field([], description="A list of files or images attached to the message.")


class ChatResponse(BaseModel):
    message_id: str = Field(description="Unique identifier for this specific message.")
    response_text: str = Field(description="The main text response from the assistant.")
    tool_calls: List[ToolCall] = Field([], description="A list of tools that were executed.")







