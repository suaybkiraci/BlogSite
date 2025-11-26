from datetime import datetime, timedelta, timezone
import os
from typing import Optional, Dict, Any

from jose import jwt, JWTError
from pydantic_settings import BaseSettings, SettingsConfigDict  
from fastapi import Depends, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User    

class Settings(BaseSettings):
    SECRET_KEY: str = os.getenv("SECRET_KEY")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    UNSPLASH_ACCESS_KEY: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore",
    )

settings = Settings()
security = HTTPBearer()
security_optional = HTTPBearer(auto_error=False)

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> Dict[str, Any]:
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security),
    db: Session = Depends(get_db)
) -> User:
    token = credentials.credentials


    try:
        payload = decode_access_token(token)
        sub = payload.get("sub")
        if not sub:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = db.get(User, int(sub))
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        if user.is_banned:
            raise HTTPException(status_code=403, detail="User is banned")
        if not user.is_approved:
            raise HTTPException(status_code=403, detail="Account pending approval")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security_optional),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Token varsa user döner, yoksa None döner (hata fırlatmaz)"""
    if not credentials:
        return None
    
    try:
        payload = decode_access_token(credentials.credentials)
        sub = payload.get("sub")
        if not sub:
            return None
        user = db.get(User, int(sub))
        if not user or user.is_banned or not user.is_approved:
            return None
        return user
    except JWTError:
        return None
