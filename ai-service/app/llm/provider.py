import os
import json
import httpx
from abc import ABC, abstractmethod
from typing import Type, TypeVar, Optional, Dict, Any
from pydantic import BaseModel
from app.core.config import settings
from app.core.logging import logger

T = TypeVar("T", bound=BaseModel)

class LLMProvider(ABC):
    @abstractmethod
    def is_configured(self) -> bool:
        pass

    @abstractmethod
    async def generate_explanation(self, prompt: str, system_context: str = "") -> str:
        pass

class MockLLMProvider(LLMProvider):
    """Deterministic Mock LLM provider that satisfies schema compliance without external network calls."""
    def is_configured(self) -> bool:
        return True

    async def generate_explanation(self, prompt: str, system_context: str = "") -> str:
        if "transport" in prompt.lower():
            return "Recommended option balances fast point-to-point transit with minimal local transfers."
        elif "accommodation" in prompt.lower():
            return "Selected stay offers prime accessibility to central monuments, authentic local architecture, and verified traveler reviews."
        elif "budget" in prompt.lower():
            return "Budget plan optimizes high-value attractions while leaving a safety contingency for dining and local transport."
        return "Plan synthesized through multi-agent collaboration with verified provider data."

class GeminiLLMProvider(LLMProvider):
    """Gemini 1.5 / 2.0 API implementation via secure asynchronous HTTP calls."""
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.model = model or settings.GEMINI_MODEL
        self.base_url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent"

    def is_configured(self) -> bool:
        return bool(self.api_key and len(self.api_key.strip()) > 5)

    async def generate_explanation(self, prompt: str, system_context: str = "") -> str:
        if not self.is_configured():
            logger.info("Gemini API key unconfigured; falling back to deterministic explanation generator.")
            return await MockLLMProvider().generate_explanation(prompt, system_context)

        full_prompt = f"{system_context}\n\nTask: {prompt}" if system_context else prompt
        payload = {
            "contents": [{"parts": [{"text": full_prompt}]}],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 500,
            },
        }

        try:
            async with httpx.AsyncClient(timeout=settings.LLM_TIMEOUT_SECONDS) as client:
                response = await client.post(
                    f"{self.base_url}?key={self.api_key}",
                    json=payload,
                    headers={"Content-Type": "application/json"},
                )

                if response.status_code == 200:
                    data = response.json()
                    candidates = data.get("candidates", [])
                    if candidates and "content" in candidates[0]:
                        parts = candidates[0]["content"].get("parts", [])
                        if parts and "text" in parts[0]:
                            return parts[0]["text"].strip()
                logger.warning(f"Gemini API returned status {response.status_code}; falling back to default copy.")
                return await MockLLMProvider().generate_explanation(prompt, system_context)
        except Exception as e:
            logger.error(f"Gemini API invocation error: {str(e)}; fallback engaged.")
            return await MockLLMProvider().generate_explanation(prompt, system_context)

def get_llm_provider() -> LLMProvider:
    provider_name = (settings.LLM_PROVIDER or "mock").lower()
    if provider_name == "gemini" and settings.GEMINI_API_KEY:
        return GeminiLLMProvider()
    return MockLLMProvider()
