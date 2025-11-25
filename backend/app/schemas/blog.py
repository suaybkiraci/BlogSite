from pydantic import BaseModel, HttpUrl
from datetime import datetime
from typing import Optional, List

class BlogTagBase(BaseModel):
    name: str
    slug: str

class BlogTagOut(BlogTagBase):
    id: int
    class Config:
        from_attributes = True

class BlogAttachmentOut(BaseModel):
    id: int
    filename: str
    file_url: str
    file_type: Optional[str]
    file_size: Optional[int]
    uploaded_at: datetime
    class Config:
        from_attributes = True

class BlogCommentCreate(BaseModel):
    content: str

class BlogCommentOut(BaseModel):
    id: int
    post_id: int
    content: str
    author_id: int
    author_username: Optional[str]=None
    created_at: datetime
    
    class Config:
        from_attributes = True

class BlogPostCreate(BaseModel):
    title: str
    content: str
    excerpt: Optional[str]
    cover_image: Optional[str]
    is_published: bool = False
    # tag_ids: List[int] = []

class BlogPostUpdate(BaseModel):
    title: Optional[str]
    content: Optional[str]
    excerpt: Optional[str]
    cover_image: Optional[str]
    is_published: Optional[bool]
    # tag_ids: Optional[List[int]]

class BlogPostOut(BaseModel):
    id: int
    title: str
    slug: str
    content: str
    excerpt: Optional[str]
    cover_image: Optional[str]
    is_published: bool
    is_approved: bool
    views: int
    author_id: int
    author_username: Optional[str]=None
    created_at: datetime
    updated_at: datetime
    comments: List[BlogCommentOut]
    # tags: List[BlogTagOut]
    attachments: List[BlogAttachmentOut]
    
    class Config:
        from_attributes = True

class BlogPostListItem(BaseModel):
    id: int
    title: str
    slug: str
    excerpt: Optional[str]
    cover_image: Optional[str]
    is_published: bool
    is_approved: bool
    views: int
    created_at: datetime
    author_id: int
    author_username: Optional[str]=None
    # tags: List[BlogTagOut]
    
    class Config:
        from_attributes = True


