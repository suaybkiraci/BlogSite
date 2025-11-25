from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
import os
import uuid
from pathlib import Path
from app.database import get_db
from app.auth import get_current_user
from app.models.user import User
from app.schemas.user import UserOut

router = APIRouter(prefix="/upload", tags=["upload"])

UPLOAD_DIR = Path("static/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
PROFILE_DIR = UPLOAD_DIR / "profile"
PROFILE_DIR.mkdir(exist_ok=True)

ALLOWED_IMAGES = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
ALLOWED_FILES = {".pdf", ".docx", ".doc", ".txt"}

@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_IMAGES:
        raise HTTPException(400, "Invalid image format")
    
    unique_name = f"{uuid.uuid4()}{ext}"
    file_path = UPLOAD_DIR / "images" / unique_name
    file_path.parent.mkdir(exist_ok=True)
    
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
    
    return {
        "filename": file.filename,
        "url": f"/static/uploads/images/{unique_name}",
        "size": len(content)
    }

@router.post("/file")
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_FILES:
        raise HTTPException(400, "Invalid file format")
    
    unique_name = f"{uuid.uuid4()}{ext}"
    file_path = UPLOAD_DIR / "files" / unique_name
    file_path.parent.mkdir(exist_ok=True)
    
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
    
    return {
        "filename": file.filename,
        "url": f"/static/uploads/files/{unique_name}",
        "size": len(content),
        "type": ext[1:]
    }


@router.post("/profile-image", response_model=UserOut)
async def upload_profile_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_IMAGES:
        raise HTTPException(400, "Invalid image format")

    unique_name = f"{uuid.uuid4()}{ext}"
    file_path = PROFILE_DIR / unique_name

    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)

    # remove old profile image if stored locally
    old_image = current_user.profile_image
    if old_image:
        candidate = None
        if old_image.startswith("/static/uploads/profile/"):
            candidate = Path(old_image.lstrip("/"))
        elif old_image.startswith("static/uploads/profile/"):
            candidate = Path(old_image)
        elif "/static/uploads/profile/" in old_image:
            filename = old_image.split("/static/uploads/profile/")[-1]
            candidate = PROFILE_DIR / filename

        if candidate:
            try:
                candidate_path = (
                    candidate if candidate.is_absolute() else Path(candidate)
                )
                if candidate_path.exists():
                    candidate_path.unlink()
            except Exception:
                pass

    current_user.profile_image = f"/static/uploads/profile/{unique_name}"
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user