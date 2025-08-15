import os
import asyncio
import logging
from typing import Optional

from dotenv import load_dotenv, find_dotenv
from google.genai import Client

from langgraph.graph import StateGraph
from langgraph.graph.message import add_messages
from langgraph.checkpoint.sqlite import SqliteSaver
from langchain_core.runnables import RunnableConfig
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI

from .state import AgentState
from .schemas import SearchQuery, checkpoints
from .configuration import Configuration
from .prompts import feynman_mode_prompt
from ..core.chroma_db import chroma_manager


logger = logging.getLogger(__name__)

load_dotenv(find_dotenv())

if not os.getenv("GEMINI_API_KEY"):
    raise ValueError("GEMINI_API_KEY not found in environment variables.")

genai_client = Client(api_key=os.getenv("GEMINI_API_KEY"))


# ----------------------------------------
# Helper Nodes
# ----------------------------------------

async def generate_learning_goals(state: AgentState, config: RunnableConfig):
    """
    In Feynman agent, we don't create learning goals here.
    - If goals exist in the state, pass through.
    - If not, still pass through so downstream nodes can decide how to proceed.
    """
    if state.get("learning_checkpoints"):
        logger.info("Learning checkpoints provided. Passing through.")
    else:
        logger.info("No learning checkpoints provided. Proceeding without generating.")
    return {}


async def assess_context_need(state: AgentState, config: RunnableConfig):
    """Ask LLM if we need more external context to explain the checkpoints simply."""
    configurable = Configuration.from_runnable_config(config)

    llm = ChatGoogleGenerativeAI(
        model=configurable.reflection_model,
        temperature=0.4,
        max_retries=2,
        api_key=os.getenv("GEMINI_API_KEY"),
    )

    class ContextAssessmentModel:
        # lightweight structured output via JSON-mode prompt
        pass

    learning_checkpoints = state.get("learning_checkpoints", [])
    known_knowledge = state.get("KnownKnowledge", [])

    checkpoints_str = "\n".join(learning_checkpoints)
    knowledge_str = "\n".join(known_knowledge) if known_knowledge else "<none>"

    system = SystemMessage(content="You are a careful tutor. Decide if more online context is needed to explain simply.")
    human = HumanMessage(
        content=(
            f"Learning checkpoints:\n{checkpoints_str}\n\n"
            f"Current background knowledge:\n{knowledge_str}\n\n"
            "Return strictly JSON with keys: {\"needs_more_context\": true|false, \"reason\": string, \"focus\": string}."
        )
    )

    response = await llm.ainvoke([system, human])
    # Best-effort JSON parse
    import json
    needs_more = True
    try:
        data = json.loads(response.content if isinstance(response.content, str) else response.content[0]["text"])  # type: ignore[index]
        needs_more = bool(data.get("needs_more_context", True))
        focus = data.get("focus", "")
    except Exception:
        focus = ""

    return {"needs_more_context": needs_more, "context_focus": focus}


async def search_online(state: AgentState, config: RunnableConfig):
    """Use the Google GenAI client with Search grounding to fetch a concise summary."""
    configurable = Configuration.from_runnable_config(config)

    learning_checkpoints = state.get("learning_checkpoints", [])
    context_focus = state.get("context_focus") or ""

    if not learning_checkpoints:
        logger.info("No checkpoints to research. Skipping search.")
        return {}

    # Craft a concise research prompt
    target = learning_checkpoints[0]
    research_query = (
        f"Provide a concise, beginner-friendly explanation of '{target}'. "
        f"Focus on: {context_focus if context_focus else 'key definitions, core intuition, and one concrete example.'} "
        "Use Google Search for grounding and then summarize findings."
    )

    def _run_search():
        return genai_client.responses.generate(
            model=configurable.query_generator_model,
            contents=[{"role": "user", "parts": [{"text": research_query}]}],
            tools=[{"google_search": {}}],
        )

    try:
        result = await asyncio.to_thread(_run_search)
        # Extract text safely from google-genai SDK response
        summary_text = ""
        try:
            # responses.generate -> response with .output_text in newer SDKs
            summary_text = getattr(result, "output_text", "") or ""
        except Exception:
            summary_text = ""

        if not summary_text:
            # Fallback: use LC LLM to summarize from empty (no-op)
            summary_text = f"Online summary for {target} could not be retrieved."

        existing = state.get("KnownKnowledge", []) or []
        updated = existing + [summary_text]
        return {"KnownKnowledge": updated}
    except Exception as e:
        logger.error(f"Online search failed: {e}")
        return {}


async def evaluate_user_explanation(state: AgentState, config: RunnableConfig):
    """
    Evaluate user's latest explanation for a target concept.
    If simple and correct -> positive feedback and mark for storage.
    Else -> point out issues and wait for user input.
    """
    configurable = Configuration.from_runnable_config(config)

    llm = ChatGoogleGenerativeAI(
        model=configurable.answer_model,
        temperature=0.7,
        max_retries=2,
        api_key=os.getenv("GEMINI_API_KEY"),
    )

    history = state.get("history_messages", [])
    checkpoints_list = state.get("learning_checkpoints", [])
    target_concept = checkpoints_list[0] if checkpoints_list else "the main concept"

    system = feynman_mode_prompt
    human_instruction = HumanMessage(
        content=(
            "Evaluate the user's most recent explanation for correctness and simplicity.\n"
            f"Target concept: {target_concept}.\n"
            "Respond with strictly JSON having keys: "
            "{\"is_mastered\": true|false, \"feedback\": string}. "
            "If mastered, praise and keep it concise."
        )
    )

    response = await llm.ainvoke([system, *history, human_instruction])

    import json
    try:
        data = json.loads(response.content if isinstance(response.content, str) else response.content[0]["text"])  # type: ignore[index]
        is_mastered = bool(data.get("is_mastered", False))
        feedback = data.get("feedback", "")
    except Exception:
        is_mastered = False
        feedback = "I couldn't parse your explanation. Could you restate it simply in your own words?"

    new_history = history + [AIMessage(content=feedback)]
    return {"history_messages": new_history, "learning_complete": is_mastered}


async def store_mastered_concept(state: AgentState, config: RunnableConfig):
    configurable = Configuration.from_runnable_config(config)
    user_id = configurable.user_id

    learning_checkpoints = state.get("learning_checkpoints", [])
    if not learning_checkpoints:
        logger.warning("No learning checkpoints to store (Feynman).")
        return {}

    # Store the first concept for this iteration
    topic = learning_checkpoints[0]
    # Use latest assistant feedback + known knowledge as content
    content_list = []
    if state.get("KnownKnowledge"):
        content_list.extend(state.get("KnownKnowledge", []))
    # Extract last AI message feedback
    history = state.get("history_messages", []) or []
    if history:
        last_ai = next((m for m in reversed(history) if isinstance(m, AIMessage)), None)
        if last_ai:
            content_list.append(str(last_ai.content))
    if not content_list:
        content_list = [topic]

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
            metadatas=[{"topic": topic, "source": "feynman_agent"}],
        )

        logger.info(f"Stored mastered concept for user {user_id}: {topic}")
    except Exception as e:
        logger.error(f"Failed to store mastered concept '{topic}' for user {user_id}: {e}")

    return {}


def should_continue(state: AgentState) -> str:
    if state.get("learning_complete"):
        return "continue_to_store_known_knowledge"
    else:
        return "wait_for_next_human_input"


def decide_entry_point(state: AgentState) -> str:
    if state.get("learning_checkpoints"):
        return "assess_context_need"
    else:
        return "generate_learning_goals"


def get_graph(checkpointer):
    """Build and compile the Feynman Agent graph."""
    builder = StateGraph(AgentState, config_schema=Configuration)

    # Nodes
    builder.add_node("generate_learning_goals", generate_learning_goals)
    builder.add_node("assess_context_need", assess_context_need)
    builder.add_node("search_online", search_online)
    builder.add_node("evaluate_user_explanation", evaluate_user_explanation)
    builder.add_node("store_mastered_concept", store_mastered_concept)
    builder.add_node("end_node", lambda state: {})

    # Entry
    builder.set_conditional_entry_point(
        decide_entry_point,
        {
            "generate_learning_goals": "generate_learning_goals",
            "assess_context_need": "assess_context_need",
        },
    )

    # Initial ramp
    builder.add_edge("generate_learning_goals", "assess_context_need")

    # Research loop
    builder.add_conditional_edges(
        "assess_context_need",
        lambda s: "needs_context" if s.get("needs_more_context") else "enough_context",
        {
            "needs_context": "search_online",
            "enough_context": "evaluate_user_explanation",
        },
    )
    builder.add_edge("search_online", "assess_context_need")

    # Evaluation branch
    builder.add_conditional_edges(
        "evaluate_user_explanation",
        should_continue,
        {
            "continue_to_store_known_knowledge": "store_mastered_concept",
            "wait_for_next_human_input": "end_node",
        },
    )

    # Storage to end
    builder.add_edge("store_mastered_concept", "end_node")
    builder.add_edge("end_node", "__end__")

    return builder.compile(checkpointer=checkpointer)

