import os
from typing import TypedDict, Annotated
from dotenv import load_dotenv,find_dotenv
from pathlib import Path
from langgraph.graph import StateGraph
from langgraph.graph.message import add_messages

from langchain_anthropic import ChatAnthropic

load_dotenv(find_dotenv())
if not os.getenv("ANTHROPIC_API_KEY"):
    raise ValueError("ANTHROPIC_API_KEY not found in environment variables.")



