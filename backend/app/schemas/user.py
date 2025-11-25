from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr


class UserBase(BaseModel):
    username: str
    email: EmailStr


class UserCreate(UserBase):
    password: str


class UserLogin(BaseModel):
    username: str
    password: str


class UserOut(UserBase):
    id: int
    role: str
    is_approved: bool
    is_banned: bool
    created_at: datetime
    approved_at: Optional[datetime]
    profile_image: Optional[str] = None

    class Config:
        from_attributes = True


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str


class EmailChangeRequest(BaseModel):
    new_email: EmailStr
    current_password: str

