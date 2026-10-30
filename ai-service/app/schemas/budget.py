from pydantic import BaseModel, Field
from typing import Optional, List

class BudgetAuditResult(BaseModel):
    user_budget_inr: Optional[float] = None
    transport_total_inr: float = Field(..., ge=0.0)
    stay_total_inr: float = Field(..., ge=0.0)
    activities_total_inr: float = Field(..., ge=0.0)
    estimated_food_inr: float = Field(..., ge=0.0)
    grand_total_inr: float = Field(..., ge=0.0)
    is_within_budget: bool
    variance_inr: float  # Negative if surplus (under budget), positive if deficit (over budget)
    cost_saving_suggestions: List[str] = Field(default_factory=list)
    confidence_score: float = Field(default=0.95, ge=0.0, le=1.0)
