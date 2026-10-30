from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from app.schemas.transport import TransportRecommendation
from app.schemas.accommodation import AccommodationRecommendation
from app.schemas.itinerary import ItineraryDay
from app.schemas.budget import BudgetAuditResult

class AgentExecutionTrace(BaseModel):
    agent_name: str
    status: str  # "SUCCESS" | "FAILED" | "FALLBACK"
    duration_ms: float
    summary: str

class CompleteTripPlanResponse(BaseModel):
    trip_id: Optional[str] = None
    destination: str
    title: str
    summary: str
    context: Dict[str, Any] = Field(default_factory=dict)
    transport: TransportRecommendation
    accommodation: AccommodationRecommendation
    itinerary: List[ItineraryDay]
    budget_analysis: BudgetAuditResult
    agent_traces: List[AgentExecutionTrace] = Field(default_factory=list)
    created_at: str
