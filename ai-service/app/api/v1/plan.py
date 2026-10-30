from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel
from app.schemas.trip import TripPlanningQuery, MissingDetailsResponse
from app.schemas.plan import CompleteTripPlanResponse
from app.agents.coordinator import TripCoordinatorAgent
from app.core.security import verify_service_api_key, verify_request_size

router = APIRouter()
coordinator = TripCoordinatorAgent()

class PlanTripRequest(BaseModel):
    query: TripPlanningQuery
    trip_id: Optional[str] = None
    transport_candidates: Optional[List[Dict[str, Any]]] = None

@router.post(
    "/plan",
    response_model=Union[CompleteTripPlanResponse, MissingDetailsResponse],
    dependencies=[Depends(verify_request_size), Depends(verify_service_api_key)],
    summary="Multi-Agent AI Trip Planning & Synthesis",
    description="Orchestrates 6 specialist agents to validate, plan, and synthesize a complete personalized trip."
)
async def generate_plan(request: PlanTripRequest):
    # 1. Check for missing essential details
    missing = coordinator.validate_essential_details(request.query)
    if missing:
        return missing

    # 2. Execute multi-agent orchestration workflow
    try:
        plan = await coordinator.run({
            "query": request.query,
            "trip_id": request.trip_id,
            "transport_candidates": request.transport_candidates or [],
        })
        return plan
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Multi-agent planning workflow encountered an error: {str(e)}",
        )
