

from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from typing import List, Optional, TypedDict, Annotated
from pydantic import BaseModel, Field
import operator
from langgraph.graph import add_messages
from langchain_core.messages import AnyMessage
from graph.schemas import *



class AgentState(TypedDict):
    thread_id: str 
    # Core conversation data
    history_messages: Annotated[list[AnyMessage], add_messages]
    # Output and supporting data
    response: Optional[str]

    #place we store the search quries generate by LLM
    search_query: Annotated[list, operator.add]

    learning_checkpoints: Annotated[list, operator.add]

    #knowledge can used to explain after perform RAG 
    KnownKnowledge: Annotated[list[str], add_messages]

    error: Optional[str]

    