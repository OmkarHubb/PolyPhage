from enum import Enum
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class EvidenceLevel(str, Enum):
    EXPERIMENTAL = "experimental"
    LITERATURE_SUPPORTED = "literature_supported"
    COMPUTATIONAL = "computational"
    INSUFFICIENT_EVIDENCE = "insufficient_evidence"

class ViabilityStatus(str, Enum):
    OPTIMAL = "optimal"
    SUBOPTIMAL = "suboptimal"
    INHIBITORY = "inhibitory"
    DENATURED_OR_LETHAL = "denatured_or_lethal"
    INCOMPATIBLE = "incompatible"

class ComponentAssessment(BaseModel):
    component_id: str
    name: str
    role: str
    viability_status: ViabilityStatus
    temperature_assessment: str
    ph_assessment: str
    notes: List[str] = Field(default_factory=list)

class InteractionAssessment(BaseModel):
    interaction_type: str  # catalytic_cleavage, synergy, product_inhibition, environmental_stress, neutral
    title: str
    description: str
    participants: List[str]
    evidence_ids: List[str] = Field(default_factory=list)
    confidence: EvidenceLevel

class PathwayFinding(BaseModel):
    pathway_id: str
    name: str
    description: str
    status: str  # active, rate_limited, inactivated
    limiting_factors: List[str] = Field(default_factory=list)
    steps: List[Dict[str, Any]] = Field(default_factory=list)
    evidence_ids: List[str] = Field(default_factory=list)

class ProductFinding(BaseModel):
    product_id: str
    name: str
    formula: Optional[str] = None
    molar_mass: Optional[str] = None
    yield_classification: str  # Primary major product, Intermediate metabolite, Trace byproduct, Unlikely
    solubility_and_phase: str
    biological_and_environmental_impact: str
    evidence_id: Optional[str] = None

class EnvironmentalImplication(BaseModel):
    category: str  # Carbon recovery, Acidification risk, Toxicity, Microplastic mitigation
    finding: str
    recommendation: str
    severity_or_benefit: str  # High Benefit, Moderate Benefit, Manageable Risk, Critical Precaution

class ScientificAssessmentResult(BaseModel):
    experiment_id: str
    timestamp: str
    overall_status: str  # viable, suboptimal, inactivated, incompatible
    overall_score: int = Field(ge=0, le=100, description="Scientific viability index based on environmental tolerance rules")
    executive_summary: str
    component_assessments: List[ComponentAssessment]
    interactions: List[InteractionAssessment]
    active_pathways: List[PathwayFinding]
    potential_products: List[ProductFinding]
    environmental_implications: List[EnvironmentalImplication]
    evidence_references: List[Dict[str, Any]]
    assumptions_and_limitations: List[str]
    missing_evidence_and_uncertainties: List[str]
    experimental_reference_data_points: List[Dict[str, Any]]

