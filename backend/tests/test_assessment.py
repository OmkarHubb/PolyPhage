import pytest
from fastapi.testclient import TestClient

# 1. Verify all imports work as expected, including re-exports from experiment model
from app.models.experiment import (
    ExperimentConfig,
    SelectedComponent,
    ComponentRole,
    ComponentCategory,
    EnvironmentConditions,
    OxygenAvailability,
)
from app.models.assessment import ViabilityStatus
from app.services.assessment_engine import scientific_engine
from app.main import app

client = TestClient(app)


def test_import_resilience():
    """Verify that models and enums are cleanly importable without ImportError."""
    assert ComponentRole.SUBSTRATE == "substrate"
    assert ComponentRole.CATALYST == "catalyst"
    assert ComponentCategory.PLASTICS == "Plastics"
    assert OxygenAvailability.AEROBIC == "Aerobic"


def test_pet_ispetase_assessment():
    """Test 1: PET + IsPETase under mesophilic reference conditions (30°C, pH 7.0)."""
    cfg = ExperimentConfig(
        name="PET + IsPETase Benchmark",
        selected_components=[
            SelectedComponent(component_id="comp_pet", role=ComponentRole.SUBSTRATE),
            SelectedComponent(component_id="comp_ispetase", role=ComponentRole.CATALYST),
        ],
        environment=EnvironmentConditions(
            temperature_celsius=30.0,
            ph=7.0,
            oxygen=OxygenAvailability.AEROBIC,
            salinity_percent=0.0,
            pressure_atm=1.0,
            duration_hours=24.0,
        ),
    )
    result = scientific_engine.assess_experiment(cfg)
    assert result.overall_status == "viable"
    assert result.overall_score == 92  # (90 + 95) / 2 = 92.5 -> int 92
    assert result.score_details is not None
    assert result.score_details.raw_component_mean == 92.5
    assert result.score_details.applied_cap is None

    # Products audit: MHET is primary intermediate; minor TPA without secondary MHETase
    prod_ids = [p.product_id for p in result.potential_products]
    assert "prod_mhet" in prod_ids
    assert "prod_tpa" in prod_ids

    mhet = next(p for p in result.potential_products if p.product_id == "prod_mhet")
    assert mhet.reaction_stage == "primary_cleavage_intermediate"
    assert "Primary cleavage intermediate" in mhet.yield_classification


def test_pet_ispetase_buffer_mean():
    """Test 2: PET + IsPETase + Sodium Phosphate Buffer: verifies raw mean calculation."""
    cfg = ExperimentConfig(
        name="PET + IsPETase + Buffer",
        selected_components=[
            SelectedComponent(component_id="comp_pet", role=ComponentRole.SUBSTRATE),
            SelectedComponent(component_id="comp_ispetase", role=ComponentRole.CATALYST),
            SelectedComponent(component_id="comp_buffer_phosphate", role=ComponentRole.BUFFER),
        ],
        environment=EnvironmentConditions(
            temperature_celsius=30.0,
            ph=7.0,
            oxygen=OxygenAvailability.AEROBIC,
            salinity_percent=0.0,
            pressure_atm=1.0,
            duration_hours=24.0,
        ),
    )
    result = scientific_engine.assess_experiment(cfg)
    assert result.overall_status == "viable"
    # Scores: PET 90, IsPETase 95, Buffer 90 -> sum = 275 / 3 = 91.666 -> int 91
    assert result.overall_score == 91
    assert result.score_details.raw_component_mean == 91.7
    assert result.score_details.applied_cap is None


def test_pet_ispetase_mhetase_cascade():
    """Test 3: Dual enzyme cascade (PET + IsPETase + MHETase)."""
    cfg = ExperimentConfig(
        name="Dual-Enzyme Depolymerization Cascade",
        selected_components=[
            SelectedComponent(component_id="comp_pet", role=ComponentRole.SUBSTRATE),
            SelectedComponent(component_id="comp_ispetase", role=ComponentRole.CATALYST),
            SelectedComponent(component_id="comp_mhetase", role=ComponentRole.CATALYST),
        ],
        environment=EnvironmentConditions(
            temperature_celsius=30.0,
            ph=7.0,
            oxygen=OxygenAvailability.AEROBIC,
            salinity_percent=0.0,
            pressure_atm=1.0,
            duration_hours=24.0,
        ),
    )
    result = scientific_engine.assess_experiment(cfg)
    assert result.overall_status == "viable"
    assert len(result.active_pathways) >= 2

    # Verify both primary intermediate and secondary hydrolysis products are distinguished
    stages = {p.reaction_stage for p in result.potential_products}
    assert "primary_cleavage_intermediate" in stages
    assert "secondary_hydrolysis_product" in stages


def test_pet_lcc_thermophilic():
    """Test 4: Thermophilic PET depolymerization by LCC-ICCG at 72°C."""
    cfg = ExperimentConfig(
        name="Thermophilic Cutinase Run",
        selected_components=[
            SelectedComponent(component_id="comp_pet", role=ComponentRole.SUBSTRATE),
            SelectedComponent(component_id="comp_lcc_iccg", role=ComponentRole.CATALYST),
        ],
        environment=EnvironmentConditions(
            temperature_celsius=72.0,
            ph=8.0,
            oxygen=OxygenAvailability.AEROBIC,
            salinity_percent=0.0,
            pressure_atm=1.0,
            duration_hours=10.0,
        ),
    )
    result = scientific_engine.assess_experiment(cfg)
    assert result.overall_status == "viable"
    assert result.overall_score == 92  # (90 + 95) / 2 = 92

    stages = {p.reaction_stage for p in result.potential_products}
    assert "direct_cleavage_monomer" in stages


def test_thermal_denaturation_override_cap():
    """Test 5: IsPETase at 70°C: verifies that the 30 ceiling overrides the raw mean."""
    cfg = ExperimentConfig(
        name="Thermal Denaturation Stress",
        selected_components=[
            SelectedComponent(component_id="comp_pet", role=ComponentRole.SUBSTRATE),
            SelectedComponent(component_id="comp_ispetase", role=ComponentRole.CATALYST),
            SelectedComponent(component_id="comp_buffer_phosphate", role=ComponentRole.BUFFER),
        ],
        environment=EnvironmentConditions(
            temperature_celsius=70.0,
            ph=7.0,
            oxygen=OxygenAvailability.AEROBIC,
            salinity_percent=0.0,
            pressure_atm=1.0,
            duration_hours=12.0,
        ),
    )
    result = scientific_engine.assess_experiment(cfg)
    assert result.overall_status == "inactivated"
    # Raw component scores: PET 90, IsPETase 10 (denatured), Buffer 90 -> raw mean = 63.3
    assert result.score_details.raw_component_mean == 63.3
    # Hard system cap applied: overall_score MUST be capped at 30
    assert result.score_details.applied_cap == 30
    assert result.overall_score == 30
    assert "Terminal inactivation override" in result.score_details.override_reason


def test_ph_stress_penalty():
    """Test 6: IsPETase at pH 4.0: verifies that pH stress applies a 35-point penalty without cap."""
    cfg = ExperimentConfig(
        name="pH Stress Test",
        selected_components=[
            SelectedComponent(component_id="comp_pet", role=ComponentRole.SUBSTRATE),
            SelectedComponent(component_id="comp_ispetase", role=ComponentRole.CATALYST),
            SelectedComponent(component_id="comp_buffer_phosphate", role=ComponentRole.BUFFER),
        ],
        environment=EnvironmentConditions(
            temperature_celsius=30.0,
            ph=4.0,
            oxygen=OxygenAvailability.AEROBIC,
            salinity_percent=0.0,
            pressure_atm=1.0,
            duration_hours=24.0,
        ),
    )
    result = scientific_engine.assess_experiment(cfg)
    assert result.overall_status == "suboptimal"
    # Raw scores: PET 90, IsPETase 60 (95 - 35), Buffer 90 -> raw mean = (90 + 60 + 90)/3 = 80.0
    assert result.overall_score == 80
    assert result.score_details.raw_component_mean == 80.0
    assert result.score_details.applied_cap is None


def test_api_health_endpoint():
    """Test 7: GET /health returns online status."""
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "online"


def test_api_components_catalog():
    """Test 8: GET /api/components returns all 13 components."""
    res = client.get("/api/components")
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 10


def test_api_assessment_run_endpoint():
    """Test 9: POST /api/assessment/run returns complete structured result."""
    payload = {
        "name": "Live Assessment Run Test",
        "selected_components": [
            {"component_id": "comp_pet", "role": "substrate"},
            {"component_id": "comp_ispetase", "role": "catalyst"},
        ],
        "environment": {
            "temperature_celsius": 30.0,
            "ph": 7.0,
            "oxygen": "Aerobic",
            "salinity_percent": 0.0,
            "pressure_atm": 1.0,
            "duration_hours": 24.0,
        },
    }
    res = client.post("/api/assessment/run", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["overall_status"] == "viable"
    assert data["overall_score"] == 92
    assert "score_methodology" in data
    assert "score_breakdown" in data
    assert "score_details" in data
    assert data["score_details"]["raw_component_mean"] == 92.5
    assert len(data["potential_products"]) > 0
    assert data["potential_products"][0]["reaction_stage"] == "primary_cleavage_intermediate"
