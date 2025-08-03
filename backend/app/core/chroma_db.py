# app/core/database.py
import os
from pathlib import Path
from typing import Optional
import chromadb
from chromadb.config import Settings
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from dotenv import load_dotenv,find_dotenv

load_dotenv(find_dotenv())

# Database-specific constants
CHROMA_DB_PATH = Path("./chroma_db")

class ChromaDBManager:
    _instance: Optional['ChromaDBManager'] = None
    _client: Optional[chromadb.PersistentClient] = None
    _embedding_model: Optional[GoogleGenerativeAIEmbeddings] = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if self._client is None:
            self._initialize()
    
    def _initialize(self):
        """Initialize ChromaDB and embeddings."""
        # Get API key
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY not found")
        
        # Create directory
        CHROMA_DB_PATH.mkdir(exist_ok=True)
        
        # Initialize ChromaDB
        self._client = chromadb.PersistentClient(
            path=str(CHROMA_DB_PATH),
            settings=Settings(
                anonymized_telemetry=False,
                allow_reset=True
            )
        )
        
        # Initialize embedding model
        self._embedding_model = GoogleGenerativeAIEmbeddings(
            model="models/embedding-001",
            google_api_key=api_key
        )
    
    @property
    def client(self) -> chromadb.PersistentClient:
        return self._client
    
    @property
    def embedding_model(self) -> GoogleGenerativeAIEmbeddings:
        return self._embedding_model
    
    def get_collection(self, name: str ):
        return self._client.get_or_create_collection(name=name)

# Singleton instance
chroma_manager = ChromaDBManager()