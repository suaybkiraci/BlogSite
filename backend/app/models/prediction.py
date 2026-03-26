from sqlalchemy import Column, Integer, Float, String, DateTime, Boolean
from datetime import datetime
from app.database import Base


class StockPrediction(Base):
    __tablename__ = "stock_predictions"

    id = Column(Integer, primary_key=True, index=True)
    prediction_date = Column(DateTime, nullable=False, index=True)
    target_date = Column(DateTime, nullable=False, index=True)
    ticker = Column(String, default="GARAN.IS")
    predicted_log_return = Column(Float, nullable=False)
    predicted_close = Column(Float, nullable=False)
    last_close = Column(Float, nullable=False)
    actual_close = Column(Float, nullable=True)
    error_pct = Column(Float, nullable=True)
    is_direction_correct = Column(Boolean, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
