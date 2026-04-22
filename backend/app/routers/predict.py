"""
predict_next.py ile aynı veri hattı (FRED + yfinance).
pandas_ta, TensorFlow'un numpy<2.1 gereksinimiyle çakıştığı için Docker'da yok;
RSI/EMA/MACD aynı parametrelerle pandas ewm ile hesaplanır (pandas_ta.ema / Wilder RSI ile uyumlu).
Scaler sadece feature sütunlarına uygulanır; model çıktısı doğrudan log return.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.prediction import StockPrediction
from app.schemas.prediction import PredictionOut, ComparisonItem, StatsOut
import numpy as np
import os
import logging
import time
from datetime import datetime, timedelta
from typing import List

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/predict", tags=["predict"])

TICKER = "GARAN.IS"
BACKCANDLES = 10
_artifacts_dir = os.path.join(os.path.dirname(__file__), "..")

FRED_API_KEY = os.getenv("FRED_API_KEY", "be1b307d1c5e2cdf3cf263dc2935ee50")

_STOCK_LOOKBACK_DAYS = 800
_MACRO_LOOKBACK_DAYS = 1200
_CACHE_DIR = os.path.join(_artifacts_dir, "_cache")

_model = None
_scaler = None
_n_features = None
_feature_names = None


# ── Yardımcılar: cache + retry ───────────────────────────────

def _cache_path(name: str) -> str:
    os.makedirs(_CACHE_DIR, exist_ok=True)
    return os.path.join(_CACHE_DIR, f"{name}.pkl")


def _cache_is_fresh(path: str) -> bool:
    if not os.path.exists(path):
        return False
    mtime = datetime.fromtimestamp(os.path.getmtime(path))
    return mtime.date() == datetime.now().date()


def _yf_download(ticker: str, **kwargs):
    """yfinance ile indirme — 3 deneme, artan bekleme."""
    import yfinance as yf

    for attempt in range(3):
        try:
            data = yf.download(ticker, progress=False, **kwargs)
            if data is not None and not data.empty:
                return data
        except Exception as e:
            logger.warning("yfinance %s deneme %d/3 hata: %s", ticker, attempt + 1, e)
        time.sleep(2 * (attempt + 1))

    raise ValueError(f"{ticker} verisi 3 denemede de çekilemedi")


def _fred_get_series(fred, series_id: str, start: str, end: str):
    """FRED API çağrısı — 3 deneme, artan bekleme."""
    for attempt in range(3):
        try:
            return fred.get_series(series_id, start, end)
        except Exception as e:
            logger.warning("FRED %s deneme %d/3 hata: %s", series_id, attempt + 1, e)
            time.sleep(3 * (attempt + 1))

    raise ValueError(f"FRED {series_id} verisi 3 denemede de çekilemedi")


# ── Artifact yükleme ─────────────────────────────────────────

def _load_artifacts():
    global _model, _scaler, _n_features, _feature_names
    if _model is not None:
        return _model, _scaler, _n_features, _feature_names

    import joblib
    from keras.models import load_model

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

    logger.info("Model yüklendi — feature sayısı: %d", _n_features)
    return _model, _scaler, _n_features, _feature_names


# ── Teknik gösterge hesaplama ─────────────────────────────────

def _ema(series, length: int):
    return series.ewm(span=length, adjust=False).mean()


def _rsi_wilder(close, length: int = 15):
    delta = close.diff()
    gain = delta.clip(lower=0.0)
    loss = (-delta).clip(lower=0.0)
    alpha = 1.0 / float(length)
    avg_gain = gain.ewm(alpha=alpha, min_periods=length, adjust=False).mean()
    avg_loss = loss.ewm(alpha=alpha, min_periods=length, adjust=False).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    return 100.0 - (100.0 / (1.0 + rs))


# ── Garanti hisse verisi (son ~500 işlem günü + cache) ────────

def _fetch_garanti_df():
    import pandas as pd

    cp = _cache_path("garanti")
    if _cache_is_fresh(cp):
        logger.info("GARAN.IS cache'den yükleniyor")
        return pd.read_pickle(cp)

    start = (datetime.now().date() - timedelta(days=_STOCK_LOOKBACK_DAYS)).strftime("%Y-%m-%d")
    end = (datetime.now().date() + timedelta(days=1)).strftime("%Y-%m-%d")

    data = _yf_download(TICKER, start=start, end=end)
    if isinstance(data.columns, pd.MultiIndex):
        data.columns = data.columns.get_level_values(0)

    c = data["Close"]
    data["RSI"] = _rsi_wilder(c, 15)
    data["EMAF"] = _ema(c, 20)
    data["EMAM"] = _ema(c, 100)
    data["EMAS"] = _ema(c, 150)
    data["MACD"] = _ema(c, 12) - _ema(c, 26)

    data["TargetNextClose"] = data["Close"].shift(-1)
    if data["TargetNextClose"].isna().any():
        li = data.index[-1]
        data.loc[li, "TargetNextClose"] = float(data.loc[li, "Close"])

    data.dropna(inplace=True)
    data.reset_index(inplace=True)
    if "Volume" in data.columns:
        data.drop(columns=["Volume"], inplace=True)
    data["Date"] = pd.to_datetime(data["Date"]).dt.normalize()

    data.to_pickle(cp)
    logger.info("GARAN.IS indirildi: %d satır, cache kaydedildi", len(data))
    return data


# ── Türkiye makro panel (son ~1200 gün + cache) ──────────────

def _fetch_turkiye_df(end_date: str):
    import pandas as pd

    cp = _cache_path("turkiye_macro")
    if _cache_is_fresh(cp):
        logger.info("Makro panel cache'den yükleniyor")
        return pd.read_pickle(cp)

    start_macro = (datetime.now().date() - timedelta(days=_MACRO_LOOKBACK_DAYS)).strftime("%Y-%m-%d")

    from fredapi import Fred
    fred = Fred(api_key=FRED_API_KEY)

    turkiye_enflasyon = _fred_get_series(fred, "FPCPITOTLZGTUR", start_macro, end_date)
    exchange_rate = _fred_get_series(fred, "CCUSMA02TRM618N", start_macro, end_date)
    interest_rate = _fred_get_series(fred, "INTDSRTRM193N", start_macro, end_date)
    m2_money_supply = _fred_get_series(fred, "MYAGM2TRM189N", start_macro, end_date)
    vix_index = _fred_get_series(fred, "VIXCLS", start_macro, end_date)
    ten_year_treasury_yield = _fred_get_series(fred, "DGS10", start_macro, end_date)

    gold_data = _yf_download("GC=F", start=start_macro, end=end_date)
    gold_data.columns = gold_data.columns.get_level_values(0)
    gold_price = gold_data["Close"]

    df = pd.DataFrame(index=gold_price.index)
    df.index = pd.to_datetime(df.index).tz_localize(None)
    df["gold_price"] = gold_price.values

    vix_index.index = pd.to_datetime(vix_index.index).tz_localize(None)
    df["vix_index"] = vix_index.reindex(df.index, method="ffill")

    ten_year_treasury_yield.index = pd.to_datetime(ten_year_treasury_yield.index).tz_localize(None)
    df["us_10y_yield"] = ten_year_treasury_yield.reindex(df.index, method="ffill")

    exchange_rate.index = pd.to_datetime(exchange_rate.index).tz_localize(None)
    df["usd_try"] = exchange_rate.reindex(df.index, method="ffill")

    interest_rate.index = pd.to_datetime(interest_rate.index).tz_localize(None)
    df["tr_interest_rate"] = interest_rate.reindex(df.index, method="ffill")

    m2_money_supply.index = pd.to_datetime(m2_money_supply.index).tz_localize(None)
    df["tr_m2_supply"] = m2_money_supply.reindex(df.index, method="ffill")

    turkiye_enflasyon.index = pd.to_datetime(turkiye_enflasyon.index).tz_localize(None)
    df["tr_inflation"] = turkiye_enflasyon.reindex(df.index, method="ffill")

    df = df.ffill().bfill()

    df["vix_change_1d"] = df["vix_index"].pct_change(1)
    df["gold_change_1d"] = df["gold_price"].pct_change(1)
    df["us_yield_change_1d"] = df["us_10y_yield"].pct_change(1)
    df["vix_change_5d"] = df["vix_index"].pct_change(5)
    df["gold_change_5d"] = df["gold_price"].pct_change(5)
    df["us_yield_change_5d"] = df["us_10y_yield"].pct_change(5)
    df["usd_try_change_20d"] = df["usd_try"].pct_change(20)
    df["tr_interest_change_20d"] = df["tr_interest_rate"].pct_change(20)
    df["tr_m2_growth_20d"] = df["tr_m2_supply"].pct_change(20)
    df["tr_inflation_change_250d"] = df["tr_inflation"].pct_change(250)
    df["gold_try"] = df["gold_price"] * df["usd_try"]
    df["gold_try_change_1d"] = df["gold_try"].pct_change(1)
    df["tr_real_interest"] = df["tr_interest_rate"] - df["tr_inflation"]
    df["vix_high"] = (df["vix_index"] > 25).astype(int)
    df["vix_extreme"] = (df["vix_index"] > 35).astype(int)
    df["us_yield_high"] = (df["us_10y_yield"] > df["us_10y_yield"].rolling(60).mean()).astype(int)
    df["vix_sma_20"] = df["vix_index"].rolling(20).mean()
    df["vix_above_sma20"] = (df["vix_index"] > df["vix_sma_20"]).astype(int)
    df["gold_sma_20"] = df["gold_price"].rolling(20).mean()
    df["gold_sma_50"] = df["gold_price"].rolling(50).mean()
    df["gold_above_sma20"] = (df["gold_price"] > df["gold_sma_20"]).astype(int)
    df["gold_trend"] = (df["gold_sma_20"] > df["gold_sma_50"]).astype(int)
    df["usd_try_sma_20"] = df["usd_try"].rolling(20).mean()
    df["usd_try_above_sma20"] = (df["usd_try"] > df["usd_try_sma_20"]).astype(int)

    columns_to_drop = [
        "gold_price", "vix_sma_20", "gold_sma_20",
        "gold_sma_50", "usd_try_sma_20", "tr_m2_supply", "gold_try",
    ]
    df.drop(columns=columns_to_drop, inplace=True)
    df = df.iloc[250:].dropna().reset_index()
    if "Date" not in df.columns:
        df = df.rename(columns={df.columns[0]: "Date"})
    df["Date"] = pd.to_datetime(df["Date"]).dt.normalize()

    df.to_pickle(cp)
    logger.info("Makro panel indirildi: %d satır, cache kaydedildi", len(df))
    return df


# ── Birleştirme + feature üretimi (preprocessing.py ile aynı) ──

def _build_prediction_frame():
    import pandas as pd

    end_macro = (datetime.now().date() + timedelta(days=1)).strftime("%Y-%m-%d")
    logger.info("GARAN.IS güncelleniyor...")
    df_garanti = _fetch_garanti_df()
    logger.info("Makro panel (FRED + altın) çekiliyor...")
    df_turkiye = _fetch_turkiye_df(end_macro)

    macro_cols = [c for c in df_turkiye.columns if c != "Date"]

    df = df_garanti.merge(df_turkiye, on="Date", how="left").sort_values("Date")
    df[macro_cols] = df[macro_cols].ffill()
    df[macro_cols] = df[macro_cols].bfill()
    df = df.dropna(subset=macro_cols + ["Close", "RSI", "MACD"]).reset_index(drop=True)

    if len(df) < BACKCANDLES + 1:
        raise ValueError(f"Birleşik veri çok kısa ({len(df)} satır)")

    price_cols = ["Close", "High", "Low", "Open", "EMAF", "EMAM", "EMAS"]
    for col in price_cols:
        df[f"log_{col}"] = np.log(df[col])

    df["LogReturnNext"] = np.log(df["TargetNextClose"] / df["Close"])

    stock_feature_cols = [f"log_{c}" for c in price_cols] + ["RSI", "MACD"]
    target_col = "LogReturnNext"
    feature_cols = stock_feature_cols + macro_cols

    return df, feature_cols, target_col


# ── Tahmin motoru ───────────────────────────────────────────

def run_prediction(db: Session):
    model, scaler, n_features, _ = _load_artifacts()

    df, feature_cols, target_col = _build_prediction_frame()

    if len(feature_cols) != n_features:
        raise ValueError(
            f"Feature sayısı uyuşmuyor! Beklenen: {n_features}, "
            f"Hesaplanan: {len(feature_cols)}"
        )

    data_set = df[feature_cols + [target_col]]
    if data_set.isnull().any().any():
        bad = data_set.columns[data_set.isnull().any()].tolist()
        raise ValueError(f"Özelliklerde NaN var: {bad[:15]}")

    features_scaled = scaler.transform(data_set[feature_cols].values)
    n = len(features_scaled)
    U = n - 1

    window = features_scaled[U - BACKCANDLES: U, :]
    X = np.reshape(window, (1, BACKCANDLES, n_features))

    last_close = float(df["Close"].iloc[U])
    last_date = df["Date"].iloc[U]

    pred = model.predict(X, verbose=0)
    log_ret_pred = float(pred.flatten()[0])
    predicted_close = float(last_close * np.exp(log_ret_pred))

    target_date = last_date + timedelta(days=1)
    while target_date.weekday() >= 5:
        target_date += timedelta(days=1)
    target_date = datetime(target_date.year, target_date.month, target_date.day)

    prediction = StockPrediction(
        prediction_date=datetime.utcnow(),
        target_date=target_date,
        ticker=TICKER,
        predicted_log_return=float(log_ret_pred),
        predicted_close=round(predicted_close, 4),
        last_close=round(float(last_close), 4),
    )
    db.add(prediction)
    db.commit()
    db.refresh(prediction)

    logger.info(
        "Tahmin → hedef: %s, tahmini: %.2f TL, son kapanış: %.2f TL",
        target_date.date(), predicted_close, last_close,
    )
    return prediction


def update_actuals(db: Session) -> int:
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

    try:
        stock = _yf_download(TICKER, period="60d", auto_adjust=True)
    except ValueError:
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
            pred.is_direction_correct = bool(pred_up == actual_up)
            updated += 1

    db.commit()
    logger.info("%d tahmin gerçek verilerle güncellendi", updated)
    return updated


# ── API Endpoint'leri ───────────────────────────────────────

@router.post("/run", response_model=PredictionOut)
def trigger_prediction(db: Session = Depends(get_db)):
    try:
        return run_prediction(db)
    except Exception as e:
        logger.error("Tahmin hatası: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/update-actuals")
def trigger_update_actuals(db: Session = Depends(get_db)):
    try:
        count = update_actuals(db)
        return {"updated": count, "message": f"{count} tahmin güncellendi"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history", response_model=List[PredictionOut])
def get_prediction_history(limit: int = 30, db: Session = Depends(get_db)):
    return (
        db.query(StockPrediction)
        .order_by(StockPrediction.prediction_date.desc())
        .limit(limit)
        .all()
    )


@router.get("/compare", response_model=List[ComparisonItem])
def compare_predictions(limit: int = 30, db: Session = Depends(get_db)):
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
        "stock_features": stock_features,
        "fred_api_configured": bool(FRED_API_KEY),
    }
