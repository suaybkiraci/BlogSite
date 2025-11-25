from fastapi import APIRouter, HTTPException, Depends
from app.schemas.gemini import GeminiRequest, GeminiResponse, ChatRequest
from app.auth import get_current_user
from app.models.user import User
import google.generativeai as genai
import os

router = APIRouter(prefix="/gemini", tags=["gemini"])

# Gemini API key'i al
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

@router.post("/generate", response_model=GeminiResponse)
async def generate_text(
    request: GeminiRequest,
    current_user: User = Depends(get_current_user)
):
    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=500, 
            detail="Gemini API key is not configured. Please set GEMINI_API_KEY in .env file"
        )
    
    try:
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(
            request.prompt,
            generation_config=genai.types.GenerationConfig(
                max_output_tokens=request.max_tokens,
                temperature=request.temperature,
            )
        )
        
        return GeminiResponse(
            response=response.text,
            model="gemini-2.5-flash"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/chat")
async def chat(
    request: ChatRequest,
    current_user: User = Depends(get_current_user)
):
    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=500, 
            detail="Gemini API key is not configured. Please set GEMINI_API_KEY in .env file"
        )
    
    try:
        if not request.messages:
            raise HTTPException(status_code=400, detail="messages cannot be empty")

        model = genai.GenerativeModel('gemini-2.5-flash')
        chat = model.start_chat(history=[])

        # Build history from all but the last message
        for msg in request.messages[:-1]:
            role = msg.role if msg.role in ("user", "model") else "user"
            chat.history.append({
                'role': role,
                'parts': [msg.content]
            })

        # Send the latest user message
        last = request.messages[-1]
        response = chat.send_message(
            last.content,
            generation_config=genai.types.GenerationConfig(
                temperature=request.temperature,
            )
        )

        return {
            "response": response.text,
            "model": "gemini-2.5-flash"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))