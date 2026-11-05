from fastapi import APIRouter, HTTPException
from app.models.ai_models import (
    AIInterpretationRequest,
    AIInterpretationResponse,
    AIChatRequest,
    AIChatResponse,
)
from app.services.ai_service import ai_service

router = APIRouter(prefix="/ai", tags=["AI Scientific Assistant"])

@router.post("/interpret", response_model=AIInterpretationResponse)
async def interpret_findings(payload: AIInterpretationRequest):
    try:
        return await ai_service.interpret_assessment(payload)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except PermissionError as pe:
        raise HTTPException(status_code=401, detail=str(pe))
    except RuntimeError as re:
        raise HTTPException(status_code=502, detail=str(re))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

@router.post("/chat", response_model=AIChatResponse)
async def chat_assistant(payload: AIChatRequest):
    try:
        return await ai_service.chat(payload)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except PermissionError as pe:
        raise HTTPException(status_code=401, detail=str(pe))
    except RuntimeError as re:
        raise HTTPException(status_code=502, detail=str(re))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")
