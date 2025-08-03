

from typing import List, Optional, TypedDict, Annotated
import operator
from langgraph.graph import add_messages
from langchain_core.messages import AnyMessage
from .schemas import *



class AgentState(TypedDict):

    # Core conversation data
    history_messages: Annotated[list[AnyMessage], add_messages]


    #place we store the search quries generate by LLM
    search_query: Annotated[list, operator.add]

    #learning goals, also means what we will know after we finish learning
    learning_checkpoints: Annotated[list[str], operator.add]

    #knowledge can used to explain after perform RAG 
    KnownKnowledge: Annotated[list[str], operator.add]

    learning_complete: bool = False
    error: Optional[str]

    