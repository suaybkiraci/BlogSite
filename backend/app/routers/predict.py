from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.prediction import StockPrediction
from app.schemas.prediction import PredictionOut, ComparisonItem, StatsOut
import numpy as np
import os
import logging
from datetime import datetime, timedelta
from typing import List

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/predict", tags=["predict"])

TICKER = "GARAN.IS"
BACKCANDLES = 10
_artifacts_dir = os.path.join(os.path.dirname(__file__), "..")

# ──────────────────────────────────────────────────────────────
# Yavaş değişen Türkiye ekonomik göstergeleri.
# TCMB faiz kararı veya TÜİK enflasyon verisi geldiğinde
# bu env var'ları veya aşağıdaki değerleri güncelleyin.
# ──────────────────────────────────────────────────────────────
TR_INTEREST_RATE = float(os.getenv("TR_INTEREST_RATE", "38.75"))
TR_INFLATION = float(os.getenv("TR_INFLATION", "58.51"))

# turkiye_data.csv sütun sırası (Date hariç)
MACRO_COLS = [
    "vix_index", "us_10y_yield", "usd_try",
    "tr_interest_rate", "tr_inflation",
    "vix_change_1d", "gold_change_1d", "us_yield_change_1d",
    "vix_change_5d", "gold_change_5d", "us_yield_change_5d",
    "usd_try_change_20d", "tr_interest_change_20d", "tr_m2_growth_20d",
    "tr_inflation_change_250d", "gold_try_change_1d", "tr_real_interest",
    "vix_high", "vix_extreme", "us_yield_high",
    "vix_above_sma20", "gold_above_sma20", "gold_trend",
    "usd_try_above_sma20",
]

_model = None
_scaler = None
_n_features = None
_feature_names = None


def _load_artifacts():
    global _model, _scaler, _n_features, _feature_names
    if _model is not None:
        return _model, _scaler, _n_features, _feature_names

    import joblib
    from tensorflow.keras.models import load_model

    model_path = os.path.join(_artifacts_dir, "model.h5")
    scaler_path = os.path.join(_artifacts_dir, "scaler.pkl")
    n_feat_path = os.path.join(_artifacts_dir, "n_features.npy")

    _model = load_model(model_path)
    _scaler = joblib.load(scaler_path)
    _n_features = int(np.load(n_feat_path))

    if hasattr(_scaler, "feature_names_in_"):
        _feature_names = list(_scaler.feature_names_in_)
    else:
        _feature_names = None

    logger.info(f"Model yüklendi — feature sayısı: {_n_features}")
    if _feature_names:
        logger.info(f"Scaler sütunları: {_feature_names}")

    return _model, _scaler, _n_features, _feature_names


# ── Veri çekme ──────────────────────────────────────────────

def _fetch_stock_data():
    """GARAN.IS hisse verisi + teknik indikatörler."""
    import yfinance as yf
    import pandas as pd

    df = yf.download(TICKER, period="1y", auto_adjust=True)
    if df.empty:
        raise ValueError(f"{TICKER} verisi çekilemedi")
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)

    df["EMAF"] = df["Close"].ewm(span=20, adjust=False).mean()
    df["EMAM"] = df["Close"].ewm(span=100, adjust=False).mean()
    df["EMAS"] = df["Close"].ewm(span=150, adjust=False).mean()

    delta = df["Close"].diff()
    gain = delta.where(delta > 0, 0).rolling(window=14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
    rs = gain / loss
    df["RSI"] = 100 - (100 / (1 + rs))

    ema12 = df["Close"].ewm(span=12, adjust=False).mean()
    ema26 = df["Close"].ewm(span=26, adjust=False).mean()
    df["MACD"] = ema12 - ema26

    return df


def _fetch_macro_data():
    """VIX, US 10Y, USD/TRY, Gold ham verilerini çekip 24 makro feature hesapla."""
    import yfinance as yf
    import pandas as pd

    tickers = {"vix": "^VIX", "us_yield": "^TNX", "usd_try": "USDTRY=X", "gold": "GC=F"}
    raw_frames = {}
    for name, ticker in tickers.items():
        data = yf.download(ticker, period="2y", auto_adjust=True)
        if data.empty:
            raise ValueError(f"{ticker} verisi çekilemedi")
        if isinstance(data.columns, pd.MultiIndex):
            data.columns = data.columns.get_level_values(0)
        raw_frames[name] = data["Close"]

    raw = pd.DataFrame(raw_frames).dropna()

    gold_try = raw["gold"] * raw["usd_try"]

    df = pd.DataFrame(index=raw.index)

    # --- Ham değerler ---
    df["vix_index"] = raw["vix"]
    df["us_10y_yield"] = raw["us_yield"]
    df["usd_try"] = raw["usd_try"]
    df["tr_interest_rate"] = TR_INTEREST_RATE
    df["tr_inflation"] = TR_INFLATION

    # --- Yüzde değişimler ---
    df["vix_change_1d"] = raw["vix"].pct_change(1)
    df["gold_change_1d"] = raw["gold"].pct_change(1)
    df["us_yield_change_1d"] = raw["us_yield"].pct_change(1)
    df["vix_change_5d"] = raw["vix"].pct_change(5)
    df["gold_change_5d"] = raw["gold"].pct_change(5)
    df["us_yield_change_5d"] = raw["us_yield"].pct_change(5)
    df["usd_try_change_20d"] = raw["usd_try"].pct_change(20)

    # Yavaş değişen göstergeler — veriler arası güncelleme yapılmadığında 0
    df["tr_interest_change_20d"] = 0.0
    df["tr_m2_growth_20d"] = 0.0
    df["tr_inflation_change_250d"] = 0.0

    df["gold_try_change_1d"] = gold_try.pct_change(1)

    # Reel faiz = politika faizi − enflasyon
    df["tr_real_interest"] = TR_INTEREST_RATE - TR_INFLATION

    # --- Binary indikatörler ---
    df["vix_high"] = (raw["vix"] > 25).astype(int)
    df["vix_extreme"] = (raw["vix"] > 35).astype(int)

    us_yield_80pct = raw["us_yield"].rolling(252, min_periods=60).quantile(0.80)
    df["us_yield_high"] = (raw["us_yield"] > us_yield_80pct).astype(int)

    df["vix_above_sma20"] = (raw["vix"] > raw["vix"].rolling(20).mean()).astype(int)
    df["gold_above_sma20"] = (raw["gold"] > raw["gold"].rolling(20).mean()).astype(int)
    df["gold_trend"] = (raw["gold"] > raw["gold"].rolling(50).mean()).astype(int)
    df["usd_try_above_sma20"] = (raw["usd_try"] > raw["usd_try"].rolling(20).mean()).astype(int)

    df.index = pd.to_datetime(df.index).normalize()
    return df


# ── Feature hazırlığı ──────────────────────────────────────

def _prepare_features(stock_df, macro_df, n_features, feature_names):
    import pandas as pd

    stock_df.index = pd.to_datetime(stock_df.index).normalize()
    df = stock_df.join(macro_df, how="inner")

    price_cols = ["Close", "High", "Low", "Open", "EMAF", "EMAM", "EMAS"]
    for col in price_cols:
        df[f"log_{col}"] = np.log(df[col])

    stock_feature_cols = [f"log_{c}" for c in price_cols] + ["RSI", "MACD"]

    # Scaler'dan gelen sütun isimlerini kullan (en güvenilir yöntem)
    if feature_names and len(feature_names) > n_features:
        feature_cols = list(feature_names[:n_features])
    else:
        feature_cols = stock_feature_cols + MACRO_COLS

    if len(feature_cols) != n_features:
        raise ValueError(
            f"Feature sayısı uyuşmuyor! Beklenen: {n_features}, "
            f"Hesaplanan: {len(feature_cols)}. "
            f"/predict/info endpoint'ini kontrol edin."
        )

    missing = [c for c in feature_cols if c not in df.columns]
    if missing:
        raise ValueError(f"Eksik sütunlar: {missing}")

    df = df.dropna(subset=feature_cols)
    return df, feature_cols


# ── Tahmin motoru ───────────────────────────────────────────

def run_prediction(db: Session):
    """Tahmin çalıştır, DB'ye kaydet ve döndür."""
    model, scaler, n_features, feature_names = _load_artifacts()

    stock_df = _fetch_stock_data()
    macro_df = _fetch_macro_data()
    df, feature_cols = _prepare_features(stock_df, macro_df, n_features, feature_names)

    if len(df) < BACKCANDLES:
        raise ValueError(
            f"Yeterli veri yok. En az {BACKCANDLES} gün gerekli, {len(df)} gün var."
        )

    recent = df[feature_cols].tail(BACKCANDLES).values
    last_close = float(df["Close"].iloc[-1])
    last_date = df.index[-1]

    # Scaler (features + target) ile fit edildi → dummy target sütunu ekle.
    # MinMaxScaler sütunları bağımsız ölçekler, dummy değer diğerlerini etkilemez.
    dummy_target = np.zeros((BACKCANDLES, 1))
    data_with_dummy = np.column_stack([recent, dummy_target])
    scaled = scaler.transform(data_with_dummy)

    X_features = scaled[:, :n_features]
    X_input = X_features.reshape(1, BACKCANDLES, n_features)

    pred_scaled = model.predict(X_input, verbose=0)

    # Ters ölçekleme: dummy satır oluştur, target sütununa tahmini koy
    dummy_inv = np.zeros((1, n_features + 1))
    dummy_inv[0, -1] = pred_scaled[0, 0]
    pred_log_return = float(scaler.inverse_transform(dummy_inv)[0, -1])

    predicted_close = float(last_close * np.exp(pred_log_return))

    target_date = last_date + timedelta(days=1)
    while target_date.weekday() >= 5:
        target_date += timedelta(days=1)
    target_date = datetime(target_date.year, target_date.month, target_date.day)

    prediction = StockPrediction(
        prediction_date=datetime.utcnow(),
        target_date=target_date,
        ticker=TICKER,
        predicted_log_return=float(pred_log_return),
        predicted_close=round(float(predicted_close), 4),
        last_close=round(float(last_close), 4),
    )
    db.add(prediction)
    db.commit()
    db.refresh(prediction)

    logger.info(
        f"Tahmin → hedef: {target_date.date()}, "
        f"tahmini: {predicted_close:.2f} TL, son kapanış: {last_close:.2f} TL"
    )
    return prediction


def update_actuals(db: Session) -> int:
    """Gerçek kapanış fiyatlarını çekip bekleyen tahminleri güncelle."""
    import yfinance as yf
    import pandas as pd

    pending = (
        db.query(StockPrediction)
        .filter(
            StockPrediction.actual_close.is_(None),
            StockPrediction.target_date <= datetime.utcnow(),
        )
        .all()
    )
    if not pending:
        return 0

    stock = yf.download(TICKER, period="60d", auto_adjust=True)
    if stock.empty:
        return 0
    if isinstance(stock.columns, pd.MultiIndex):
        stock.columns = stock.columns.get_level_values(0)

    updated = 0
    for pred in pending:
        target = pd.Timestamp(pred.target_date).normalize()
        if target in stock.index:
            actual = float(stock.loc[target, "Close"])
            pred.actual_close = round(actual, 4)
            pred.error_pct = round(abs(actual - pred.predicted_close) / actual * 100, 4)
            pred_up = pred.predicted_close > pred.last_close
            actual_up = actual > pred.last_close
            pred.is_direction_correct = pred_up == actual_up
            updated += 1

    db.commit()
    logger.info(f"{updated} tahmin gerçek verilerle güncellendi")
    return updated


# ── API Endpoint'leri ───────────────────────────────────────

@router.post("/run", response_model=PredictionOut)
def trigger_prediction(db: Session = Depends(get_db)):
    """Tahmin çalıştır (manuel tetikleme)."""
    try:
        return run_prediction(db)
    except Exception as e:
        logger.error(f"Tahmin hatası: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/update-actuals")
def trigger_update_actuals(db: Session = Depends(get_db)):
    """Gerçek kapanış fiyatlarıyla bekleyen tahminleri güncelle."""
    try:
        count = update_actuals(db)
        return {"updated": count, "message": f"{count} tahmin güncellendi"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history", response_model=List[PredictionOut])
def get_prediction_history(limit: int = 30, db: Session = Depends(get_db)):
    """Tahmin geçmişini listele."""
    return (
        db.query(StockPrediction)
        .order_by(StockPrediction.prediction_date.desc())
        .limit(limit)
        .all()
    )


@router.get("/compare", response_model=List[ComparisonItem])
def compare_predictions(limit: int = 30, db: Session = Depends(get_db)):
    """Tahmin vs gerçek karşılaştırması (sadece gerçek verisi olan tahminler)."""
    predictions = (
        db.query(StockPrediction)
        .filter(StockPrediction.actual_close.isnot(None))
        .order_by(StockPrediction.target_date.desc())
        .limit(limit)
        .all()
    )
    return [
        ComparisonItem(
            id=p.id,
            target_date=p.target_date,
            predicted_close=p.predicted_close,
            actual_close=p.actual_close,
            last_close=p.last_close,
            error_pct=p.error_pct,
            is_direction_correct=p.is_direction_correct,
            direction_predicted="UP" if p.predicted_close > p.last_close else "DOWN",
            direction_actual="UP" if p.actual_close > p.last_close else "DOWN",
        )
        for p in predictions
    ]


@router.get("/stats", response_model=StatsOut)
def get_stats(db: Session = Depends(get_db)):
    """Genel başarı istatistikleri."""
    total = db.query(func.count(StockPrediction.id)).scalar()
    with_actual = (
        db.query(func.count(StockPrediction.id))
        .filter(StockPrediction.actual_close.isnot(None))
        .scalar()
    )

    avg_error = None
    direction_accuracy = None
    if with_actual > 0:
        avg_error = (
            db.query(func.avg(StockPrediction.error_pct))
            .filter(StockPrediction.actual_close.isnot(None))
            .scalar()
        )
        direction_correct = (
            db.query(func.count(StockPrediction.id))
            .filter(StockPrediction.is_direction_correct.is_(True))
            .scalar()
        )
        direction_accuracy = round((direction_correct / with_actual) * 100, 2)

    latest = (
        db.query(StockPrediction)
        .order_by(StockPrediction.prediction_date.desc())
        .first()
    )

    return StatsOut(
        total_predictions=total,
        predictions_with_actual=with_actual,
        avg_error_pct=round(avg_error, 2) if avg_error else None,
        direction_accuracy_pct=direction_accuracy,
        latest_prediction={
            "target_date": str(latest.target_date.date()) if latest else None,
            "predicted_close": latest.predicted_close if latest else None,
            "actual_close": latest.actual_close if latest else None,
        }
        if latest
        else None,
    )


@router.get("/info")
def get_model_info():
    """Model, scaler ve feature bilgilerini göster (debug/yapılandırma için)."""
    _, scaler, n_features, feature_names = _load_artifacts()

    stock_features = [
        "log_Close", "log_High", "log_Low", "log_Open",
        "log_EMAF", "log_EMAM", "log_EMAS", "RSI", "MACD",
    ]

    return {
        "ticker": TICKER,
        "backcandles": BACKCANDLES,
        "n_features": n_features,
        "n_stock_features": len(stock_features),
        "n_macro_features": n_features - len(stock_features),
        "scaler_columns": feature_names,
        "configured_macro_cols": MACRO_COLS,
        "stock_features": stock_features,
        "tr_interest_rate": TR_INTEREST_RATE,
        "tr_inflation": TR_INFLATION,
    }
