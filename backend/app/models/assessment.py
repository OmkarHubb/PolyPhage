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
    reaction_stage: Optional[str] = Field(
        default=None,
        description="Reaction stage: 'primary_cleavage_intermediate', 'secondary_hydrolysis_product', 'direct_cleavage_monomer', or 'byproduct'"
    )
    yield_classification: str  # Primary cleavage intermediate, Secondary hydrolysis product, Direct cleavage monomer, Trace intermediate, etc.
    solubility_and_phase: str
    biological_and_environmental_impact: str
    evidence_id: Optional[str] = None

class EnvironmentalImplication(BaseModel):
    category: str  # Carbon recovery, Acidification risk, Toxicity, Microplastic mitigation
    finding: str
    recommendation: str
    severity_or_benefit: str  # High Benefit, Moderate Benefit, Manageable Risk, Critical Precaution

class ComponentScoreEntry(BaseModel):
    component_id: str
    name: str
    category: str
    heuristic_score: int
    basis: str  # Short explanation of what drove this component's score

class ScoreCalculationDetails(BaseModel):
    raw_component_mean: float = Field(description="Arithmetic mean of individual component heuristic scores before system caps")
    applied_cap: Optional[int] = Field(default=None, description="System cap applied (e.g. 30 if any biocatalyst is denatured)")
    override_reason: Optional[str] = Field(default=None, description="Reason for system cap or override")
    calculation_steps: List[str] = Field(default_factory=list, description="Ordered step-by-step trace of how the index was derived")

class ScientificAssessmentResult(BaseModel):
    experiment_id: str
    timestamp: str
    overall_status: str  # viable, suboptimal, inactivated, incompatible
    overall_score: int = Field(ge=0, le=100, description="Rule-based compatibility index derived from literature-sourced tolerance thresholds")
    score_methodology: str = Field(
        default="",
        description="Explanation of score derivation. Not an experimentally validated degradation yield or probability."
    )
    score_breakdown: List[ComponentScoreEntry] = Field(
        default_factory=list,
        description="Per-component heuristic scores contributing to the overall compatibility index."
    )
    score_details: Optional[ScoreCalculationDetails] = Field(
        default=None,
        description="Detailed calculation trace distinguishing raw component mean from system caps or overrides."
    )
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

