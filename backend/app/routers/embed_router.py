# In your router file (e.g., app/api/routers/embed.py)
from fastapi import FastAPI, HTTPException, Depends, APIRouter, Body
from ..core.chroma_db import chroma_manager
from .auth_dependencies import get_current_user
from langchain.text_splitter import RecursiveCharacterTextSplitter
import logging
import asyncio

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/knowledge",
    tags=["knowledge"]
)

@router.post("/embed")
async def embed_known_knowledge(
    topic: str,
    chunk_size: int = 1000, # ✅ Optional: Define the size of each text chunk
    chunk_overlap: int = 200,  # ✅ Optional: Define the overlap between chunks
    content: str = Body(..., media_type="text/plain"),
    current_user: dict = Depends(get_current_user)
):
    """
    Receives raw text, splits it into chunks, embeds each chunk, and
    stores them in the user's personal knowledge collection in ChromaDB.
    """
    user_id = current_user.get("user_id")
    if not user_id:
        raise HTTPException(status_code=403, detail="User ID not found in token.")

    if not content or not topic:
        raise HTTPException(status_code=400, detail="A 'topic' query parameter and a text body are required.")

    try:
        # --- ADDED: Text Splitting Logic ---
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            length_function=len,
        )
        # The splitter returns a list of strings (the chunks)
        chunks = text_splitter.split_text(content)

        if not chunks:
            raise HTTPException(status_code=400, detail="Content could not be split into chunks.")

        # Get the user-specific collection
        collection_name = f"user_{user_id}_knowledge"
        collection = chroma_manager.get_collection(name=collection_name)

        # Create embeddings for all chunks at once
        embeddings = await asyncio.to_thread(
            chroma_manager.embedding_model.embed_documents, chunks
        )

        # --- MODIFIED: Prepare data for multiple chunks ---
        # Create a unique ID for each chunk (e.g., "my-topic-0", "my-topic-1")
        ids = [f"{topic}-{i}" for i in range(len(chunks))]
        metadatas = [{"topic": topic, "chunk_index": i} for i in range(len(chunks))]

        # Add all chunks, embeddings, and metadatas to the collection
        await asyncio.to_thread(
            collection.add,
            embeddings=embeddings,
            documents=chunks,
            ids=ids,
            metadatas=metadatas
        )

        logger.info(f"Successfully stored {len(chunks)} chunks for user {user_id} on topic: {topic}")
        return {"message": f"Knowledge on topic '{topic}' embedded successfully in {len(chunks)} chunks."}

    except Exception as e:
        logger.error(f"Failed to store knowledge for user {user_id}, topic '{topic}': {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to embed knowledge: {str(e)}")
