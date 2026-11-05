from fastapi import APIRouter, HTTPException
from app.models.experiment import ExperimentConfig
from app.models.assessment import ScientificAssessmentResult
from app.services.assessment_engine import scientific_engine

router = APIRouter(prefix="/assessment", tags=["Assessment"])

@router.post("/run", response_model=ScientificAssessmentResult)
def run_assessment(config: ExperimentConfig):
    if not config.selected_components:
        raise HTTPException(
            status_code=400,
            detail="Experiment must contain at least one component to evaluate.",
        )
    try:
        result = scientific_engine.assess_experiment(config)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Deterministic assessment failed: {str(e)}",
        )
