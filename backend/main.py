from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import List, Optional
import os
import json
import datetime
from datetime import timedelta
from dotenv import load_dotenv
from groq import Groq
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session

# Load environment variables
load_dotenv()

# Database Setup
DATABASE_PATH = os.environ.get("DATABASE_URL", "sqlite:///./neuroassist.db")
# If on Render and using a Disk, we usually point to /data/neuroassist.db
if os.path.exists("/data") and "DATABASE_URL" not in os.environ:
    DATABASE_PATH = "sqlite:////data/neuroassist.db"

engine = create_engine(DATABASE_PATH, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Security Configuration
SECRET_KEY = os.environ.get("SECRET_KEY", "your-very-secret-key-change-this-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # 24 hours

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")

# Models
class UserDB(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)

Base.metadata.create_all(bind=engine)

# Pydantic Schemas
class UserCreate(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class QueryRequest(BaseModel):
    query: str
    condition_context: str = "general"

class TaskRequest(BaseModel):
    task_description: str

class TextRequest(BaseModel):
    text: str

# Helper Functions
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(UserDB).filter(UserDB.username == username).first()
    if user is None:
        raise credentials_exception
    return user

# App Initialization
app = FastAPI(title="Neurodiversity Support AI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
CURRENT_MODEL = "llama-3.3-70b-versatile"

# Auth Endpoints
@app.post("/api/register", response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(UserDB).filter(UserDB.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    hashed_pass = get_password_hash(user.password)
    new_user = UserDB(username=user.username, hashed_password=hashed_pass)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/api/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(UserDB).filter(UserDB.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer", "username": user.username}

# Admin Endpoint (Owner Only)
@app.get("/api/admin/users")
def get_all_users(admin_token: str, db: Session = Depends(get_db)):
    # Simple security: check against a secret env variable
    secret = os.environ.get("ADMIN_SECRET_KEY", "hackathon_owner_2026")
    if admin_token != secret:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    users = db.query(UserDB).all()
    return [{"id": u.id, "username": u.username} for u in users]

# Protected AI Endpoints
@app.get("/")
def read_root():
    return {"message": "Neurodiversity Support AI Backend is running"}

@app.post("/api/chat")
def chat_endpoint(request: QueryRequest, current_user: UserDB = Depends(get_current_user)):
    system_prompt = (
        "You are an empathetic AI assistant designed to help neurodivergent individuals (Autism, ADHD, Dyslexia). "
        "Your goal is to provide clear, concise, and supportive answers. "
        "Use bullet points and simple language."
    )
    
    if request.condition_context == "adhd":
        system_prompt += " Focus on breaking things down, offering dopamine-friendly quick wins."
    elif request.condition_context == "dyslexia":
        system_prompt += " Use plain language, short sentences. Format for high readability."
    elif request.condition_context == "autism":
        system_prompt += " Be literal, clear, and avoid ambiguous language."

    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": request.query}
            ],
            model=CURRENT_MODEL,
        )
        return {"response": chat_completion.choices[0].message.content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/breakdown-task")
def breakdown_task(request: TaskRequest, current_user: UserDB = Depends(get_current_user)):
    system_prompt = (
        "You are an executive function assistant. Break down the following task into very small, actionable steps (5-15 mins each). "
        "Return the response as a JSON object with a 'steps' key containing a list of strings."
    )
    
    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Break down this task: {request.task_description}"}
            ],
            model=CURRENT_MODEL,
            response_format={"type": "json_object"}
        )
        return json.loads(chat_completion.choices[0].message.content)
    except Exception:
        # Fallback
        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt + " Just list the steps."},
                {"role": "user", "content": f"Break down this task: {request.task_description}"}
            ],
            model=CURRENT_MODEL,
        )
        return {"steps": [line.strip() for line in chat_completion.choices[0].message.content.split('\n') if line.strip()]}

@app.post("/api/simplify-text")
def simplify_text(request: TextRequest, current_user: UserDB = Depends(get_current_user)):
    system_prompt = "You are a reading assistant for someone with Dyslexia. Rewrite text to be easier to read using simple words and short sentences."
    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": request.text}
            ],
            model=CURRENT_MODEL,
        )
        return {"simplified_text": chat_completion.choices[0].message.content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/time-estimator")
def time_estimator(request: TaskRequest, current_user: UserDB = Depends(get_current_user)):
    system_prompt = "You are a time-management expert. Provide realistic time estimates for tasks and explain potential 'time sinks'."
    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": request.task_description}
            ],
            model=CURRENT_MODEL,
        )
        return {"estimation": chat_completion.choices[0].message.content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
