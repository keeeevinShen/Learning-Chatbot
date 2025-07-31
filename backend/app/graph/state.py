

from typing import List, Optional, TypedDict, Annotated
import operator
from langgraph.graph import add_messages
from langchain_core.messages import AnyMessage
from .schemas import *



class AgentState(TypedDict):
    #know which conversation
    thread_id: str 

    #know who we are talking to, and extract the right known knowledges from the database
    user_id: str

    # Core conversation data
    history_messages: Annotated[list[AnyMessage], add_messages]

    # Output and supporting data
    response: Optional[str]    

    #place we store the search quries generate by LLM
    search_query: Annotated[list, operator.add]

    #learning goals, also means what we will know after we finish learning
    learning_checkpoints: Annotated[list[str], operator.add]

    topic: Annotated[str,operator.add]

    #knowledge can used to explain after perform RAG 
    KnownKnowledge: Annotated[list[str], operator.add]

    learning_complete: bool = False
    error: Optional[str]

    