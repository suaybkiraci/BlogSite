from sqlalchemy import Column, Integer, String
from app.database import Base
from datetime import datetime

class ContactMessage(Base):
    __tablename__ = "contact_messages"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, index=True)
    message = Column(String)
    created_at = Column(String, default=datetime.utcnow().isoformat())
    is_read = Column(Integer, default=0)  # 0 for unread, 1 for read