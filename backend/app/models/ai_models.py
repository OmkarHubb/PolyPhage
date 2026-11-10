import html
import re
from typing import List, Dict, Any, Optional, Union
from pydantic import BaseModel, Field, field_validator
from app.models.experiment import ExperimentConfig
from app.models.assessment import ScientificAssessmentResult

def clean_html_entities(s: Any) -> str:
    if s is None:
        return ""
    text = str(s)
    for _ in range(3):
        prev = text
        text = html.unescape(text)
        # Hex entities with semicolon (up to 4 digits)
        text = re.sub(r'&#x([0-9a-fA-F]{1,4});', lambda m: chr(int(m.group(1), 16)), text)
        # Hex entities without semicolon (2 digits, ASCII character range e.g. &#x49, &#x50, &#x4D)
        text = re.sub(r'&#x([0-9a-fA-F]{2})', lambda m: chr(int(m.group(1), 16)), text)
        # Decimal entities with semicolon
        text = re.sub(r'&#([0-9]{1,5});', lambda m: chr(int(m.group(1), 10)), text)
        # Decimal entities without semicolon (2-3 digits)
        text = re.sub(r'&#([0-9]{2,3})(?=[^0-9]|$)', lambda m: chr(int(m.group(1), 10)), text)
        if text == prev:
            break
    return text.strip()

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

class ProposedExperimentProposal(BaseModel):
    config: ExperimentConfig = Field(description="Validated proposed experiment configuration")
    scientific_rationale: str = Field(description="Mechanistic explanation of why this configuration is proposed")
    expected_outcomes: List[str] = Field(default_factory=list, description="Anticipated pathway progressions or product outputs")
    assumptions_and_boundaries: List[str] = Field(default_factory=list, description="Biochemical and physical constraints")
    supporting_evidence_ids: List[str] = Field(default_factory=list, description="IDs of literature evidence citations supporting this configuration")

    @field_validator("scientific_rationale", mode="before")
    @classmethod
    def clean_rationale(cls, v: Any) -> str:
        return clean_html_entities(v)

    @field_validator("expected_outcomes", "assumptions_and_boundaries", mode="before")
    @classmethod
    def clean_string_list(cls, v: Any) -> List[str]:
        if isinstance(v, list):
            return [clean_html_entities(x) for x in v]
        if isinstance(v, str):
            return [clean_html_entities(line.strip().lstrip("•-*0123456789. ")) for line in v.splitlines() if line.strip()]
        return []

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
    proposed_experiment: Optional[ProposedExperimentProposal] = Field(
        default=None,
        description="Optional validated structured experiment proposal ready for researcher review and Lab Bench application."
    )
    provider: str
    model: str

    @field_validator("executive_overview", "biochemical_mechanism_analysis", "environmental_and_climate_perspective", "uncertainties_and_gap_analysis", mode="before")
    @classmethod
    def coerce_to_string(cls, v: Any) -> str:
        if isinstance(v, list):
            joined = "\n\n".join(str(x) for x in v)
            return clean_html_entities(joined)
        return clean_html_entities(v)

    @field_validator("recommended_follow_up_experiments", mode="before")
    @classmethod
    def coerce_to_list(cls, v: Any) -> List[str]:
        if isinstance(v, list):
            return [clean_html_entities(str(x)) for x in v]
        if isinstance(v, str):
            return [clean_html_entities(line.strip().lstrip("•-*0123456789. ")) for line in v.splitlines() if line.strip()]
        return []

class AIChatMessage(BaseModel):
    role: str  # user, assistant, system, tool
    content: Optional[str] = None
    name: Optional[str] = None
    tool_calls: Optional[List[Dict[str, Any]]] = None

class AIChatRequest(BaseModel):
    messages: List[AIChatMessage]
    context_experiment: Optional[ExperimentConfig] = None
    context_assessment: Optional[ScientificAssessmentResult] = None

class AIChatResponse(BaseModel):
    reply: str
    executed_tools: List[Dict[str, Any]] = Field(default_factory=list)
    proposed_experiment: Optional[ProposedExperimentProposal] = None
    provider: str
    model: str

