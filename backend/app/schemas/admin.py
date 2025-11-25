from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr


class AdminSecretLogin(BaseModel):
    secret: str


class AdminUserOut(BaseModel):
    id: int
    username: str
    email: EmailStr
    role: str
    is_approved: bool
    is_banned: bool
    created_at: datetime
    approved_at: Optional[datetime]
    blog_count: int

    class Config:
        from_attributes = True


class AdminActionResponse(BaseModel):
    success: bool = True
    message: str