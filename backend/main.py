import os
import io
import json
import time
import uuid
import hashlib
import asyncio
from concurrent.futures import ThreadPoolExecutor
import numpy as np
from typing import List, Optional

from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from groq import Groq
import fitz  # PyMuPDF
import faiss
from fastembed import TextEmbedding
# ─────────────────────────────────────────
# Config
# ─────────────────────────────────────────
load_dotenv()
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
GROQ_MODEL = "llama-3.3-70b-versatile"
MAX_PAGES = 130        # max pages per PDF upload
CHUNK_SIZE = 600       # slightly larger = fewer chunks = faster embedding
CHUNK_OVERLAP = 80     # overlap characters between chunks
TOP_K = 5              # top chunks to retrieve
EMBED_BATCH = 32       # embed this many chunks at a time to keep RAM flat
client = Groq(api_key=GROQ_API_KEY)

# ─────────────────────────────────────────
# Embedding model (runs locally, free)
# ─────────────────────────────────────────
print("⏳ Loading embedding model...")
embedder = TextEmbedding(model_name="BAAI/bge-small-en-v1.5")
print("✅ Embedding model loaded.")

# ─────────────────────────────────────────
# In-memory session store
# session_id -> { chunks, index, metadata }
# ─────────────────────────────────────────
sessions: dict = {}
# ─────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────

def extract_text_from_pdf(pdf_bytes: bytes) -> tuple[list[str], int]:
    """Return list of page-text strings and total page count."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    total_pages = doc.page_count
    pages = []
    for i, page in enumerate(doc):
        pages.append(page.get_text())
    doc.close()
    return pages, total_pages


def chunk_text(pages: list[str]) -> list[dict]:
    """Split pages into overlapping chunks, keeping page metadata."""
    chunks = []
    for page_num, page_text in enumerate(pages, start=1):
        page_text = page_text.strip()
        if not page_text:
            continue
        start = 0
        while start < len(page_text):
            end = start + CHUNK_SIZE
            chunk = page_text[start:end]
            if chunk.strip():
                chunks.append({
                    "text": chunk,
                    "page": page_num,
                    "chunk_id": len(chunks)
                })
            start += CHUNK_SIZE - CHUNK_OVERLAP
    return chunks


def build_faiss_index(chunks: list[dict]):
    """Embed chunks in batches and build a FAISS flat L2 index."""
    texts = [c["text"] for c in chunks]
    all_embeddings = []
    # Process in small batches to keep memory usage flat
    for i in range(0, len(texts), EMBED_BATCH):
        batch = texts[i : i + EMBED_BATCH]
        batch_emb = np.array(list(embedder.embed(batch)), dtype="float32")
        all_embeddings.append(batch_emb)
    embeddings = np.vstack(all_embeddings)
    dimension = embeddings.shape[1]
    index = faiss.IndexFlatL2(dimension)
    index.add(embeddings)
    return index, embeddings


def retrieve_top_chunks(query: str, chunks: list[dict], index, top_k: int = TOP_K) -> list[dict]:
    """Embed query and return top-k most similar chunks."""
    q_emb = np.array(list(embedder.embed([query])), dtype="float32")
    distances, indices = index.search(q_emb, top_k)
    results = []
    for idx in indices[0]:
        if idx < len(chunks):
            results.append(chunks[idx])
    return results


def build_context(retrieved: list[dict]) -> str:
    """Combine retrieved chunks into a single context block."""
    parts = []
    for item in retrieved:
        parts.append(f"[Page {item['page']}]\n{item['text']}")
    return "\n\n---\n\n".join(parts)


# ─────────────────────────────────────────
# FastAPI App
# ─────────────────────────────────────────
app = FastAPI(title="PDF RAG Chatbot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────
# Schemas
# ─────────────────────────────────────────
class ChatRequest(BaseModel):
    session_id: str
    question: str
    chat_history: Optional[List[dict]] = []


class SessionInfo(BaseModel):
    session_id: str
    filename: str
    total_pages: int
    total_chunks: int
    created_at: float


# ─────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────

@app.api_route("/", methods=["GET", "HEAD"])
def root():
    return {"message": "PDF RAG Chatbot API is running 🚀"}


@app.post("/api/upload")
async def upload_pdf(file: UploadFile = File(...)):
    """Upload a PDF, extract text, build FAISS index, return session_id."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    pdf_bytes = await file.read()

    # Extract text
    try:
        pages, total_pages = extract_text_from_pdf(pdf_bytes)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to parse PDF: {str(e)}")

    if total_pages > MAX_PAGES:
        raise HTTPException(
            status_code=400,
            detail=f"PDF has {total_pages} pages. Maximum allowed is {MAX_PAGES}. Please upload a shorter document."
        )

    # Chunk
    chunks = chunk_text(pages)
    if not chunks:
        raise HTTPException(status_code=422, detail="No readable text found in the PDF.")

    # Build FAISS index in a thread pool (CPU-bound, avoids blocking event loop / timeout)
    try:
        loop = asyncio.get_event_loop()
        with ThreadPoolExecutor(max_workers=1) as pool:
            index, _ = await loop.run_in_executor(pool, build_faiss_index, chunks)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to build search index: {str(e)}")

    # Store session
    session_id = str(uuid.uuid4())
    sessions[session_id] = {
        "chunks": chunks,
        "index": index,
        "filename": file.filename,
        "total_pages": total_pages,
        "total_chunks": len(chunks),
        "created_at": time.time(),
    }

    return {
        "session_id": session_id,
        "filename": file.filename,
        "total_pages": total_pages,
        "total_chunks": len(chunks),
        "message": f"✅ PDF processed successfully! {total_pages} pages, {len(chunks)} chunks indexed."
    }


@app.post("/api/chat")
def chat(req: ChatRequest):
    """Ask a question against the uploaded PDF."""
    session = sessions.get(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found. Please upload a PDF first.")

    chunks = session["chunks"]
    index = session["index"]
    filename = session["filename"]

    # Retrieve relevant chunks
    retrieved = retrieve_top_chunks(req.question, chunks, index, top_k=TOP_K)
    context = build_context(retrieved)

    # Build messages
    system_prompt = (
        f"You are a precise and helpful AI assistant. You answer questions strictly based on the content "
        f"of the PDF document '{filename}'.\n\n"
        "RULES:\n"
        "- Answer ONLY based on the provided context from the document.\n"
        "- If the answer is not found in the context, say: 'I couldn't find this information in the document.'\n"
        "- Always mention the page number(s) where you found the information.\n"
        "- Be concise but complete.\n"
        "- Use bullet points or numbered lists when appropriate.\n\n"
        f"DOCUMENT CONTEXT:\n{context}"
    )

    messages = [{"role": "system", "content": system_prompt}]

    # Add chat history (last 6 turns for context)
    for h in (req.chat_history or [])[-6:]:
        if h.get("role") in ("user", "assistant") and h.get("content"):
            messages.append({"role": h["role"], "content": h["content"]})

    messages.append({"role": "user", "content": req.question})

    try:
        completion = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=messages,
            temperature=0.2,
            max_tokens=1024,
        )
        answer = completion.choices[0].message.content
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM error: {str(e)}")

    # Source pages for reference
    source_pages = sorted(set(c["page"] for c in retrieved))

    return {
        "answer": answer,
        "source_pages": source_pages,
        "chunks_used": len(retrieved),
    }


@app.get("/api/session/{session_id}")
def get_session(session_id: str):
    """Get info about a session."""
    session = sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    return {
        "session_id": session_id,
        "filename": session["filename"],
        "total_pages": session["total_pages"],
        "total_chunks": session["total_chunks"],
        "created_at": session["created_at"],
    }


@app.delete("/api/session/{session_id}")
def delete_session(session_id: str):
    """Delete a session and free memory."""
    if session_id in sessions:
        del sessions[session_id]
        return {"message": "Session deleted."}
    raise HTTPException(status_code=404, detail="Session not found.")


@app.get("/api/sessions")
def list_sessions():
    """List all active sessions."""
    return [
        {
            "session_id": sid,
            "filename": s["filename"],
            "total_pages": s["total_pages"],
            "created_at": s["created_at"],
        }
        for sid, s in sessions.items()
    ]


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
