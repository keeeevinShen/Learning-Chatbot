import os
from typing import TypedDict, Annotated
from dotenv import load_dotenv
from pathlib import Path
from langgraph.graph import StateGraph
from langgraph.graph.message import add_messages

from langchain_anthropic import ChatAnthropic
script_dir = Path(__file__).parent.parent.parent
dotenv_path = script_dir.parent / '.env'
load_dotenv(dotenv_path=dotenv_path)
load_dotenv()
if not os.getenv("ANTHROPIC_API_KEY"):
    raise ValueError("ANTHROPIC_API_KEY not found in environment variables.")



# 1. Define the state for our agent
class State(TypedDict):
    messages: Annotated[list, add_messages]

# 2. Define the node that calls the OpenAI model
def chatbot(state: State):
    """This is a node that calls the LLM."""
    return {"messages": [llm.invoke(state["messages"])]}

# Initialize the Anthropic model (claude-3-5-sonnet is a great choice)
llm = ChatAnthropic(model="claude-3-5-sonnet-20241022")





# 3. Define the graph
graph_builder = StateGraph(State)
graph_builder.add_node("chatbot", chatbot)
graph_builder.set_entry_point("chatbot")
graph_builder.set_finish_point("chatbot")

# Compile the graph into a runnable object
app = graph_builder.compile()

# 4. Run the agent to generate a trace in LangSmith
input_data = {"messages": [("human", "What is the weather in San Francisco?")]}
for event in app.stream(input_data):
    for value in event.values():
        print(value)