from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any
from enum import Enum
from datetime import datetime

class TravelMode(str, Enum):
    FLIGHT = "FLIGHT"
    TRAIN = "TRAIN"
    BUS = "BUS"
    CAB_TRANSFER = "CAB_TRANSFER"

class TransportCategory(str, Enum):
    CHEAPEST = "CHEAPEST"
    FASTEST = "FASTEST"
    BEST_VALUE = "BEST_VALUE"

class TravelStyle(str, Enum):
    BUDGET = "BUDGET"
    MID_RANGE = "MID_RANGE"
    LUXURY = "LUXURY"

class DietaryPref(str, Enum):
    VEG = "VEG"
    JAIN = "JAIN"
    NON_VEG = "NON_VEG"
    ANY = "ANY"

class ActivityPace(str, Enum):
    RELAXED = "RELAXED"
    MODERATE = "MODERATE"
    FAST_PACED = "FAST_PACED"

class TripPlanningQuery(BaseModel):
    origin: str = Field(..., min_length=2, description="Departure city or hub code")
    destination: str = Field(..., min_length=2, description="Destination city or hub code")
    departure_date: str = Field(..., description="Departure date in YYYY-MM-DD format")
    return_date: Optional[str] = Field(None, description="Optional return date in YYYY-MM-DD format")
    travelers: int = Field(default=1, ge=1, le=20, description="Total number of travelers")
    budget_inr: Optional[float] = Field(default=None, ge=500.0, description="Total budget in INR")
    preferred_modes: Optional[List[TravelMode]] = Field(default=None, description="Preferred travel modes")
    pace: ActivityPace = Field(default=ActivityPace.MODERATE, description="Daily activity pacing")
    style: TravelStyle = Field(default=TravelStyle.MID_RANGE, description="Travel luxury/budget tier")
    dietary: DietaryPref = Field(default=DietaryPref.VEG, description="Dietary preferences")
    interests: List[str] = Field(default_factory=list, description="User interests: heritage, food, shopping, nature")
    user_prompt: Optional[str] = Field(default=None, description="Optional free-form user prompt or special request")

    @field_validator("destination")
    @classmethod
    def validate_different_endpoints(cls, v: str, info) -> str:
        origin = info.data.get("origin")
        if origin and v.strip().lower() == origin.strip().lower():
            raise ValueError("Origin and destination cannot be identical.")
        return v

    @field_validator("departure_date")
    @classmethod
    def validate_departure_date_format(cls, v: str) -> str:
        try:
            datetime.strptime(v, "%Y-%m-%d")
        except ValueError:
            raise ValueError("departure_date must follow YYYY-MM-DD format.")
        return v

class MissingDetailsResponse(BaseModel):
    needs_clarification: bool = True
    missing_fields: List[str]
    clarification_question: str
    suggested_defaults: Dict[str, Any] = Field(default_factory=dict)
