import logging
import re
import sys

_SENSITIVE_PATTERNS = [
    re.compile(r"(?i)(api[_-]?key|secret|token|password|bearer\s+)[:=]\s*([^\s,;]+)"),
]

class MaskingFormatter(logging.Formatter):
    """Custom logging formatter that automatically redacts API keys and secrets."""
    def format(self, record: logging.LogRecord) -> str:
        original = super().format(record)
        masked = original
        for pattern in _SENSITIVE_PATTERNS:
            masked = pattern.sub(r"\1: [REDACTED]", masked)
        return masked

def setup_logger(name: str = "safar_saarthi_ai") -> logging.Logger:
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)

    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        formatter = MaskingFormatter(
            fmt="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)

    return logger

logger = setup_logger()
