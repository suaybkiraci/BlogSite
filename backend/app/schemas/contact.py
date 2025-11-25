from pydantic import BaseModel, EmailStr, Field
from datetime import datetime

class ContactMessageCreate(BaseModel):
    name: str
    email: EmailStr
    message: str

class ContactMessageOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    message: str
    created_at: datetime
    is_read: bool = Field(default=False)

    class Config:
        from_attributes = True