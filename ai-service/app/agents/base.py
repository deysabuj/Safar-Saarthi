import time
from abc import ABC, abstractmethod
from typing import Dict, Any, Tuple
from app.core.logging import logger
from app.llm.provider import get_llm_provider, LLMProvider

class BaseAgent(ABC):
    def __init__(self, name: str, llm_provider: LLMProvider = None):
        self.name = name
        self.llm = llm_provider or get_llm_provider()

    @abstractmethod
    async def run(self, context: Dict[str, Any]) -> Any:
        pass

    async def execute(self, context: Dict[str, Any]) -> Tuple[Any, float, str]:
        """Executes agent with duration telemetry and structured logging."""
        start_time = time.perf_counter()
        logger.info(f"Agent [{self.name}] starting execution.")
        try:
            result = await self.run(context)
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            logger.info(f"Agent [{self.name}] completed successfully in {duration_ms}ms.")
            return result, duration_ms, "SUCCESS"
        except Exception as e:
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            logger.error(f"Agent [{self.name}] failed after {duration_ms}ms: {str(e)}")
            raise e
