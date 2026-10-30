from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    APP_NAME: str = "Safar Saarthi AI Multi-Agent Service"
    APP_ENV: str = "development"
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    DEBUG: bool = True
    VERSION: str = "0.1.0"

    # LLM Provider Configuration
    LLM_PROVIDER: str = "mock"  # "gemini" | "openai" | "mock"
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-1.5-flash"
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4o-mini"

    # Backend API URL for fetching transport & place data
    BACKEND_API_URL: str = "http://localhost:5000/api"

    # Security & Guardrails
    AI_SERVICE_API_KEY: Optional[str] = None  # Service token for backend-to-AI auth
    MAX_REQUEST_BYTES: int = 1_048_576  # 1 MB maximum request body
    LLM_TIMEOUT_SECONDS: float = 12.0
    MAX_AGENT_ITERATIONS: int = 4  # Prevent uncontrolled recursive cycles

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
