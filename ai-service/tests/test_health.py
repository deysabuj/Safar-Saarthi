from app.main import root
from app.api.v1.health import get_health
from app.core.config import settings

def test_root_endpoint():
    data = root()
    assert data["status"] == "online"
    assert "version" in data
    assert data["service"] == settings.APP_NAME
    assert data["health_check"] == "/health"

def test_health_endpoint():
    data = get_health()
    assert data.status == "healthy"
    assert data.service == "safar-saarthi-ai-service"
    assert data.version is not None
    assert data.active_provider is not None
    assert data.uptime_seconds >= 0
