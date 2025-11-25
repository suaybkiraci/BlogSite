from pydantic import BaseModel
from typing import Optional, List, Literal

class GeminiRequest(BaseModel):
    prompt: str
    max_tokens: Optional[int] = 1000
    temperature: Optional[float] = 0.7

class GeminiResponse(BaseModel):
    response: str
    model: str
    
class ChatMessage(BaseModel):
    role: Literal["user", "model"] = "user"
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    temperature: Optional[float] = 0.7