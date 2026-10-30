from pydantic import BaseModel, Field
from typing import List

class AccommodationRecommendation(BaseModel):
    id: str
    name: str
    type: str  # "HERITAGE_HAVELI" | "HOTEL" | "RESORT" | "BOUTIQUE_HOMESTAY" | "HOSTEL"
    price_per_night_inr: float = Field(..., ge=0.0)
    total_stay_inr: float = Field(..., ge=0.0)
    nights: int = Field(default=2, ge=1)
    rating: float = Field(default=4.5, ge=1.0, le=5.0)
    proximity_to_hub: str
    amenities: List[str] = Field(default_factory=list)
    why_recommended: str
