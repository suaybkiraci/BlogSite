from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from app.routers import auth, gemini, contact, admin, blog, upload, unsplash, predict
from app.database import engine, Base, SessionLocal
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
import os
import logging

logger = logging.getLogger(__name__)

app = FastAPI()

scheduler = BackgroundScheduler()


def _scheduled_prediction():
    """Her akşam otomatik çalışan tahmin görevi."""
    from app.routers.predict import run_prediction, update_actuals

    db = SessionLocal()
    try:
        update_actuals(db)
        run_prediction(db)
        logger.info("Zamanlanmış tahmin başarıyla tamamlandı")
    except Exception as e:
        logger.error(f"Zamanlanmış tahmin hatası: {e}", exc_info=True)
    finally:
        db.close()


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    os.makedirs("static/uploads/images", exist_ok=True)
    os.makedirs("static/uploads/files", exist_ok=True)
    os.makedirs("static/uploads/profile", exist_ok=True)

    # Borsa kapanışından sonra her gün 18:30'da çalışır (İstanbul saati)
    scheduler.add_job(
        _scheduled_prediction,
        CronTrigger(hour=18, minute=30, timezone="Europe/Istanbul"),
        id="daily_stock_prediction",
        replace_existing=True,
    )
    # Sabah 10:00'da önceki günün gerçek kapanışıyla tahminleri güncelle
    scheduler.add_job(
        lambda: _update_actuals_job(),
        CronTrigger(hour=10, minute=0, timezone="Europe/Istanbul"),
        id="daily_actual_update",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("APScheduler başlatıldı — günlük tahmin 18:30, güncelleme 10:00 (İstanbul)")


def _update_actuals_job():
    from app.routers.predict import update_actuals

    db = SessionLocal()
    try:
        update_actuals(db)
    except Exception as e:
        logger.error(f"Gerçek veri güncelleme hatası: {e}", exc_info=True)
    finally:
        db.close()


@app.on_event("shutdown")
def on_shutdown():
    scheduler.shutdown(wait=False)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://demo.suayb.xyz",
        "https://api.suayb.xyz",
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
app.include_router(predict.router)