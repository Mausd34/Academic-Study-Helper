from __future__ import annotations

from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .config import settings
from .services.assistant import answer_question


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    language: str = 'en'
    provider: str = 'offline'
    state: dict[str, Any] = Field(default_factory=dict)

    @property
    def provider_name(self) -> str:
        return self.provider.strip().lower()

    def validate_provider(self) -> None:
        if self.provider_name not in settings.enabled_providers:
            raise HTTPException(
                status_code=400,
                detail={
                    'code': 400,
                    'error_code': 'validation_failed',
                    'msg': 'Unsupported provider: provider is not enabled',
                },
            )


class ChatResponse(BaseModel):
    text: str
    source: str
    language: str


app = FastAPI(
    title=settings.app_name,
    version='1.0.0',
    description='Backend API for the Academic Study Helper app.',
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)


@app.get('/health')
def health() -> dict[str, str]:
    return {'status': 'ok', 'service': settings.app_name}


@app.get('/api/info')
def info() -> dict[str, Any]:
    return {
        'app': settings.app_name,
        'provider': settings.llm_provider,
        'offline_mode': settings.llm_provider == 'offline',
        'allowed_origins': settings.allowed_origins,
    }


@app.post('/api/chat', response_model=ChatResponse)
def chat(request: ChatRequest) -> ChatResponse:
    request.validate_provider()
    result = answer_question(request.message, request.language, request.state)
    return ChatResponse(
        text=result['text'],
        source=result['source'],
        language=request.language,
    )


@app.post('/api/sync')
def sync_state(payload: dict[str, Any]) -> dict[str, Any]:
    return {
        'status': 'received',
        'items': payload.get('items') or 0,
    }
