from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class PredictionOut(BaseModel):
    id: int
    prediction_date: datetime
    target_date: datetime
    ticker: str
    predicted_log_return: float
    predicted_close: float
    last_close: float
    actual_close: Optional[float] = None
    error_pct: Optional[float] = None
    is_direction_correct: Optional[bool] = None

    class Config:
        from_attributes = True


class ComparisonItem(BaseModel):
    id: int
    target_date: datetime
    predicted_close: float
    actual_close: float
    last_close: float
    error_pct: float
    is_direction_correct: bool
    direction_predicted: str
    direction_actual: str


class StatsOut(BaseModel):
    total_predictions: int
    predictions_with_actual: int
    avg_error_pct: Optional[float] = None
    direction_accuracy_pct: Optional[float] = None
    latest_prediction: Optional[dict] = None
