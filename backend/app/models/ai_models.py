from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from app.models.experiment import ExperimentConfig
from app.models.assessment import ScientificAssessmentResult

class AISettings(BaseModel):
    provider: str = Field(default="openai", description="AI provider (openai, groq, openrouter, custom)")
    api_key_configured: bool = Field(default=False)
    masked_key: Optional[str] = None
    base_url: str = Field(default="https://api.openai.com/v1")
    model: str = Field(default="gpt-4o-mini")
    is_active: bool = Field(default=False)
    status_message: Optional[str] = None

class AISettingsUpdate(BaseModel):
    provider: str
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    model: str

class TestConnectionRequest(BaseModel):
    provider: str
    api_key: str
    base_url: Optional[str] = None
    model: str

class TestConnectionResponse(BaseModel):
    success: bool
    message: str
    detected_model: Optional[str] = None
    latency_ms: Optional[float] = None

class AIInterpretationRequest(BaseModel):
    experiment: ExperimentConfig
    assessment: ScientificAssessmentResult
    specific_question: Optional[str] = None

class AIInterpretationResponse(BaseModel):
    success: bool
    executive_overview: str
    biochemical_mechanism_analysis: str
    environmental_and_climate_perspective: str
    uncertainties_and_gap_analysis: str
    recommended_follow_up_experiments: List[str]
    provider: str
    model: str

class AIChatMessage(BaseModel):
    role: str  # user, assistant, system
    content: str

class AIChatRequest(BaseModel):
    messages: List[AIChatMessage]
    context_experiment: Optional[ExperimentConfig] = None
    context_assessment: Optional[ScientificAssessmentResult] = None

class AIChatResponse(BaseModel):
    reply: str
    provider: str
    model: str
