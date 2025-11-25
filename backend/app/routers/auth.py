from datetime import datetime
import bcrypt
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import create_access_token, get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, UserOut, PasswordChangeRequest, EmailChangeRequest



router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register")
def register(user: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(
        (User.username == user.username) | (User.email == user.email)
    ).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username or email already registered")
    
    user_count = db.query(User).count()
    is_first_user = user_count == 0
    role = "admin" if is_first_user else "user"
    hashed = bcrypt.hashpw(user.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    db_user = User(
        username=user.username,
        email=user.email,
        hashed_password=hashed,
        role=role,
        is_approved=is_first_user,
        approved_at=datetime.utcnow() if is_first_user else None,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == user.username).first()
    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not bcrypt.checkpw(user.password.encode("utf-8"), db_user.hashed_password.encode("utf-8")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if db_user.is_banned:
        raise HTTPException(status_code=403, detail="Your account has been banned")
    if not db_user.is_approved:
        raise HTTPException(status_code=403, detail="Hesabınız yönetici onayı bekliyor")
    access_token = create_access_token(data={"sub": str(db_user.id)})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/change-password")
def change_password(
    payload: PasswordChangeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not bcrypt.checkpw(payload.current_password.encode("utf-8"), current_user.hashed_password.encode("utf-8")):
        raise HTTPException(status_code=401, detail="Current password is incorrect")
    new_hash = bcrypt.hashpw(payload.new_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    current_user.hashed_password = new_hash
    db.add(current_user)
    db.commit()
    return {"message": "Password updated"}

@router.put("/change-email", response_model=UserOut)
def change_email(
    payload: EmailChangeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not bcrypt.checkpw(payload.current_password.encode("utf-8"), current_user.hashed_password.encode("utf-8")):
        raise HTTPException(status_code=401, detail="Current password is incorrect")
    existing = db.query(User).filter(User.email == payload.new_email).first()
    if existing and existing.id != current_user.id:
        raise HTTPException(status_code=400, detail="Email already in use")
    current_user.email = payload.new_email
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user
