import os
from typing import TypedDict, Annotated
from dotenv import load_dotenv,find_dotenv
from pathlib import Path
from langgraph.graph import StateGraph
from langgraph.graph.message import add_messages
from google.genai import Client
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.runnables import RunnableConfig
from langchain_core.messages import HumanMessage, SystemMessage
from .state import *
from .schemas import *
from .configuration import Configuration
from .prompts import get_learning_mode_prompt
from langchain_google_genai import GoogleGenerativeAIEmbeddings
import chromadb
from ..core.chroma_db import chroma_manager
import logging

from langgraph.checkpoint.sqlite import SqliteSaver
from langgraph.checkpoint.redis import RedisSaver

logger = logging.getLogger(__name__)




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

collection = chroma_manager.get_collection()



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
    formatted_prompt = [  # System message for learning mode
        HumanMessage(content=f"Based on the learning checkpoints:\n{checkpoints_str}\n\ngenerate queries that can retrive students known knowledge from the vectorized database.")
    ]
    
    # Generate the search queries
    result = structured_llm.invoke(formatted_prompt)
    return {"search_query": result.query}



#using the qeury to perform RAG search too find the known knowledge
def search_relevant(state: AgentState):
    search_queries = state.get('search_query', [])
    vectorized_queries = chroma_manager.embedding_model.embed_documents(search_queries)

    results = collection.query(
            query_embeddings=vectorized_queries,
            n_results=5 
        )
    
    retrieved_docs = [doc for doc_list in results['documents'] for doc in doc_list]

    return {"KnownKnowledge": retrieved_docs}



#final step to store the knowledge to the RAG system  ,   this will only be called when LLM think we finish our learning, and call this node. 
def store_known_knowledge(state: AgentState):
    topic = state["topic"]
    content_list = state["learning_checkpoints"]  # this is a list[str]
    try: 
        combined_content = "\n\n".join(content_list)

        collection = chroma_manager.get_collection("learning_materials")
        embeddings = chroma_manager.embedding_model.embed_documents([combined_content])

        collection.add(
                embeddings=embeddings,
                documents=[combined_content],
                ids=[topic],
                metadatas = [{"topic": topic} ]
            )
        
        logger.info(f"Successfully stored knowledge for topic: {topic}")

    except Exception as e: 
            logger.error(f"Failed to store knowledge for topic '{topic}': {str(e)}")

        
    return {}




#the central conversation node 
def central_response_node(state: AgentState, config: RunnableConfig):
    configurable = Configuration.from_runnable_config(config)
    

# init Gemini (model depends on user choose fast or smart)
    llm = ChatGoogleGenerativeAI(
        model=configurable.query_generator_model,
        temperature=1.0,
        max_retries=2,
        api_key=os.getenv("GEMINI_API_KEY"),
    )

    structured_llm = llm.with_structured_output(LearningResponse)

    learning_checkpoints = state.get('learning_checkpoints', [])
    known_knowledge = state.get('KnownKnowledge', [])
    history_messages = state.get('history_messages', [])
    learning_mode_prompt= get_learning_mode_prompt(learning_checkpoints,known_knowledge)

    prompt = [
        SystemMessage(content=learning_mode_prompt),
        *history_messages
    ]

    try: 
        result = structured_llm.invoke(prompt)

        return {
            "response": result.response_text,
            "learning_complete": (result.next_action == "store_knowledge")
        }
    except Exception as e:
        logger.error(f"Error in central_response_node: {e}")
        return {
            "response": "I'm having trouble processing your response. Could you please rephrase your question?",
            "error": str(e)
        }

    


def should_continue(state: AgentState) -> str:
    if state.get("learning_complete"):
        return "continue_to_store_known_knowledge"
    else:
        return "wait_for_next_human_input"


# Create our Agent Graph
builder = StateGraph(AgentState, config_schema=Configuration)


#add nodes
builder.add_node("generate_learning_goals",generate_learning_goals)
builder.add_node("generate_query",generate_query)
builder.add_node("search_relevant", search_relevant)  
builder.add_node("store_known_knowledge", store_known_knowledge) 




#add the in and out edge
builder.add_edge("__start__", "generate_learning_goals") # this add edge from start to gen goals
builder.add_edge("store_known_knowledge", "__end__")# this add edge from store to end 


#add inside graph connection edge, like adding logic of the agent
builder.add_edge("generate_learning_goals", "generate_query")
builder.add_edge("generate_query", "search_relevant") 


builder.add_conditional_edges(
    "central_response_node",
    should_continue,
    {
        "continue_to_store_known_knowledge": "store_known_knowledge",
        "wait_for_next_human_input": "__end__"   #this go to end, which means waiting for next api call, next human input
    }
)


checkpointer = SqliteSaver.from_conn_string("learning_checkpoints.db")

#compile and have it avaible
graph = builder.compile(
    name="Learning-agent",
    checkpointer=checkpointer
)





