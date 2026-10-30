import time
from fastapi import APIRouter
from app.schemas.health import HealthResponse
from app.core.config import settings

router = APIRouter()
START_TIME = time.time()

@router.get("/health", response_model=HealthResponse)
def get_health():
    """Health check endpoint for the Safar Saarthi AI Service."""
    return HealthResponse(
        status="healthy",
        service="safar-saarthi-ai-service",
        version=settings.VERSION,
        environment=settings.APP_ENV,
        active_provider=settings.LLM_PROVIDER,
        uptime_seconds=round(time.time() - START_TIME, 2),
    )
