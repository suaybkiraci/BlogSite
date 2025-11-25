from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session, joinedload
from typing import Dict, List, Optional
from app.database import get_db
from app.auth import get_current_user, get_current_user_optional
from app.models.user import User
from app.models.blog import BlogPost, BlogAttachment, BlogComment
from app.schemas.blog import BlogPostCreate, BlogPostUpdate, BlogPostOut, BlogPostListItem, BlogTagOut, BlogCommentCreate, BlogCommentOut
import re
from datetime import datetime, timedelta
from sqlalchemy import or_, and_

router = APIRouter(prefix="/blog", tags=["blog"])

# A simple in-memory tracker to avoid counting duplicate views from the same user/IP
VIEW_COOLDOWN = timedelta(hours=1)
recent_views: Dict[str, datetime] = {}

def create_slug(title: str) -> str:
    """Başlıktan URL-friendly slug oluştur"""
    slug = title.lower()
    slug = re.sub(r'[^\w\s-]', '', slug)
    slug = re.sub(r'[\s_-]+', '-', slug)
    slug = re.sub(r'^-+|-+$', '', slug)
    return slug

@router.post("/", response_model=BlogPostOut)
def create_blog_post(
    post: BlogPostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Yeni blog yazısı oluştur (tüm kullanıcılar)"""
    slug = create_slug(post.title)
    # Slug benzersizliği kontrol et
    existing = db.query(BlogPost).filter(BlogPost.slug == slug).first()
    if existing:
        slug = f"{slug}-{int(datetime.now().timestamp())}"
    
    # Admin ise otomatik onaylı, değilse onay bekler
    is_approved = current_user.role == "admin"
    
    db_post = BlogPost(
        title=post.title,
        slug=slug,
        content=post.content,
        excerpt=post.excerpt,
        cover_image=post.cover_image,
        is_published=post.is_published,
        is_approved=is_approved,
        author_id=current_user.id
    )
    db.add(db_post)
    db.commit()
    db.refresh(db_post)
    
    # Etiketleri ekle
    # for tag_id in post.tag_ids:
    #     tag_relation = BlogPostTag(post_id=db_post.id, tag_id=tag_id)
    #     db.add(tag_relation)
    # db.commit()
    db.refresh(db_post)
    
    return db_post

@router.get("/", response_model=List[BlogPostListItem])
def list_blog_posts(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    # tag: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Blog listesi (public: sadece onaylı ve yayınlanmış, admin: hepsi)"""
    query = db.query(BlogPost)
    
    # Admin değilse sadece onaylı ve yayınlanmış postları göster
    if not current_user:
          query = query.filter(
              BlogPost.is_published == True,
              BlogPost.is_approved == True
          )
    elif current_user.role != "admin":
          query = query.filter(
              or_(
                  and_(
                      BlogPost.is_published == True,
                      BlogPost.is_approved == True
                  ),
                  BlogPost.author_id == current_user.id
              )
          )
    
    # if tag:
    #     query = query.join(BlogPost.tags).filter(BlogTag.slug == tag)
    
    query = query.order_by(BlogPost.created_at.desc())
    posts = query.offset(skip).limit(limit).all()
    result = []
    for post in posts:
        post_dict = {
            "id": post.id,
            "title": post.title,
            "slug": post.slug,
            "excerpt": post.excerpt,
            "cover_image": post.cover_image,
            "is_published": post.is_published,
            "is_approved": post.is_approved,
            "views": post.views,
            "author_id": post.author_id,
            "author_username": post.author.username if post.author else None,
            "created_at": post.created_at,
        }
        result.append(post_dict)
    
    return result

@router.get("/id/{post_id}", response_model=BlogPostOut)
def get_blog_post_by_id(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Blog yazısını ID ile getir (yazar ve admin için)"""
    post = db.query(BlogPost).options(joinedload(BlogPost.author), joinedload(BlogPost.comments).joinedload(BlogComment.author)).filter(BlogPost.id == post_id).first()
    if not post:
        raise HTTPException(404, "Blog post not found")
    
    # Sadece yazar veya admin erişebilir
    if current_user.role != "admin" and post.author_id != current_user.id:
        raise HTTPException(403, "You don't have permission to access this post")
    
    post_dict = {
        "id": post.id,
        "title": post.title,
        "slug": post.slug,
        "content": post.content,
        "excerpt": post.excerpt,
        "cover_image": post.cover_image,
        "is_published": post.is_published,
        "is_approved": post.is_approved,
        "views": post.views,
        "author_id": post.author_id,
        "author_username": post.author.username if post.author else None,
        "created_at": post.created_at,
        "updated_at": post.updated_at,
        "attachments": post.attachments,
        "comments": [
        {
            "id": c.id,
            "post_id": c.post_id,
            "content": c.content,
            "author_id": c.author_id,
            "author_username": c.author.username if c.author else None,
            "created_at": c.created_at,
        }
        for c in post.comments
    ],
    }
    return post_dict

@router.get("/{slug}", response_model=BlogPostOut)
def get_blog_post(
    slug: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Tek blog yazısı (slug ile)"""
    post = db.query(BlogPost).options(joinedload(BlogPost.author), joinedload(BlogPost.comments).joinedload(BlogComment.author)).filter(BlogPost.slug == slug).first()
    if not post:
        raise HTTPException(404, "Blog post not found")
    
    # Onaysız veya yayınlanmamış ise sadece yazar veya admin görebilir
    if not post.is_published or not post.is_approved:
        if not current_user:
            raise HTTPException(403, "This post is not available")
        if current_user.role != "admin" and post.author_id != current_user.id:
            raise HTTPException(403, "This post is not available")
    
    viewer_identifier = str(current_user.id) if current_user else (request.client.host if request.client else "anonymous")
    view_key = f"{post.id}:{viewer_identifier}"
    now = datetime.utcnow()
    last_view = recent_views.get(view_key)
    if not last_view or now - last_view > VIEW_COOLDOWN:
        post.views += 1
        db.commit()
        recent_views[view_key] = now
    
    post_dict = {
        "id": post.id,
        "title": post.title,
        "slug": post.slug,
        "content": post.content,
        "excerpt": post.excerpt,
        "cover_image": post.cover_image,
        "is_published": post.is_published,
        "is_approved": post.is_approved,
        "views": post.views,
        "author_id": post.author_id,
        "author_username": post.author.username if post.author else None,
        "created_at": post.created_at,
        "updated_at": post.updated_at,
        "attachments": post.attachments,
        "comments": [
        {
            "id": c.id,
            "post_id": c.post_id,
            "content": c.content,
            "author_id": c.author_id,
            "author_username": c.author.username if c.author else None,
            "created_at": c.created_at,
        }
        for c in post.comments
    ],
    }
    
    return post_dict
    

@router.put("/{post_id}", response_model=BlogPostOut)
def update_blog_post(
    post_id: int,
    post_update: BlogPostUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Blog yazısını güncelle (yazar veya admin)"""
    db_post = db.get(BlogPost, post_id)
    if not db_post:
        raise HTTPException(404, "Blog post not found")
    
    # Sadece yazar veya admin güncelleyebilir
    if current_user.role != "admin" and db_post.author_id != current_user.id:
        raise HTTPException(403, "You don't have permission to update this post")
    
    update_data = post_update.dict(exclude_unset=True)
    
    # Admin değilse is_approved alanını değiştiremez
    if current_user.role != "admin" and "is_approved" in update_data:
        update_data.pop("is_approved")
    
    if "title" in update_data:
        db_post.slug = create_slug(update_data["title"])
    
    # if "tag_ids" in update_data:
    #     # Mevcut etiketleri sil
    #     db.query(BlogPostTag).filter(BlogPostTag.post_id == post_id).delete()
    #     # Yeni etiketleri ekle
    #     tag_ids = update_data.pop("tag_ids")
    #     if tag_ids is not None:
    #         for tag_id in tag_ids:
    #             # Veritabanında bu tag var mı kontrol et
    #             if not db.query(BlogTag).filter(BlogTag.id == tag_id).first():
    #                 continue
    #             tag_relation = BlogPostTag(post_id=post_id, tag_id=tag_id)
    #             db.add(tag_relation)
    
    for key, value in update_data.items():
        setattr(db_post, key, value)
    
    db_post.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_post)
    return db_post

@router.delete("/{post_id}")
def delete_blog_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Blog yazısını sil (yazar veya admin)"""
    db_post = db.get(BlogPost, post_id)
    if not db_post:
        raise HTTPException(404, "Blog post not found")
    
    # Sadece yazar veya admin silebilir
    if current_user.role != "admin" and db_post.author_id != current_user.id:
        raise HTTPException(403, "You don't have permission to delete this post")
    
    db.delete(db_post)
    db.commit()
    return {"message": "Blog post deleted"}

@router.post("/{post_id}/approve")
def approve_blog_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Blog yazısını onayla (sadece admin)"""
    if current_user.role != "admin":
        raise HTTPException(403, "Only admins can approve blog posts")
    
    db_post = db.get(BlogPost, post_id)
    if not db_post:
        raise HTTPException(404, "Blog post not found")
    
    db_post.is_approved = True
    db.commit()
    return {"message": "Blog post approved"}

@router.post("/{post_id}/unapprove")
def unapprove_blog_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Blog yazısının onayını kaldır (sadece admin)"""
    if current_user.role != "admin":
        raise HTTPException(403, "Only admins can unapprove blog posts")
    
    db_post = db.get(BlogPost, post_id)
    if not db_post:
        raise HTTPException(404, "Blog post not found")
    
    db_post.is_approved = False
    db.commit()
    return {"message": "Blog post approval removed"}

# Tag yönetimi (Kaldırıldı/Devre dışı bırakıldı)
# @router.get("/tags/", response_model=List[BlogTagOut])
# def list_tags(db: Session = Depends(get_db)):
#     """Tüm etiketleri listele"""
#     return db.query(BlogTag).all()

# @router.post("/tags/", response_model=BlogTagOut)
# def create_tag(
#     name: str,
#     db: Session = Depends(get_db),
#     current_user: User = Depends(get_current_user)
# ):
#     """Yeni etiket oluştur (sadece admin)"""
#     if current_user.role != "admin":
#         raise HTTPException(403, "Only admins can create tags")
#     
#     slug = create_slug(name)
#     existing = db.query(BlogTag).filter(BlogTag.slug == slug).first()
#     if existing:
#         raise HTTPException(400, "Tag already exists")
#     
#     tag = BlogTag(name=name, slug=slug)
#     db.add(tag)
#     db.commit()
#     db.refresh(tag)
#     return tag

@router.post("/{post_id}/comments", response_model=BlogCommentOut)
def create_comment(
    post_id: int,
    comment: BlogCommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)

):
    """Yeni yorum oluştur"""
    db_post = db.get(BlogPost, post_id)
    if not db_post:
        raise HTTPException(404, "Blog post not found")
    
    db_comment = BlogComment(
        post_id=post_id,
        content=comment.content,
        author_id=current_user.id,
    )
    db.add(db_comment)
    db.commit()
    db.refresh(db_comment)
    return {
    "id": db_comment.id,
    "post_id": db_comment.post_id,
    "content": db_comment.content,
    "author_id": db_comment.author_id,
    "author_username": current_user.username,
    "created_at": db_comment.created_at,
}

@router.get("/{post_id}/comments", response_model=List[BlogCommentOut])
def list_comments(
    post_id: int,
    db: Session = Depends(get_db),
):
    """Yorumları listele"""
    db_post = db.get(BlogPost, post_id)
    if not db_post:
        raise HTTPException(404, "Blog post not found")
    return [
    {
        "id": c.id,
        "post_id": c.post_id,
        "content": c.content,
        "author_id": c.author_id,
        "author_username": c.author.username if c.author else None,
        "created_at": c.created_at,
    }
    for c in db_post.comments
]


@router.delete("/{post_id}/comments/{comment_id}")
def delete_comment(
    post_id: int,
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Yorumu sil (yazar veya admin)"""
    db_comment = db.get(BlogComment, comment_id)
    if not db_comment:
        raise HTTPException(404, "Comment not found")
    db.delete(db_comment)
    db.commit()
    return {"message": "Comment deleted"}