# this file will handle the most import chat message, getting incoming chat,
# depends on the mode (feynman or learning mode) to decide our agent work flow
# the real agent work flow will be in the folder agent_workflow 

import os
import asyncio
import logging
from typing import Optional, AsyncGenerator, Dict, Any
from dotenv import load_dotenv,find_dotenv
from langchain_anthropic import ChatAnthropic
from langchain.schema import HumanMessage, SystemMessage, BaseMessage
from langchain.callbacks.streaming_stdout import StreamingStdOutCallbackHandler
from langchain.callbacks.base import AsyncCallbackHandler

# Load environment variables
load_dotenv(find_dotenv())

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class StreamingHandler(AsyncCallbackHandler):
    """Custom async callback handler for streaming responses"""
    def __init__(self):
        self.tokens = []
    
    async def on_llm_new_token(self, token: str, **kwargs) -> None:
        self.tokens.append(token)

class ChatService:
    """Production-ready chat service with caching and async support"""
    
    def __init__(self):
        self._llm: Optional[ChatAnthropic] = None
        self._streaming_llm: Optional[ChatAnthropic] = None
        self.conversation_history: Dict[str, list[BaseMessage]] = {}
        
    @property
    def llm(self) -> ChatAnthropic:
        """Lazy initialization of LLM model (cached for reuse)"""
        if self._llm is None:
            self._llm = ChatAnthropic(
                model=os.getenv("ANTHROPIC_MODEL", "claude-3-5-sonnet-20241022"),
                temperature=float(os.getenv("ANTHROPIC_TEMPERATURE", "0.7")),
                anthropic_api_key=os.getenv("ANTHROPIC_API_KEY"),
                max_tokens=int(os.getenv("MAX_TOKENS", "1000")),
                timeout=30,  # 30 second timeout
            )
        return self._llm
    
    @property 
    def streaming_llm(self) -> ChatAnthropic:
        """Streaming version of LLM for real-time responses"""
        if self._streaming_llm is None:
            self._streaming_llm = ChatAnthropic(
                model=os.getenv("ANTHROPIC_MODEL", "claude-3-5-sonnet-20241022"),
                temperature=float(os.getenv("ANTHROPIC_TEMPERATURE", "0.7")),
                anthropic_api_key=os.getenv("ANTHROPIC_API_KEY"),
                max_tokens=int(os.getenv("MAX_TOKENS", "1000")),
                timeout=30,
                streaming=True,
            )
        return self._streaming_llm

    def get_system_message(self, mode: str = "default") -> SystemMessage:
        """Get system message based on chat mode"""
        system_prompts = {
            "feynman": """
            You are a Feynman-style tutor. Explain complex concepts in simple terms,
            use analogies, and help users truly understand by breaking things down.
            Ask clarifying questions and encourage active learning.
            """,
            "learning": """
            You are a learning assistant. Help users study effectively,
            provide structured explanations, suggest practice methods,
            and adapt to their learning style.
            """,
            "default": """
            You are a helpful AI assistant. Provide clear, concise, and accurate responses.
            Be friendly, professional, and helpful in all interactions.
            """
        }
        
        content = system_prompts.get(mode, system_prompts["default"])
        return SystemMessage(content=content)

    async def handle_chat_complete(
        self, 
        message: str, 
        session_id: Optional[str] = None,
        mode: str = "default",
        use_history: bool = True
    ) -> str:
        """
        ⚠️  Only use this for special cases like API integrations
        
        """
        try:
            # Build message history
            messages = []
            
            # Add system message
            messages.append(self.get_system_message(mode))
            
            # Add conversation history if enabled and available
            if use_history and session_id and session_id in self.conversation_history:
                # Keep only last 10 messages to manage context window
                recent_history = self.conversation_history[session_id][-10:]
                messages.extend(recent_history)
            
            # Add current human message
            human_message = HumanMessage(content=message)
            messages.append(human_message)
            
            # Get response from LLM asynchronously
            response = await asyncio.to_thread(self.llm.invoke, messages)
            
            # Store conversation history
            if session_id:
                if session_id not in self.conversation_history:
                    self.conversation_history[session_id] = []
                
                self.conversation_history[session_id].extend([
                    human_message,
                    response
                ])
            
            logger.info(f"Complete chat response generated for session: {session_id}")
            return response.content
            
        except Exception as e:
            logger.error(f"Error in chat service: {str(e)}")
            return "I apologize, but I'm experiencing technical difficulties. Please try again in a moment."

    async def handle_chat(
        self, 
        message: str, 
        session_id: Optional[str] = None,
        mode: str = "default",
        use_history: bool = True
    ) -> AsyncGenerator[str, None]:
        """
        🚀 MAIN CHAT FUNCTION - Always streams responses for better UX!
        """
        try:
            messages = []
            messages.append(self.get_system_message(mode))
            
            # Add conversation history if enabled and available
            if use_history and session_id and session_id in self.conversation_history:
                recent_history = self.conversation_history[session_id][-10:]
                messages.extend(recent_history)
            
            # Add current human message
            human_message = HumanMessage(content=message)
            messages.append(human_message)
            
            # Stream response in real-time! 🚀
            full_response = ""
            async for chunk in self.streaming_llm.astream(messages):
                if chunk.content:
                    full_response += chunk.content
                    yield chunk.content  # Send immediately to user!
            
            # Store conversation history after streaming is complete
            if session_id:
                if session_id not in self.conversation_history:
                    self.conversation_history[session_id] = []
                
                self.conversation_history[session_id].extend([
                    human_message,
                    HumanMessage(content=full_response)  # Store complete response
                ])
            
            logger.info(f"Streamed chat response completed for session: {session_id}")
                
        except Exception as e:
            logger.error(f"Error in streaming chat: {str(e)}")
            yield "I apologize, but I'm experiencing technical difficulties. Please try again in a moment."

    async def stream_chat(
        self, 
        message: str, 
        session_id: Optional[str] = None,
        mode: str = "default"
    ) -> AsyncGenerator[str, None]:
        """
        🔄 ALIAS for handle_chat() - both do the same thing now!
        Kept for backward compatibility
        """
        async for token in self.handle_chat(message, session_id, mode):
            yield token

    def clear_session(self, session_id: str) -> None:
        """Clear conversation history for a session"""
        if session_id in self.conversation_history:
            del self.conversation_history[session_id]
            logger.info(f"Cleared session: {session_id}")

    def get_session_history(self, session_id: str) -> list[BaseMessage]:
        """Get conversation history for a session"""
        return self.conversation_history.get(session_id, [])

# Global instance for reuse across requests
chat_service = ChatService()

# 🚀 MAIN CONVENIENCE FUNCTIONS - Always streaming by default!
async def handle_chat(message: str, session_id: Optional[str] = None, mode: str = "default"):
    """
    🚀 PRIMARY CHAT FUNCTION - Streams responses for better UX
    """
    async for token in chat_service.handle_chat(message, session_id, mode):
        yield token


# Backward compatibility aliases
async def stream_chat_response(message: str, session_id: Optional[str] = None, mode: str = "default"):
    """🔄 ALIAS for handle_chat() - same function, kept for compatibility"""
    async for token in handle_chat(message, session_id, mode):
        yield token







