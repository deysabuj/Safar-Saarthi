from fastapi import Request, HTTPException, Security, status
from fastapi.security import APIKeyHeader
from app.core.config import settings

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

async def verify_service_api_key(api_key: str = Security(api_key_header)) -> bool:
    """Verifies service-to-service authentication when configured."""
    if not settings.AI_SERVICE_API_KEY:
        # Open in dev / unconfigured mode
        return True

    if not api_key or api_key != settings.AI_SERVICE_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-API-Key service header.",
        )
    return True

async def verify_request_size(request: Request) -> None:
    """Rejects payload sizes exceeding MAX_REQUEST_BYTES to prevent memory exhaustion."""
    content_length = request.headers.get("content-length")
    if content_length:
        try:
            length = int(content_length)
            if length > settings.MAX_REQUEST_BYTES:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"Request entity too large. Maximum permitted is {settings.MAX_REQUEST_BYTES} bytes.",
                )
        except ValueError:
            pass
