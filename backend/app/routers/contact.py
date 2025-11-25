from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.contact import ContactMessageCreate, ContactMessageOut
from app.models.contact import ContactMessage
from app.auth import get_current_user
from app.models.user import User
from typing import List

router = APIRouter(prefix="/contact", tags=["contact"])

@router.post("/", response_model=ContactMessageOut)
def create_contact_message(
    message: ContactMessageCreate,
    db: Session = Depends(get_db)
):
    db_message = ContactMessage(
        name=message.name,
        email=message.email,
        message=message.message
    )
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    return db_message

@router.get("/", response_model=List[ContactMessageOut])
def get_all_messages(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can view messages")
    messages = db.query(ContactMessage).order_by(ContactMessage.created_at.desc()).all()
    return messages

@router.put("/{message_id}/read")
def mark_as_read(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can perform this action")
    message = db.get(ContactMessage, message_id)
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    message.is_read = 1
    db.commit()
    return {"message": "Marked as read"}