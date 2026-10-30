from pydantic import BaseModel, Field
from datetime import datetime, timezone
from typing import Optional

class HealthResponse(BaseModel):
    status: str = Field(default="healthy", description="Current health status of the AI service")
    service: str = Field(default="safar-saarthi-ai-service", description="Service identifier")
    version: str = Field(..., description="Service version string")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="UTC timestamp of the status check")
    environment: str = Field(..., description="Deployment environment")
    active_provider: str = Field(..., description="Configured LLM provider name")
    uptime_seconds: Optional[float] = Field(default=None, description="Seconds since process startup")
