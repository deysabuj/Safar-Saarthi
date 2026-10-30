from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from app.schemas.trip import TravelMode, TransportCategory

class TransportCandidateItem(BaseModel):
    id: str
    naturalKey: Optional[str] = None
    mode: TravelMode
    category: TransportCategory = TransportCategory.BEST_VALUE
    operator: str
    identifier: str
    originHub: str
    destinationHub: str
    departureTime: str
    arrivalTime: str
    durationMinutes: int
    baseFareInr: float
    taxesAndFeesInr: float = 0.0
    totalCostInr: float
    availableSeats: Optional[int] = None
    seatClass: Optional[str] = None
    bookingUrl: Optional[str] = None
    transferDetails: Optional[Dict[str, Any]] = None

class TransportRecommendation(BaseModel):
    selected_offer_id: str
    operator: str
    identifier: str
    mode: TravelMode
    category: TransportCategory
    departure_time: str
    arrival_time: str
    duration_minutes: int
    total_cost_inr: float
    booking_url: str
    trade_off_explanation: str
    alternative_options: List[Dict[str, Any]] = Field(default_factory=list)
