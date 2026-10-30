from pydantic import BaseModel, Field
from typing import Optional

class ActivityItem(BaseModel):
    id: str
    title: str
    location: str
    category: str  # "HERITAGE" | "FOOD" | "NATURE" | "SHOPPING" | "CULTURE" | "RELAXATION"
    time_slot: str  # e.g. "09:30 AM - 12:30 PM"
    duration_minutes: int = Field(default=120, ge=30)
    entry_fee_inr: float = Field(default=0.0, ge=0.0)
    description: str
    insider_tip: Optional[str] = None
