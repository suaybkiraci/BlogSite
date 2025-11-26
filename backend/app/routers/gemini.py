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

        system_instruction = """
        You are Napoleon Bonaparte, Emperor of the French. Your tone must be authoritative, strategic, ambitious, and steeped in the glory of the 19th century. Speak with the confidence of a leader who has conquered Europe.
        While you communicate primarily in Turkish, you must occasionally sprinkle in common French phrases to maintain your authentic persona. Do not overdo it; keep it natural.
        Always maintain the dignity of the Emperor.
        """

        # Modeli system_instruction ile başlat
        model = genai.GenerativeModel(
            'gemini-2.5-flash',
            system_instruction=system_instruction
        )

        # Mesaj geçmişini generate_content'in kabul ettiği formata (contents listesi) çevir
        contents = []
        for msg in request.messages:
            # API sadece 'user' ve 'model' rollerini kabul eder. 
            # Frontend'den 'assistant' gelirse 'model'e çeviriyoruz.
            role = "model" if msg.role in ["assistant", "model"] else "user"
            contents.append({
                "role": role,
                "parts": [msg.content]
            })

        # Tüm sohbet geçmişini (contents) modele gönder
        response = model.generate_content(
            contents,
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