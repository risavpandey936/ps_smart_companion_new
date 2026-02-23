FROM python:3.11-slim

WORKDIR /app

# System dependencies needed for PyMuPDF and faiss
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download the fastembed model at build time (avoids runtime RAM spike)
RUN python -c "from fastembed import TextEmbedding; TextEmbedding(model_name='BAAI/bge-small-en-v1.5')"

# Copy app source
COPY . .

EXPOSE 8000

# Use shell form so $PORT is expanded at runtime
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
