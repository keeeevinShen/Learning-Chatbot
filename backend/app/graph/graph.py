import os
from typing import TypedDict, Annotated
from dotenv import load_dotenv,find_dotenv
from pathlib import Path
from langgraph.graph import StateGraph
from langgraph.graph.message import add_messages
from google.genai import Client
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.runnables import RunnableConfig
from langchain_core.messages import HumanMessage
from graph.state import *
from graph.schemas import *
from graph.configuration import Configuration
from graph.prompts import Learning_mode_prompt

#keep in mind need to make our override_config contain the "configurable" keyword, thats what LangGraph will look at, its a reserved keyword

#  Payload from the frontend
# {
#   "messages": [{"role": "user", "content": "What is LangGraph?"}],
#   "config": {
#     "configurable": {
#       "answer_model": "gemini-2.5-pro",
#       "max_research_loops": 3
#     }
#   }
# }
load_dotenv(find_dotenv())
if not os.getenv("GEMINI_API_KEY"):
    raise ValueError("GEMINI_API_KEY not found in environment variables.")


genai_client = Client(api_key=os.getenv("GEMINI_API_KEY"))



def generate_learning_goals(state: AgentState, config: RunnableConfig):

    configurable = Configuration.from_runnable_config(config)

    # init Gemini 2.0 Flash
    llm = ChatGoogleGenerativeAI(
        model=configurable.query_generator_model,
        temperature=1.0,
        max_retries=2,
        api_key=os.getenv("GEMINI_API_KEY"),
    )

    structured_llm = llm.with_structured_output(checkpoints)

    prompt = (
        HumanMessage(content=f"Based on the provided context: {state.get('history_messages', [])}, generate checkpoints we need to finish.")
    )

    result = structured_llm.invoke(prompt)
    return {"learning_checkpoints": result.goals}


# second node, the node for getting the previous known knowledge, to make the learning more smooth 
def generate_query(state: AgentState, config: RunnableConfig):
    
    configurable = Configuration.from_runnable_config(config)

# init Gemini 2.0 Flash
    llm = ChatGoogleGenerativeAI(
        model=configurable.query_generator_model,
        temperature=1.0,
        max_retries=2,
        api_key=os.getenv("GEMINI_API_KEY"),
    )
    structured_llm = llm.with_structured_output(SearchQuery)

    # Format the prompt with system message and user content
    checkpoints_str = "\n".join(state.get('learning_checkpoints', []))
    formatted_prompt = [
        Learning_mode_prompt,  # System message for learning mode
        HumanMessage(content=f"Based on the learning checkpoints:\n{checkpoints_str}\n\ngenerate queries that can retrive students known knowledge from the vectorized database.")
    ]
    
    # Generate the search queries
    result = structured_llm.invoke(formatted_prompt)
    return {"search_query": result.query}





# Create our Agent Graph
builder = StateGraph(AgentState, config_schema=Configuration)

builder.add_node("generate_learning_goals",generate_learning_goals)
builder.add_node("generate_query",generate_query)








