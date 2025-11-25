import os
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models.blog import BlogPost
from app.models.user import User
from app.schemas.admin import AdminSecretLogin, AdminUserOut, AdminActionResponse
from app.schemas.blog import BlogPostOut


router = APIRouter(prefix="/admin", tags=["admin"])


def ensure_admin(current_user: User) -> None:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can perform this action")

@router.post("/login")
def admin_login(payload: AdminSecretLogin):
    expected_secret = os.getenv("ADMIN_PANEL_SECRET")

    if not expected_secret:
        raise HTTPException(status_code=500, detail="Admin secret not configured")

    if payload.secret != expected_secret:
        raise HTTPException(status_code=401, detail="Incorrect secret")

    return {
        "success": True,
        "message": "Login successful",
        "secret_verified": True
    }

@router.post("/make-admin/{user_id}")
def make_admin(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Make a user an admin - only existing admins can do this"""
    ensure_admin(current_user)

    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    target_user.role = "admin"
    target_user.is_approved = True
    if not target_user.approved_at:
        target_user.approved_at = datetime.utcnow()
    db.commit()
    return {"message": f"User {target_user.username} is now an admin"}

@router.post("/bootstrap-admin")
def bootstrap_admin(
    username: str,
    db: Session = Depends(get_db)
):
    """Emergency endpoint to make the first admin - only works if no admins exist"""
    admin_exists = db.query(User).filter(User.role == "admin").first()
    if admin_exists:
        raise HTTPException(status_code=400, detail="Admin already exists")
    
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.role = "admin"
    user.is_approved = True
    user.is_banned = False
    user.approved_at = datetime.utcnow()
    db.commit()
    return {"message": f"User {user.username} is now the first admin"}


@router.get("/users", response_model=List[AdminUserOut])
def list_users(
    status: Optional[str] = Query(None, regex="^(pending|banned|active)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_admin(current_user)

    query = db.query(User)
    if status == "pending":
        query = query.filter(User.is_approved == False, User.is_banned == False)  # noqa: E712
    elif status == "banned":
        query = query.filter(User.is_banned == True)  # noqa: E712
    elif status == "active":
        query = query.filter(User.is_approved == True, User.is_banned == False)  # noqa: E712

    users = query.order_by(User.created_at.desc()).all()
    blog_counts = dict(
        db.query(BlogPost.author_id, func.count(BlogPost.id))
        .group_by(BlogPost.author_id)
        .all()
    )

    return [
        AdminUserOut(
            id=user.id,
            username=user.username,
            email=user.email,
            role=user.role,
            is_approved=user.is_approved,
            is_banned=user.is_banned,
            created_at=user.created_at,
            approved_at=user.approved_at,
            blog_count=blog_counts.get(user.id, 0),
        )
        for user in users
    ]


@router.post("/users/{user_id}/approve", response_model=AdminActionResponse)
def approve_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_admin(current_user)

    target_user = db.get(User, user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    if target_user.is_approved and not target_user.is_banned:
        return AdminActionResponse(message="User already approved")

    target_user.is_approved = True
    target_user.is_banned = False
    target_user.approved_at = datetime.utcnow()
    db.commit()
    return AdminActionResponse(message=f"{target_user.username} approved successfully")


@router.post("/users/{user_id}/ban", response_model=AdminActionResponse)
def ban_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_admin(current_user)

    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Admins cannot ban themselves")

    target_user = db.get(User, user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    if target_user.is_banned:
        return AdminActionResponse(message="User already banned")

    target_user.is_banned = True
    db.commit()
    return AdminActionResponse(message=f"{target_user.username} has been banned")


@router.post("/users/{user_id}/unban", response_model=AdminActionResponse)
def unban_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_admin(current_user)

    target_user = db.get(User, user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    if not target_user.is_banned:
        return AdminActionResponse(message="User is not banned")

    target_user.is_banned = False
    db.commit()
    return AdminActionResponse(message=f"{target_user.username} ban removed")


@router.get("/users/{user_id}/blogs", response_model=List[BlogPostOut])
def get_user_blogs(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_admin(current_user)

    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    posts = (
        db.query(BlogPost)
        .filter(BlogPost.author_id == user_id)
        .order_by(BlogPost.created_at.desc())
        .all()
    )
    return posts

