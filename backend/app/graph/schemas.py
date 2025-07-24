# backend/app/schemas.py

from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from typing import List, Optional, TypedDict, Annotated
from pydantic import BaseModel, Field
import operator


class Attachment(BaseModel):
    name: str = Field(description="The name of the attached file.")
    size: int = Field(description="The size of the file in bytes.")
    type: str = Field(description="The MIME type of the file.")
    content: Optional[bytes] = Field(None, description="The file content in bytes.")

#how llm should response if it wants to use tool
class ToolCall(BaseModel):
    tool_name: str = Field(description="The name of the tool that was called.")
    parameters: dict = Field({}, description="The parameters passed to the tool.")
    result: Optional[str] = Field(None, description="The result returned by the tool.")


class ChatResponse(BaseModel):
    message_id: str = Field(description="Unique identifier for this specific message.")
    response_text: str = Field(description="The main text response from the assistant.")
    tool_calls: List[ToolCall] = Field([], description="A list of tools that were executed.")


class ChatRequest(BaseModel):
    message: str
    conversation_id: str
    user_id: Optional[str] = None # To fetch user-specific info

    mode: Literal["chat","query"] = Field("chat",description = "the mode of interaction. ")  # set by the user in frontend 
    attachments: List[Attachment] = Field([], description="A list of files or images attached to the message.")




class ChatMessage(TypedDict):
    role: str
    content: str

class Source(TypedDict):
    title: str
    chunk: str
    # other metadata fields...

class AgentState(TypedDict):
    # Identifiers for the conversation context
    workspace_id: str
    thread_id: str
    user_id: Optional[str]      # For logged-in users
    session_id: Optional[str]   # For anonymous users

    # Core conversation data
    message: str
    chat_history: List[ChatMessage]

    # Output and supporting data
    response: Optional[str]
    sources: Optional[List[Source]]
    error: Optional[str]








