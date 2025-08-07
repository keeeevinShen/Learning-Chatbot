import os
from typing import TypedDict, Annotated
from dotenv import load_dotenv,find_dotenv
from pathlib import Path
from langgraph.graph import StateGraph
from langgraph.graph.message import add_messages
from google.genai import Client
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.runnables import RunnableConfig
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from .state import *
from .schemas import *
from .configuration import Configuration
from .prompts import get_learning_mode_prompt
from langchain_google_genai import GoogleGenerativeAIEmbeddings
import chromadb
from ..core.chroma_db import chroma_manager
import logging
from langgraph.checkpoint.memory import MemorySaver

from langgraph.checkpoint.sqlite import SqliteSaver
from langgraph.checkpoint.redis import RedisSaver
import sqlite3
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver
import logging
from langchain_core.runnables import RunnableConfig
from ..database.session import get_db_connection
from ..models.operations import check_thread_exists, add_thread
import asyncio
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




async def generate_learning_goals(state: AgentState, config: RunnableConfig):
    """
    If learning goals don't exist, generates them. 
    If they already exist, this node does nothing and just passes through.
    """
    # This is the new, critical gatekeeping logic
    if state.get("learning_checkpoints"):
        logger.info("Learning checkpoints already exist. Skipping generation.")
        return {} # Do nothing and let the graph continue to the next node.

    # --- If checkpoints DON'T exist, run the original logic ---
    logger.info("Generating new learning checkpoints.")
    configurable = Configuration.from_runnable_config(config)

    llm = ChatGoogleGenerativeAI(
        model=configurable.query_generator_model,
        temperature=1.0,
        max_retries=2,
        api_key=os.getenv("GEMINI_API_KEY"),
    )
    structured_llm = llm.with_structured_output(checkpoints)
    prompt = state.get('history_messages', []) + [
        HumanMessage(content="Based on our conversation, what checkpoints should we establish to achieve the learning goal?")
    ]
    result = await structured_llm.ainvoke(prompt)
    return {"learning_checkpoints": result.goals}


# second node, the node for getting the previous known knowledge, to make the learning more smooth 
async def generate_query(state: AgentState, config: RunnableConfig):
    
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
        HumanMessage(content=f"Based on the learning checkpoints:\n{checkpoints_str}\n\ngenerate {configurable.number_of_initial_queries}queries that can retrive students known knowledge from the vectorized database.")
    ]
    
    # Generate the search queries
    result = await structured_llm.ainvoke(formatted_prompt)


    if result and hasattr(result, 'query') and result.query:
        return {"search_query": result.query}
    else:
        logger.warning("Query generation failed, proceeding with an empty query list.")
        return {"search_query": []}



#using the qeury to perform RAG search too find the known knowledge
async def search_relevant(state: AgentState, config: RunnableConfig):
    configurable = Configuration.from_runnable_config(config)
    user_id = configurable.user_id
    collection_name = f"user_{user_id}_knowledge"
    collection = chroma_manager.get_collection(name=collection_name)

    search_queries = state.get('search_query', [])
    vectorized_queries = await asyncio.to_thread(
        chroma_manager.embedding_model.embed_documents, search_queries
    )

    results = await asyncio.to_thread(
        collection.query,
        query_embeddings=vectorized_queries,
        n_results=5
    )
    documents = results.get('documents')
    if not documents:
        return {"KnownKnowledge": []}
    
    retrieved_docs = [doc for doc_list in results['documents'] for doc in doc_list]

    return {"KnownKnowledge": retrieved_docs}



#final step to store the knowledge to the RAG system  ,   this will only be called when LLM think we finish our learning, and call this node. 
async def store_known_knowledge(state: AgentState, config: RunnableConfig):
    configurable = Configuration.from_runnable_config(config)
    user_id = configurable.user_id

    learning_checkpoints = state.get("learning_checkpoints", [])
    
    if not learning_checkpoints:
        logger.warning("No learning checkpoints to store")
        return {}
    
    topic = state["learning_checkpoints"][0]
    content_list = state["learning_checkpoints"]  # this is a list[str]
    try: 
        combined_content = "\n\n".join(content_list)

        collection_name = f"user_{user_id}_knowledge"
        collection = chroma_manager.get_collection(name=collection_name)

        embeddings = await asyncio.to_thread(
            chroma_manager.embedding_model.embed_documents, [combined_content]
        )

        await asyncio.to_thread(
            collection.add,
            embeddings=embeddings,
            documents=[combined_content],
            ids=[topic],
            metadatas=[{"topic": topic}]
        )
        
        logger.info(f"Successfully stored knowledge for user {user_id} in topic: {topic}")

    except Exception as e: 
        logger.error(f"Failed to store knowledge for user {user_id}, topic '{topic}': {str(e)}")

        
    return {}




#the central conversation node 
async def central_response_node(state: AgentState, config: RunnableConfig):
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
        result = await structured_llm.ainvoke(prompt)
        new_history = history_messages + [AIMessage(content=result.response_text)]
        return {
            "history_messages": new_history,
            "learning_complete": (result.next_action == "store_knowledge")
        }
    except Exception as e:
        logger.error(f"Error in central_response_node: {e}")
        error_message = "I'm having trouble processing your response. Could you please rephrase your question?"
        new_history = history_messages + [AIMessage(content=error_message)]
        return {
            "history_messages": new_history,
            "error": str(e)
        }

    


def should_continue(state: AgentState) -> str:
    if state.get("learning_complete"):
        return "continue_to_store_known_knowledge"
    else:
        return "wait_for_next_human_input"


async def name_and_store_thread(state: AgentState, config: RunnableConfig):
    """
    Names the thread based on learning goals and stores it in the database if it's new.
    Accesses user_id and thread_id directly from the config.

    """

    configurable = Configuration.from_runnable_config(config)
    thread_id = configurable.thread_id
    user_id = configurable.user_id
    # Get a direct database connection
    connection = await get_db_connection()
    try:
        #Check if the thread already exists, just for defensive programming sake
        thread_exists = await check_thread_exists(connection, thread_id)

        #  If it's a new thread, name and save it
        if not thread_exists:
            learning_goals = state.get("learning_checkpoints", [])
            
            # Generate a name from the first two goals, or use a default.
            if learning_goals:
                thread_name =  ", ".join(learning_goals[:1])
            else:
                thread_name = "New Conversation"
            
            # Add the new thread record to the database
            await add_thread(connection, thread_id, user_id, thread_name)
            logger.info(f"✅ New thread '{thread_name}' created and stored for user {user_id}.")

    except Exception as e:
        logger.error(f"Database error in name_and_store_thread: {e}")
        return {"error": str(e)}
        
    finally:
        #release the connection back to the pool
        if connection:
            await connection.close()

    # Return an empty dictionary to signal completion 
    return {}
    

def decide_entry_point(state: AgentState) -> str:
    """
    Checks if learning goals have been set. If not, it routes to the goal
    generation node. Otherwise, it proceeds to the main conversational response node.
    """
    if state.get("learning_checkpoints"):
        # Goals exist, it's an ongoing chat, go to the central node
        return "central_response_node"
    else:
        # No goals yet, it's a new chat, start the setup process
        return "generate_learning_goals"


def get_graph(checkpointer):
    """Builds and compiles a robust agent pipeline with an explicit end state."""
    builder = StateGraph(AgentState, config_schema=Configuration)

    # 1. Add all nodes as before
    builder.add_node("generate_learning_goals", generate_learning_goals)
    builder.add_node("store_thread", name_and_store_thread)
    builder.add_node("generate_query", generate_query)
    builder.add_node("search_relevant", search_relevant)
    builder.add_node("central_response_node", central_response_node)
    builder.add_node("store_known_knowledge", store_known_knowledge)

    # --- THE FIX: Add an explicit end node ---
    # This node does nothing and just marks a clean exit point.
    builder.add_node("end_node", lambda state: {})

    # 2. Set the conditional entry point as before
    builder.set_conditional_entry_point(
        decide_entry_point,
        {
            "generate_learning_goals": "generate_learning_goals",
            "central_response_node": "central_response_node",
        }
    )

    # 3. Define the initial setup path as before
    builder.add_edge("generate_learning_goals", "store_thread")
    builder.add_edge("store_thread", "generate_query")
    builder.add_edge("generate_query", "search_relevant")
    builder.add_edge("search_relevant", "central_response_node")

    # 4. Modify the conditional branch to use the new end node
    builder.add_conditional_edges(
        "central_response_node",
        should_continue,
        {
            "continue_to_store_known_knowledge": "store_known_knowledge",
            # Instead of mapping to __end__, map to our clean end_node
            "wait_for_next_human_input": "end_node",
        }
    )

    # 5. Define the final edges leading to the true end
    builder.add_edge("store_known_knowledge", "end_node")
    builder.add_edge("end_node", "__end__") # Only the end_node connects to __end__

    # 6. Compile the graph
    return builder.compile(checkpointer=checkpointer)




