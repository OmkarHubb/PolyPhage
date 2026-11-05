from fastapi import APIRouter, HTTPException
from app.models.ai_models import (
    AISettings,
    AISettingsUpdate,
    TestConnectionRequest,
    TestConnectionResponse,
)
from app.services.credential_manager import credential_manager
from app.services.ai_service import ai_service

router = APIRouter(prefix="/ai/settings", tags=["AI Settings"])

@router.get("", response_model=AISettings)
def get_ai_settings():
    return credential_manager.get_public_settings()

@router.post("", response_model=AISettings)
def update_ai_settings(payload: AISettingsUpdate):
    credential_manager.set_config(
        provider=payload.provider,
        api_key=payload.api_key,
        base_url=payload.base_url,
        model=payload.model,
    )
    return credential_manager.get_public_settings()

@router.post("/test-connection", response_model=TestConnectionResponse)
async def test_ai_connection(payload: TestConnectionRequest):
    return await ai_service.test_connection(
        provider=payload.provider,
        api_key=payload.api_key,
        base_url=payload.base_url,
        model=payload.model,
    )

@router.delete("", response_model=AISettings)
def clear_ai_settings():
    credential_manager.clear()
    return credential_manager.get_public_settings()

