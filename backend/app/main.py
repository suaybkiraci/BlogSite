from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from app.routers import auth, gemini, contact, admin, blog, upload, unsplash
from app.database import engine, Base
from fastapi.middleware.cors import CORSMiddleware
import os


app = FastAPI()


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    # Static dizinlerini oluştur
    os.makedirs("static/uploads/images", exist_ok=True)
    os.makedirs("static/uploads/files", exist_ok=True)
    os.makedirs("static/uploads/profile", exist_ok=True)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://demo.suayb.xyz",
        "https://api.suayb.xyz"
        "https://www.demo.suayb.xyz",
        "http://demo.suayb.xyz",
        "https://suayb.xyz",

    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files
app.mount("/static", StaticFiles(directory="static"), name="static")

app.include_router(auth.router)
app.include_router(gemini.router)
app.include_router(contact.router)
app.include_router(admin.router)
app.include_router(upload.router)
app.include_router(blog.router)
app.include_router(unsplash.router)