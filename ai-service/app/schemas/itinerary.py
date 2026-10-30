from pydantic import BaseModel, Field
from typing import List, Optional
from app.schemas.activities import ActivityItem

class ItineraryDay(BaseModel):
    day_number: int = Field(..., ge=1)
    date: str
    theme: str
    morning: ActivityItem
    afternoon: ActivityItem
    evening: ActivityItem
    dining_recommendation: str
    estimated_daily_spend_inr: float = Field(default=0.0, ge=0.0)
