# Stage 1: Build the frontend
FROM node:18-slim AS frontend-builder
WORKDIR /app/frontend
# Copy package files first for better caching
COPY frontend/package*.json ./
RUN npm install
# Copy the rest of the frontend source
COPY frontend/ ./
# Build the Vite app (produces /app/frontend/dist)
RUN npm run build

# Stage 2: Build the backend and combine
FROM python:3.11-slim
WORKDIR /app

# System dependencies needed for PyMuPDF and faiss
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

ENV OMP_NUM_THREADS=1

# Install Python dependencies
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r ./backend/requirements.txt

# Pre-download the fastembed model at build time (avoids runtime RAM spike)
RUN python -c "from fastembed import TextEmbedding; TextEmbedding(model_name='BAAI/bge-small-en-v1.5')"

# Copy backend source
COPY backend/ ./backend/

# Copy built frontend assets into a 'static' folder accessible to FastAPI
COPY --from=frontend-builder /app/frontend/dist ./backend/static

EXPOSE 8000

# Run uvicorn inside the backend directory
WORKDIR /app/backend
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
