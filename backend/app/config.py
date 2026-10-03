from __future__ import annotations

import os
from dataclasses import dataclass, field


@dataclass(frozen=True)
class Settings:
    app_name: str = os.getenv('APP_NAME', 'Academic Study Helper Backend')
    host: str = os.getenv('HOST', '0.0.0.0')
    port: int = int(os.getenv('PORT', '8000'))
    allowed_origins: list[str] = field(
        default_factory=lambda: os.getenv(
            'ALLOWED_ORIGINS',
            'http://localhost:8123,http://127.0.0.1:8123',
        ).split(',')
    )
    llm_provider: str = os.getenv('LLM_PROVIDER', 'offline')
    enabled_providers: list[str] = field(
        default_factory=lambda: [
            provider.strip().lower()
            for provider in os.getenv('ENABLED_PROVIDERS', 'offline').split(',')
            if provider.strip()
        ]
    )
    llm_api_key: str | None = os.getenv('LLM_API_KEY')


settings = Settings()
