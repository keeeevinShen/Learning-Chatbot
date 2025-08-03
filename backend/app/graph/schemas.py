# backend/app/schemas.py

from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from typing import List, Optional, TypedDict, Annotated
from pydantic import BaseModel, Field
import operator
from langgraph.graph import add_messages
from langchain_core.messages import AnyMessage

# ============================================================================
# PYDANTIC MODELS FOR STRUCTURED OUTPUT
# ============================================================================

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



class SearchQuery(BaseModel):
    query: List[str] = Field(
        description="A list of search queries to be used for web research."
    )


class checkpoints(BaseModel):
    goals: List[str] = Field(description="the steps we need to take to learn a certain lecture or concepts, this should contains at least 3 checkpoints")


class LearningResponse(BaseModel):
    """Simple structured output for the central chat node"""
    response_text: str = Field(description="The conversational response to send to the user")
    
    next_action: Literal["continue_learning", "store_knowledge"] = Field(
        description="""continue_learning = send message and wait for user reply, continue_learning is used when you think student havn't finish understanding all the checkpoints yet
        store_knowledge = user has mastered all checkpoints
        """
    )








