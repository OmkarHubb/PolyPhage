import json
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


def test_pressure_parameter_in_assessment():
    """Test 10: Verify assessment accepts elevated atmospheric pressure (e.g. 2.5 atm)."""
    cfg = ExperimentConfig(
        name="Pressurized Bioreactor Run",
        selected_components=[
            SelectedComponent(component_id="comp_pet", role=ComponentRole.SUBSTRATE),
            SelectedComponent(component_id="comp_ispetase", role=ComponentRole.CATALYST),
        ],
        environment=EnvironmentConditions(
            temperature_celsius=30.0,
            ph=7.0,
            oxygen=OxygenAvailability.AEROBIC,
            salinity_percent=0.0,
            pressure_atm=2.5,
            duration_hours=24.0,
        ),
    )
    result = scientific_engine.assess_experiment(cfg)
    assert result.overall_status == "viable"
    assert result.overall_score == 92


def test_custom_provider_omits_response_format():
    """Test 11: Verify custom provider omits response_format: {"type": "json_object"}."""
    import asyncio
    from unittest.mock import patch, MagicMock
    from app.services.ai_service import ai_service
    from app.services.credential_manager import credential_manager
    from app.models.ai_models import AIInterpretationRequest

    orig_cache = dict(credential_manager._cache)
    try:
        credential_manager._cache.update({
            "provider": "custom",
            "api_key": "test-key-mock",
            "base_url": "http://mock-ai.local/v1",
            "model": "mistral-7b-instruct",
            "is_active": True,
        })

        captured_payload = {}
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "choices": [{
                "message": {
                    "content": '```json\n{"executive_overview": "Custom provider success without response_format."}\n```'
                }
            }]
        }

        async def mock_post(url, headers=None, json=None):
            nonlocal captured_payload
            captured_payload = json
            return mock_resp

        with patch("httpx.AsyncClient.post", side_effect=mock_post):
            cfg = ExperimentConfig(
                name="AI Test",
                selected_components=[
                    SelectedComponent(component_id="comp_pet", role=ComponentRole.SUBSTRATE),
                    SelectedComponent(component_id="comp_ispetase", role=ComponentRole.CATALYST),
                ],
                environment=EnvironmentConditions(),
            )
            assessment = scientific_engine.assess_experiment(cfg)
            req = AIInterpretationRequest(experiment=cfg, assessment=assessment)
            res = asyncio.run(ai_service.interpret_assessment(req))

            assert res.success is True
            assert "response_format" not in captured_payload
            assert res.executive_overview == "Custom provider success without response_format."
    finally:
        credential_manager._cache = orig_cache


def test_custom_provider_retry_on_400():
    """Test 12: Verify provider retries without response_format if HTTP 400 rejection occurs."""
    import asyncio
    from unittest.mock import patch, MagicMock
    from app.services.ai_service import ai_service
    from app.services.credential_manager import credential_manager
    from app.models.ai_models import AIInterpretationRequest

    orig_cache = dict(credential_manager._cache)
    try:
        credential_manager._cache.update({
            "provider": "openai",  # Initially sends response_format
            "api_key": "test-key-mock",
            "base_url": "http://mock-proxy.local/v1",
            "model": "proxy-model",
            "is_active": True,
        })

        resp_400 = MagicMock()
        resp_400.status_code = 400
        resp_400.text = '{"error": {"message": "unrecognized parameter: response_format in request schema"}}'

        resp_200 = MagicMock()
        resp_200.status_code = 200
        resp_200.json.return_value = {
            "choices": [{
                "message": {
                    "content": '```json\n{"executive_overview": "Retry succeeded after stripping response_format."}\n```'
                }
            }]
        }

        call_history = []
        async def mock_post(url, headers=None, json=None):
            call_history.append(json)
            if len(call_history) == 1:
                return resp_400
            return resp_200

        with patch("httpx.AsyncClient.post", side_effect=mock_post):
            cfg = ExperimentConfig(
                name="AI Retry Test",
                selected_components=[
                    SelectedComponent(component_id="comp_pet", role=ComponentRole.SUBSTRATE),
                    SelectedComponent(component_id="comp_ispetase", role=ComponentRole.CATALYST),
                ],
                environment=EnvironmentConditions(),
            )
            assessment = scientific_engine.assess_experiment(cfg)
            req = AIInterpretationRequest(experiment=cfg, assessment=assessment)
            res = asyncio.run(ai_service.interpret_assessment(req))

            assert res.success is True
            assert len(call_history) == 2
            assert "response_format" in call_history[0]
            assert "response_format" not in call_history[1]
            assert res.executive_overview == "Retry succeeded after stripping response_format."
    finally:
        credential_manager._cache = orig_cache


def test_concentration_validation_positive_and_units():
    """Test 13: Concentration validation enforces positive quantities and valid units."""
    # 1. Valid inputs
    sc1 = SelectedComponent(component_id="comp_ispetase", role=ComponentRole.CATALYST, concentration="50 nM")
    assert sc1.concentration == "50 nM"
    assert sc1.concentration_value == 50.0
    assert sc1.concentration_unit == "nM"

    sc2 = SelectedComponent(component_id="comp_pet", role=ComponentRole.SUBSTRATE, concentration_value=10, concentration_unit="mg/mL")
    assert sc2.concentration == "10 mg/mL"

    # 2. None / Unspecified is acceptable
    sc3 = SelectedComponent(component_id="comp_buffer_phosphate", role=ComponentRole.BUFFER, concentration=None)
    assert sc3.concentration is None

    # 3. Invalid unit rejection
    with pytest.raises(ValueError, match="Unsupported concentration unit|Invalid concentration unit"):
        SelectedComponent(component_id="comp_pet", role=ComponentRole.SUBSTRATE, concentration="10 lightyears")

    # 4. Negative value rejection
    with pytest.raises(ValueError, match="must be positive"):
        SelectedComponent(component_id="comp_pet", role=ComponentRole.SUBSTRATE, concentration="-5 mg/mL")

    # 5. Zero value rejection
    with pytest.raises(ValueError, match="must be positive"):
        SelectedComponent(component_id="comp_pet", role=ComponentRole.SUBSTRATE, concentration="0 mg/mL")


def test_concentration_preservation_and_non_kinetic_invariance():
    """Test 14: Concentration is echoed into assessment output and does NOT falsely alter kinetic score."""
    cfg1 = ExperimentConfig(
        name="Low Concentration Run",
        selected_components=[
            SelectedComponent(component_id="comp_pet", role=ComponentRole.SUBSTRATE, concentration="5 mg/mL"),
            SelectedComponent(component_id="comp_ispetase", role=ComponentRole.CATALYST, concentration="10 nM"),
        ],
        environment=EnvironmentConditions(),
    )
    res1 = scientific_engine.assess_experiment(cfg1)

    cfg2 = ExperimentConfig(
        name="High Concentration Run",
        selected_components=[
            SelectedComponent(component_id="comp_pet", role=ComponentRole.SUBSTRATE, concentration="200 mg/mL"),
            SelectedComponent(component_id="comp_ispetase", role=ComponentRole.CATALYST, concentration="500 nM"),
        ],
        environment=EnvironmentConditions(),
    )
    res2 = scientific_engine.assess_experiment(cfg2)

    # Verify concentration is preserved in component assessment output
    conc_map1 = {ca.component_id: ca.concentration for ca in res1.component_assessments}
    assert conc_map1["comp_pet"] == "5 mg/mL"
    assert conc_map1["comp_ispetase"] == "10 nM"

    conc_map2 = {ca.component_id: ca.concentration for ca in res2.component_assessments}
    assert conc_map2["comp_pet"] == "200 mg/mL"
    assert conc_map2["comp_ispetase"] == "500 nM"

    # Non-kinetic invariance: score and pathways are identical (no fabricated rates)
    assert res1.overall_score == res2.overall_score
    assert res1.overall_status == res2.overall_status
    assert len(res1.active_pathways) == len(res2.active_pathways)

    # Explanation disclaimer exists in assumptions
    assert any("does not use concentration to calculate enzymatic reaction rates" in a for a in res1.assumptions_and_limitations)


def test_tool_dispatcher_catalog_and_literature():
    """Test 15: Tool dispatcher retrieves verified components and literature citations."""
    from app.services.tool_dispatcher import tool_dispatcher

    # 1. Catalog query
    cat_res = tool_dispatcher.dispatch("get_component_catalog", {"category": "Enzymes"})
    assert cat_res["success"] is True
    assert cat_res["count"] >= 3
    enzyme_ids = {c["id"] for c in cat_res["components"]}
    assert "comp_ispetase" in enzyme_ids
    assert "comp_lcc_iccg" in enzyme_ids

    # 2. Literature query by DOI
    lit_res = tool_dispatcher.dispatch("search_literature", {"doi": "10.1126/science.aad6359"})
    assert lit_res["success"] is True
    assert lit_res["count"] == 1
    assert lit_res["references"][0]["id"] == "ref_yoshida_2016"
    assert "Ideonella sakaiensis" in lit_res["references"][0]["abstract_summary"]

    # 3. Literature query by component_id
    lit_pet = tool_dispatcher.dispatch("search_literature", {"component_id": "comp_pet"})
    assert lit_pet["success"] is True
    assert lit_pet["count"] >= 1


def test_tool_dispatcher_simulate_assessment():
    """Test 16: Tool dispatcher runs simulate_assessment without altering active state."""
    from app.services.tool_dispatcher import tool_dispatcher

    payload = {
        "name": "Simulated Cascade Run",
        "selected_components": [
            {"component_id": "comp_pet", "role": "substrate", "concentration": "10 mg/mL"},
            {"component_id": "comp_ispetase", "role": "catalyst", "concentration": "50 nM"},
            {"component_id": "comp_mhetase", "role": "catalyst", "concentration": "50 nM"},
        ],
        "environment": {
            "temperature_celsius": 30.0,
            "ph": 7.0,
        },
    }
    sim_res = tool_dispatcher.dispatch("simulate_assessment", payload)
    assert sim_res["success"] is True
    assert sim_res["overall_status"] == "viable"
    assert sim_res["overall_score"] >= 90
    assert "Computational rule-based assessment" in sim_res["assessment_nature"]
    assert len(sim_res["active_pathways"]) >= 2

    # Test error handling on unauthorized tool
    bad_res = tool_dispatcher.dispatch("execute_shell_command", {"cmd": "ls"})
    assert bad_res["success"] is False
    assert "not recognized" in bad_res["error"]


def test_ai_interpretation_with_proposed_experiment():
    """Test 17: AI interpretation parses and validates structured experiment proposals."""
    import asyncio
    from unittest.mock import patch, MagicMock
    from app.services.ai_service import ai_service
    from app.services.credential_manager import credential_manager
    from app.models.ai_models import AIInterpretationRequest

    orig_cache = dict(credential_manager._cache)
    try:
        credential_manager._cache.update({
            "provider": "openai",
            "api_key": "test-key-mock",
            "base_url": "http://mock-ai.local/v1",
            "model": "gpt-4o-mini",
            "is_active": True,
        })

        mock_proposal_json = {
            "executive_overview": "Grounded assessment with follow-up design.",
            "biochemical_mechanism_analysis": "Active site triad dynamics.",
            "environmental_and_climate_perspective": "Circularity positive.",
            "uncertainties_and_gap_analysis": "Crystallinity factor.",
            "recommended_follow_up_experiments": ["Add MHETase at 50 nM."],
            "proposed_experiment": {
                "config": {
                    "name": "Dual-Enzyme Optimization Sweep",
                    "selected_components": [
                        {"component_id": "comp_pet", "role": "substrate", "concentration": "10 mg/mL"},
                        {"component_id": "comp_ispetase", "role": "catalyst", "concentration": "50 nM"},
                        {"component_id": "comp_mhetase", "role": "catalyst", "concentration": "50 nM"},
                    ],
                    "environment": {
                        "temperature_celsius": 30.0,
                        "ph": 7.0,
                        "oxygen": "Aerobic",
                        "salinity_percent": 0.0,
                        "pressure_atm": 1.0,
                        "duration_hours": 24.0,
                        "agitation_rpm": 150,
                    },
                },
                "scientific_rationale": "Addition of MHETase resolves product inhibition on IsPETase.",
                "expected_outcomes": ["Clearing of soluble MHET intermediate", "Higher yield of monomeric TPA and EG"],
                "assumptions_and_boundaries": ["Presumes low-crystallinity amorphous PET"],
                "supporting_evidence_ids": ["ref_yoshida_2016", "ref_palm_2019"],
            },
        }

        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "choices": [{"message": {"content": json.dumps(mock_proposal_json)}}]
        }

        async def mock_post(url, headers=None, json=None):
            return mock_resp

        with patch("httpx.AsyncClient.post", side_effect=mock_post):
            cfg = ExperimentConfig(
                name="Base PET Run",
                selected_components=[
                    SelectedComponent(component_id="comp_pet", role=ComponentRole.SUBSTRATE),
                    SelectedComponent(component_id="comp_ispetase", role=ComponentRole.CATALYST),
                ],
                environment=EnvironmentConditions(),
            )
            assessment = scientific_engine.assess_experiment(cfg)
            req = AIInterpretationRequest(experiment=cfg, assessment=assessment)
            res = asyncio.run(ai_service.interpret_assessment(req))

            assert res.success is True
            assert res.proposed_experiment is not None
            assert res.proposed_experiment.config.name == "Dual-Enzyme Optimization Sweep"
            assert len(res.proposed_experiment.config.selected_components) == 3
            assert "MHETase" in res.proposed_experiment.scientific_rationale
            assert res.proposed_experiment.supporting_evidence_ids == ["ref_yoshida_2016", "ref_palm_2019"]
    finally:
        credential_manager._cache = orig_cache


def test_ai_chat_tool_calling_loop():
    """Test 18: AI Chat executes backend scientific tools and returns synthesized answer."""
    import asyncio
    from unittest.mock import patch, MagicMock
    from app.services.ai_service import ai_service
    from app.services.credential_manager import credential_manager
    from app.models.ai_models import AIChatRequest, AIChatMessage

    orig_cache = dict(credential_manager._cache)
    try:
        credential_manager._cache.update({
            "provider": "openai",
            "api_key": "test-key-mock",
            "base_url": "http://mock-ai.local/v1",
            "model": "gpt-4o-mini",
            "is_active": True,
        })

        # Step 1: Model asks to call get_component_catalog
        resp_tool_call = MagicMock()
        resp_tool_call.status_code = 200
        resp_tool_call.json.return_value = {
            "choices": [{
                "message": {
                    "role": "assistant",
                    "content": None,
                    "tool_calls": [{
                        "id": "call_123",
                        "type": "function",
                        "function": {
                            "name": "get_component_catalog",
                            "arguments": json.dumps({"category": "Enzymes"}),
                        },
                    }],
                }
            }]
        }

        # Step 2: Model receives tool result and produces final answer
        resp_final = MagicMock()
        resp_final.status_code = 200
        resp_final.json.return_value = {
            "choices": [{
                "message": {
                    "role": "assistant",
                    "content": "PolyPhage includes 4 verified enzymes: IsPETase, FAST-PETase, LCC-ICCG, and MHETase.",
                }
            }]
        }

        call_idx = 0
        async def mock_post(url, headers=None, json=None):
            nonlocal call_idx
            call_idx += 1
            if call_idx == 1:
                return resp_tool_call
            return resp_final

        with patch("httpx.AsyncClient.post", side_effect=mock_post):
            req = AIChatRequest(
                messages=[AIChatMessage(role="user", content="What enzymes are available?")]
            )
            res = asyncio.run(ai_service.chat(req))

            assert res.reply == "PolyPhage includes 4 verified enzymes: IsPETase, FAST-PETase, LCC-ICCG, and MHETase."
            assert call_idx == 2
    finally:
        credential_manager._cache = orig_cache


def test_environmental_impact_and_lca_disclaimer():
    """Test 19: Environmental section includes circularity, acidification, process energy, and LCA disclaimer."""
    cfg = ExperimentConfig(
        name="PET + IsPETase + MHETase Environmental Run",
        selected_components=[
            SelectedComponent(component_id="comp_pet", role=ComponentRole.SUBSTRATE),
            SelectedComponent(component_id="comp_ispetase", role=ComponentRole.CATALYST),
            SelectedComponent(component_id="comp_mhetase", role=ComponentRole.CATALYST),
        ],
        environment=EnvironmentConditions(temperature_celsius=30.0, ph=7.0, agitation_rpm=150),
    )
    result = scientific_engine.assess_experiment(cfg)

    # 1. LCA Disclaimer
    assert "PolyPhage does not currently calculate net greenhouse gas savings or perform a complete Life Cycle Assessment" in result.lca_disclaimer

    # 2. Circularity potential
    assert result.circularity_potential is not None
    assert "monomeric terephthalic acid (TPA)" in result.circularity_potential

    # 3. Acidification considerations
    assert result.acidification_considerations is not None
    assert "carboxylic acid end groups" in result.acidification_considerations
    assert "Exact caustic consumption cannot be stated without empirical mass-balance titration" in result.acidification_considerations

    # 4. Process energy considerations
    assert len(result.process_energy_considerations) >= 4
    assert any("Bioreactor Thermal Input" in e for e in result.process_energy_considerations)
    assert any("Vessel Agitation Power" in e for e in result.process_energy_considerations)
    assert any("Pretreatment" in e for e in result.process_energy_considerations)

    # 5. Evidence type distinction
    evidence_types = {imp.evidence_type for imp in result.environmental_implications}
    assert "literature_supported" in evidence_types
    assert "theoretical_chemical_consideration" in evidence_types


def test_environmental_scientific_governance_refinement():
    """Test 30: Environmental Section E scientific accuracy refinement.
    Ensures:
    1. No unsupported categorical ratings like 'High Benefit' or 'Moderate Benefit'.
    2. Only qualified labels ('Potential Benefit', 'Conditional Benefit', 'Requires Validation', 'Potential Environmental Trade-off').
    3. Clear distinction between literature-supported, theoretical chemical, rule-based, and experimental data.
    4. Configuration-specific evaluation: single-enzyme PET + IsPETase acknowledges MHET accumulation and downstream MHETase requirement.
    5. No claims of demonstrated waste diversion from landfill or incineration.
    6. Acidification states 1-2 molar equivalents as theoretical chemical stoichiometry, not physical measurement.
    7. LCA disclaimer is strictly preserved without calculated CO2 savings.
    """
    # Case 1: PET + wild-type IsPETase in isolation (no MHETase)
    cfg_ispetase = ExperimentConfig(
        name="PET + IsPETase Single-Enzyme Benchmark",
        selected_components=[
            SelectedComponent(component_id="comp_pet", role=ComponentRole.SUBSTRATE),
            SelectedComponent(component_id="comp_ispetase", role=ComponentRole.CATALYST),
            SelectedComponent(component_id="comp_buffer_phosphate", role=ComponentRole.BUFFER, concentration_value=50.0, concentration_unit="mM"),
        ],
        environment=EnvironmentConditions(temperature_celsius=30.0, ph=7.0, agitation_rpm=150),
    )
    res_ispetase = scientific_engine.assess_experiment(cfg_ispetase)

    # 1 & 2. Categorical labels
    allowed_labels = {
        "Potential Benefit",
        "Conditional Benefit",
        "Requires Validation",
        "Potential Environmental Trade-off",
    }
    for imp in res_ispetase.environmental_implications:
        assert imp.severity_or_benefit != "High Benefit", f"Forbidden label 'High Benefit' found in {imp.category}"
        assert imp.severity_or_benefit != "Moderate Benefit", f"Forbidden label 'Moderate Benefit' found in {imp.category}"
        assert imp.severity_or_benefit in allowed_labels, f"Unqualified label '{imp.severity_or_benefit}' in {imp.category}"

    # 3. Evidence type distinction
    for imp in res_ispetase.environmental_implications:
        assert imp.evidence_type != "experimentally_measured", "Must not claim measured impact without wet-lab telemetry"
        assert imp.evidence_type in {
            "literature_supported",
            "theoretical_chemical_consideration",
            "rule_based_finding",
        }

    # 4 & 5. Single-enzyme PET + IsPETase without MHETase must acknowledge MHET accumulation
    circ = res_ispetase.circularity_potential
    assert circ is not None
    assert "MHET" in circ
    assert "not established" in circ.lower() or "constrained" in circ.lower()
    assert "mhetase" in circ.lower()  # downstream requirement
    assert "closed-loop repolymerization cannot be claimed" in circ or "not established" in circ

    # 6. No claim of demonstrated diversion from landfill or incineration
    for imp in res_ispetase.environmental_implications:
        assert "diverts post-consumer pet from municipal incineration" not in imp.finding.lower()
        assert "diverts post-consumer pet from municipal incineration" not in imp.recommendation.lower()
        assert "cannot be claimed to demonstrably divert" in imp.recommendation or "divert" not in imp.finding.lower()

    # 7. Acidification theoretical stoichiometry basis
    acid_text = res_ispetase.acidification_considerations
    assert acid_text is not None
    assert "stoichiometric" in acid_text.lower() or "stoichiometry" in acid_text.lower()
    assert "not" in acid_text.lower() and "measured" in acid_text.lower()

    # Acidification implication card
    acid_imp = next(imp for imp in res_ispetase.environmental_implications if "Acidification" in imp.category)
    assert acid_imp.evidence_type == "theoretical_chemical_consideration"
    assert "chemical stoichiometry" in acid_imp.finding.lower()
    assert acid_imp.severity_or_benefit == "Potential Environmental Trade-off"

    # 8. Preserved LCA disclaimer without quantified CO2
    assert "PolyPhage does not currently calculate net greenhouse gas savings" in res_ispetase.lca_disclaimer
    assert "kg CO2" not in res_ispetase.lca_disclaimer and "net CO2" not in res_ispetase.lca_disclaimer


def test_experiment_id_generation_and_preservation():
    """Test 21: Assessment engine generates and preserves alphanumeric experiment IDs."""
    # A. Unspecified ID generates formatted polymer ID
    cfg1 = ExperimentConfig(
        name="PET Degradation Study",
        selected_components=[
            SelectedComponent(component_id="comp_pet", role=ComponentRole.SUBSTRATE),
            SelectedComponent(component_id="comp_ispetase", role=ComponentRole.CATALYST),
        ],
        environment=EnvironmentConditions(),
    )
    res1 = scientific_engine.assess_experiment(cfg1)
    assert res1.experiment_id.startswith("PET-")
    parts1 = res1.experiment_id.split("-")
    assert len(parts1) == 3
    assert len(parts1[1]) == 8  # YYYYMMDD
    assert len(parts1[2]) == 3  # Sequence

    # B. Existing non-legacy ID is preserved
    custom_id = "PET-20261107-001"
    cfg2 = ExperimentConfig(
        id=custom_id,
        name="PET Reassessment Run",
        selected_components=[
            SelectedComponent(component_id="comp_pet", role=ComponentRole.SUBSTRATE),
            SelectedComponent(component_id="comp_ispetase", role=ComponentRole.CATALYST),
        ],
        environment=EnvironmentConditions(),
    )
    res2 = scientific_engine.assess_experiment(cfg2)
    assert res2.experiment_id == custom_id


def test_ai_chat_response_executed_tools_and_synthesis():
    """Test 22: AI chat service returns executed_tools and eliminates generic fallback."""
    import asyncio
    from unittest.mock import AsyncMock, patch, MagicMock
    from app.services.ai_service import ai_service
    from app.services.credential_manager import credential_manager
    from app.models.ai_models import AIChatRequest, AIChatMessage

    orig_cache = dict(credential_manager._cache)
    credential_manager._cache["openai"] = {
        "api_key": "sk-testkey12345",
        "base_url": "https://api.openai.com/v1",
        "model": "gpt-4o-mini",
    }

    try:
        # Mock provider returning simulate_assessment tool call, then continuation returning empty reply
        mock_res1 = MagicMock()
        mock_res1.status_code = 200
        mock_res1.json.return_value = {
            "choices": [
                {
                    "message": {
                        "role": "assistant",
                        "content": None,
                        "tool_calls": [
                            {
                                "id": "call_sim_99",
                                "type": "function",
                                "function": {
                                    "name": "simulate_assessment",
                                    "arguments": json.dumps({
                                        "name": "Simulated PET Run",
                                        "selected_components": [
                                            {"component_id": "comp_pet", "role": "substrate"},
                                            {"component_id": "comp_ispetase", "role": "catalyst"},
                                        ],
                                        "environment": {"temperature_celsius": 30.0, "ph": 7.0},
                                    }),
                                },
                            }
                        ],
                    }
                }
            ]
        }

        mock_res2 = MagicMock()
        mock_res2.status_code = 200
        # Empty message content
        mock_res2.json.return_value = {
            "choices": [{"message": {"role": "assistant", "content": ""}}]
        }

        with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
            mock_post.side_effect = [mock_res1, mock_res2]

            req = AIChatRequest(
                messages=[AIChatMessage(role="user", content="Simulate PET reaction")]
            )
            res = asyncio.run(ai_service.chat(req))

            # Must NOT be "Research query resolved."
            assert res.reply != "Research query resolved."
            assert "Selected Components" in res.reply or "Actual Assessment" in res.reply
            assert len(res.executed_tools) >= 1
            assert any(et["tool"] == "simulate_assessment" for et in res.executed_tools)
            assert res.proposed_experiment is not None
            assert res.proposed_experiment.config.name == "Simulated PET Run"
    finally:
        credential_manager._cache = orig_cache


def test_thermophilic_workflow_orchestration_completes_simulation_and_7_sections():
    """Test 23: When user requests assessment but model only searches catalog, backend orchestrates simulation & 7 sections."""
    import asyncio
    from unittest.mock import AsyncMock, patch, MagicMock
    from app.services.ai_service import ai_service
    from app.services.credential_manager import credential_manager
    from app.models.ai_models import AIChatRequest, AIChatMessage

    orig_cache = dict(credential_manager._cache)
    credential_manager._cache["openai"] = {
        "api_key": "sk-testkey12345",
        "base_url": "https://api.openai.com/v1",
        "model": "gpt-4o-mini",
    }

    try:
        # Mock provider returning ONLY get_component_catalog for LCC, then returning text without simulate_assessment
        mock_res1 = MagicMock()
        mock_res1.status_code = 200
        mock_res1.json.return_value = {
            "choices": [
                {
                    "message": {
                        "role": "assistant",
                        "content": None,
                        "tool_calls": [
                            {
                                "id": "call_cat_lcc",
                                "type": "function",
                                "function": {
                                    "name": "get_component_catalog",
                                    "arguments": json.dumps({"search": "LCC"}),
                                },
                            }
                        ],
                    }
                }
            ]
        }

        mock_res2 = MagicMock()
        mock_res2.status_code = 200
        # Model returns partial text without calling simulate_assessment
        mock_res2.json.return_value = {
            "choices": [{"message": {"role": "assistant", "content": "Found LCC in the catalog."}}]
        }

        with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
            mock_post.side_effect = [mock_res1, mock_res2]

            user_query = (
                "Design a thermophilic PET degradation experiment: Polymer: PET, Temperature: 70°C, pH: 8.0. "
                "Prioritize LCC or an available variant. Retrieve literature, run scientific assessment, and generate a proposal."
            )
            req = AIChatRequest(messages=[AIChatMessage(role="user", content=user_query)])
            res = asyncio.run(ai_service.chat(req))

            # 1. Verification of orchestrated simulate_assessment
            assert any(et["tool"] == "simulate_assessment" for et in res.executed_tools)

            # 2. Verification of structured proposal
            assert res.proposed_experiment is not None
            assert any("comp_pet" in c.component_id for c in res.proposed_experiment.config.selected_components)
            assert any("comp_lcc_iccg" in c.component_id for c in res.proposed_experiment.config.selected_components)
            assert res.proposed_experiment.config.environment.temperature_celsius == 70.0
            assert res.proposed_experiment.config.environment.ph == 8.0

            # 3. Verification of all 7 structured sections in reply
            assert "### 1. Selected Components" in res.reply
            assert "### 2. Scientific Justification" in res.reply
            assert "### 3. Proposed Experiment" in res.reply
            assert "### 4. Actual Assessment" in res.reply
            assert "### 5. Expected Biochemical Pathway" in res.reply
            assert "### 6. Scientific Evidence" in res.reply
            assert "### 7. Limitations" in res.reply

            # 4. Verification of clean clickable DOI link
            assert "https://doi.org/" in res.reply
    finally:
        credential_manager._cache = orig_cache


def test_regression_a_pet_ispetase():
    """Test A (PET + IsPETase): PET remains selected, PET-related intermediates (MHET, TPA) are used, PET literature is relevant (Yoshida 2016), experiment ID begins with PET-."""
    import asyncio
    from unittest.mock import AsyncMock, patch, MagicMock
    from app.services.ai_service import ai_service
    from app.services.credential_manager import credential_manager
    from app.models.ai_models import AIChatRequest, AIChatMessage

    orig_cache = dict(credential_manager._cache)
    credential_manager._cache["openai"] = {
        "api_key": "sk-testkey12345",
        "base_url": "https://api.openai.com/v1",
        "model": "gpt-4o-mini",
    }

    try:
        mock_res1 = MagicMock()
        mock_res1.status_code = 200
        mock_res1.json.return_value = {
            "choices": [{"message": {"role": "assistant", "content": "Analyzing PET degradation with IsPETase."}}]
        }

        with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
            mock_post.return_value = mock_res1

            user_query = (
                "Help me understand the PET degradation process using IsPETase. "
                "Explain the enzyme's role, the expected reaction products, and the factors that influence its activity. "
                "Use the available scientific information in PolyPhage AI and distinguish established scientific information from computational assessments."
            )
            req = AIChatRequest(messages=[AIChatMessage(role="user", content=user_query)])
            res = asyncio.run(ai_service.chat(req))

            assert res.proposed_experiment is not None
            # Substrate is PET
            substrate = next(c for c in res.proposed_experiment.config.selected_components if c.role == ComponentRole.SUBSTRATE)
            assert "pet" in substrate.component_id.lower()
            assert "pla" not in substrate.component_id.lower()

            # Catalyst is IsPETase
            catalyst = next(c for c in res.proposed_experiment.config.selected_components if c.role == ComponentRole.CATALYST)
            assert "ispetase" in catalyst.component_id.lower()

            # Experiment ID starts with PET-
            assert res.proposed_experiment.config.id.startswith("PET-"), f"Expected PET- prefix, got {res.proposed_experiment.config.id}"

            # Intermediates and expected outcomes contain PET products (MHET, TPA)
            outcomes_str = " ".join(res.proposed_experiment.expected_outcomes)
            assert "MHET" in outcomes_str or "TPA" in outcomes_str or "terephthalic" in outcomes_str.lower()

            # Literature references: both Yoshida 2016 and Austin 2018 must be present
            assert "Yoshida" in res.reply or "2016" in res.reply or "aad6359" in res.reply
            assert "Austin" in res.reply and "1718804115" in res.reply

            # Crystallographic resolution verification (PDB 6EQE, 0.92 Å)
            assert "0.92 Å" in res.reply and "6EQE" in res.reply

            # Thermal terminology check (Enzyme Thermal Stability, not Enzyme Thermal Constancy)
            assert "Enzyme Thermal Stability" in res.reply
            assert "Enzyme Thermal Constancy" not in res.reply

            # Score breakdown contribution explanation
            assert "Score Aggregation & Contribution" in res.reply or "Component Heuristic Contributions" in res.reply
            assert "Raw Component Mean" in res.reply

            # Operating regime is mesophilic / ambient (30°C), NOT thermophilic
            assert "mesophilic" in res.reply.lower() or "30" in res.reply
            assert "thermophilic" not in res.reply.lower().split("### 1. selected components")[1].split("### 3. proposed experiment")[0]

            # Disclaimer distinguishing computational assessment from physical experimental measurements
            assert "computational" in res.reply.lower() or "heuristic" in res.reply.lower()
    finally:
        credential_manager._cache = orig_cache


def test_regression_b_pla_ispetase_incompatibility():
    """Test B (PLA + IsPETase): Does not claim validated PLA degradation; no PET products (MHET/TPA/EG) generated; Compatibility Index capped at 25 with status incompatible; Kawai 2019 evidence limitation communicated; experiment ID begins with PLA-."""
    cfg = ExperimentConfig(
        name="PLA + IsPETase Incompatibility Test",
        selected_components=[
            SelectedComponent(component_id="comp_pla_film", role=ComponentRole.SUBSTRATE),
            SelectedComponent(component_id="comp_ispetase", role=ComponentRole.CATALYST),
            SelectedComponent(component_id="comp_buffer_phosphate", role=ComponentRole.BUFFER, concentration_value=50.0, concentration_unit="mM"),
        ],
        environment=EnvironmentConditions(temperature_celsius=30.0, ph=7.0),
    )
    result = scientific_engine.assess_experiment(cfg)

    # Status must be incompatible and score <= 25
    assert result.overall_status == "incompatible", f"Expected incompatible, got {result.overall_status}"
    assert result.overall_score <= 25, f"Expected score <= 25, got {result.overall_score}"
    assert result.score_details is not None
    assert result.score_details.applied_cap is not None
    assert result.score_details.applied_cap <= 25

    # Interaction warning must cite Kawai 2019 / incompatible pairing
    assert any("incompatible" in inter.description.lower() or "kawai" in inter.description.lower() for inter in result.interactions)

    # Generated experiment ID must start with PLA-
    exp_id = scientific_engine._resolve_or_generate_experiment_id(cfg)
    assert exp_id.startswith("PLA-"), f"Expected PLA- prefix, got {exp_id}"

    # No PET-specific products (MHET, TPA, EG) in potential products
    for p in result.potential_products:
        assert "MHET" not in p.name
        assert "Terephthalic" not in p.name
        assert "Ethylene glycol" not in p.name


def test_regression_c_engineered_vs_wild_type_fidelity():
    """Test C (PET + Engineered IsPETase vs. Wild-Type): Engineered variant properties (LCC disulfide D238C/S283C) remain with their respective enzymes and are never transferred to wild-type IsPETase."""
    import asyncio
    from unittest.mock import AsyncMock, patch, MagicMock
    from app.services.ai_service import ai_service
    from app.services.credential_manager import credential_manager
    from app.models.ai_models import AIChatRequest, AIChatMessage

    orig_cache = dict(credential_manager._cache)
    credential_manager._cache["openai"] = {
        "api_key": "sk-testkey12345",
        "base_url": "https://api.openai.com/v1",
        "model": "gpt-4o-mini",
    }

    try:
        mock_res = MagicMock()
        mock_res.status_code = 200
        mock_res.json.return_value = {
            "choices": [{"message": {"role": "assistant", "content": "Evaluation completed."}}]
        }

        with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
            mock_post.return_value = mock_res

            # Query for wild-type IsPETase
            req_wt = AIChatRequest(messages=[AIChatMessage(role="user", content="Degrade PET using wild-type IsPETase at 30°C")])
            res_wt = asyncio.run(ai_service.chat(req_wt))

            # Must NOT claim D238C/S283C mutations for wild-type IsPETase
            assert "D238C" not in res_wt.reply
            assert "S283C" not in res_wt.reply
            assert "disulfide bond" not in res_wt.reply.lower()

            # Query for LCC engineered variant
            req_lcc = AIChatRequest(messages=[AIChatMessage(role="user", content="Degrade PET using LCC at 70°C")])
            res_lcc = asyncio.run(ai_service.chat(req_lcc))

            # LCC should mention thermophilic and can mention D238C/S283C mutations
            assert "70" in res_lcc.reply
            assert "thermophilic" in res_lcc.reply.lower()
    finally:
        credential_manager._cache = orig_cache


def test_regression_d_buffer_consistency():
    """Test D (Buffer Consistency): Buffer concentration is identical in proposal config and formatted text (e.g. 50 mM)."""
    import asyncio
    from unittest.mock import AsyncMock, patch, MagicMock
    from app.services.ai_service import ai_service
    from app.services.credential_manager import credential_manager
    from app.models.ai_models import AIChatRequest, AIChatMessage

    orig_cache = dict(credential_manager._cache)
    credential_manager._cache["openai"] = {
        "api_key": "sk-testkey12345",
        "base_url": "https://api.openai.com/v1",
        "model": "gpt-4o-mini",
    }

    try:
        mock_res = MagicMock()
        mock_res.status_code = 200
        mock_res.json.return_value = {
            "choices": [{"message": {"role": "assistant", "content": "Done."}}]
        }

        with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
            mock_post.return_value = mock_res

            req = AIChatRequest(messages=[AIChatMessage(role="user", content="PET degradation with IsPETase")])
            res = asyncio.run(ai_service.chat(req))

            assert res.proposed_experiment is not None
            buffer_comp = next((c for c in res.proposed_experiment.config.selected_components if c.role == ComponentRole.BUFFER), None)
            assert buffer_comp is not None
            expected_conc_str = f"{int(buffer_comp.concentration_value)} {buffer_comp.concentration_unit}"

            # The reply text must contain the exact buffer concentration string (e.g. "50 mM")
            assert expected_conc_str in res.reply
            # Ensure it does NOT contradict itself with 100 mM
            if expected_conc_str != "100 mM":
                assert "100 mM" not in res.reply
    finally:
        credential_manager._cache = orig_cache


def test_regression_e_scoring_and_status_consistency():
    """Test E (Scoring & Status Consistency): Verify score and status alignment (no 91/100 labeled suboptimal; incompatible pairings capped at 25)."""
    # Viable experiment
    cfg_viable = ExperimentConfig(
        name="Viable PET Run",
        selected_components=[
            SelectedComponent(component_id="comp_pet", role=ComponentRole.SUBSTRATE),
            SelectedComponent(component_id="comp_ispetase", role=ComponentRole.CATALYST),
            SelectedComponent(component_id="comp_buffer_phosphate", role=ComponentRole.BUFFER, concentration_value=50.0, concentration_unit="mM"),
        ],
        environment=EnvironmentConditions(temperature_celsius=30.0, ph=7.0),
    )
    res_viable = scientific_engine.assess_experiment(cfg_viable)
    assert res_viable.overall_status == "viable"
    assert res_viable.overall_score >= 80

    # Incompatible experiment
    cfg_incompatible = ExperimentConfig(
        name="Incompatible PLA Run",
        selected_components=[
            SelectedComponent(component_id="comp_pla_film", role=ComponentRole.SUBSTRATE),
            SelectedComponent(component_id="comp_ispetase", role=ComponentRole.CATALYST),
            SelectedComponent(component_id="comp_buffer_phosphate", role=ComponentRole.BUFFER, concentration_value=50.0, concentration_unit="mM"),
        ],
        environment=EnvironmentConditions(temperature_celsius=30.0, ph=7.0),
    )
    res_incomp = scientific_engine.assess_experiment(cfg_incompatible)
    assert res_incomp.overall_status == "incompatible"
    assert res_incomp.overall_score <= 25

    # Check that score details align
    assert res_viable.score_details.applied_cap is None  # no cap on viable run
    assert res_incomp.score_details.applied_cap is not None
    assert res_incomp.score_details.applied_cap <= 25


def test_regression_f_context_preservation_and_prompt_precedence():
    """Test F (Context Preservation & Prompt Precedence): Verify that when context_experiment has PLA, but user prompt explicitly asks for PET, PET is selected in the proposal and simulation."""
    import asyncio
    from unittest.mock import AsyncMock, patch, MagicMock
    from app.services.ai_service import ai_service
    from app.services.credential_manager import credential_manager
    from app.models.ai_models import AIChatRequest, AIChatMessage

    orig_cache = dict(credential_manager._cache)
    credential_manager._cache["openai"] = {
        "api_key": "sk-testkey12345",
        "base_url": "https://api.openai.com/v1",
        "model": "gpt-4o-mini",
    }

    try:
        mock_res = MagicMock()
        mock_res.status_code = 200
        mock_res.json.return_value = {
            "choices": [{"message": {"role": "assistant", "content": "Done."}}]
        }

        with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
            mock_post.return_value = mock_res

            # Previous context experiment was PLA
            pla_context = ExperimentConfig(
                id="PLA-20261109-001",
                name="Previous PLA Experiment",
                selected_components=[
                    SelectedComponent(component_id="comp_pla_film", role=ComponentRole.SUBSTRATE),
                    SelectedComponent(component_id="comp_ispetase", role=ComponentRole.CATALYST),
                ],
                environment=EnvironmentConditions(temperature_celsius=30.0, ph=7.0),
            )

            user_query = (
                "Help me understand the PET degradation process using IsPETase. "
                "Explain the enzyme's role, the expected reaction products, and the factors that influence its activity. "
                "Use the available scientific information in PolyPhage AI and distinguish established scientific information from computational assessments."
            )

            req = AIChatRequest(
                messages=[AIChatMessage(role="user", content=user_query)],
                context_experiment=pla_context,
            )
            res = asyncio.run(ai_service.chat(req))

            assert res.proposed_experiment is not None
            substrate = next(c for c in res.proposed_experiment.config.selected_components if c.role == ComponentRole.SUBSTRATE)

            # Strict precedence: Must be PET, NOT PLA
            assert "pet" in substrate.component_id.lower()
            assert "pla" not in substrate.component_id.lower()
            assert res.proposed_experiment.config.id.startswith("PET-")
    finally:
        credential_manager._cache = orig_cache


def test_governance_test_a_environmental_claims_obey_governance():
    """Test A: Environmental claims in AI interpretation obey governance (no High Benefit, no landfill diversion claims, LCA disclaimer present)."""
    import asyncio
    from unittest.mock import patch, MagicMock
    from app.services.ai_service import ai_service
    from app.services.credential_manager import credential_manager
    from app.models.ai_models import AIInterpretationRequest
    from app.models.experiment import ExperimentConfig, EnvironmentConditions
    from app.models.components import SelectedComponent, ComponentRole

    orig_cache = dict(credential_manager._cache)
    credential_manager._cache["openai"] = {"api_key": "sk-test", "base_url": "https://api.openai.com/v1", "model": "gpt-4o-mini"}

    try:
        mock_raw = {
            "executive_overview": "Analysis of PET depolymerization.",
            "biochemical_mechanism_analysis": "Hydrolytic cleavage.",
            "environmental_and_climate_perspective": "High-benefit circular-economy pathway. Demonstrated diversion of PET waste from incineration or landfill. Avoided CO2 emissions through closed-loop repolymerization. Reduced secondary marine pollution. Modest heating and low agitation reducing electricity demand.",
            "uncertainties_and_gap_analysis": "Substrate crystallinity.",
            "recommended_follow_up_experiments": ["Sweep pH."],
            "proposed_experiment": None,
        }
        mock_resp = MagicMock(status_code=200)
        mock_resp.json.return_value = {"choices": [{"message": {"content": json.dumps(mock_raw)}}]}

        with patch("httpx.AsyncClient.post", return_value=mock_resp):
            cfg = ExperimentConfig(
                name="PET Run",
                selected_components=[
                    SelectedComponent(component_id="comp_pet", role=ComponentRole.SUBSTRATE),
                    SelectedComponent(component_id="comp_ispetase", role=ComponentRole.CATALYST),
                ],
                environment=EnvironmentConditions(),
            )
            assessment = scientific_engine.assess_experiment(cfg)
            req = AIInterpretationRequest(experiment=cfg, assessment=assessment)
            res = asyncio.run(ai_service.interpret_assessment(req))

            env_text = res.environmental_and_climate_perspective
            assert "High-benefit" not in env_text
            assert "High Benefit" not in env_text
            assert "Demonstrated diversion" not in env_text
            assert "Avoided CO2 emissions through closed-loop repolymerization" not in env_text
            assert "Life Cycle Assessment (LCA) Boundary" in env_text
            assert "Governance Classifications" in env_text
    finally:
        credential_manager._cache = orig_cache


def test_governance_test_b_pet_ispetase_mhet_accumulation_and_downstream_requirement():
    """Test B: PET + IsPETase without MHETase notes MHET accumulation and downstream MHETase requirement; no complete monomer recovery or closed-loop claims."""
    import asyncio
    from unittest.mock import patch, MagicMock
    from app.services.ai_service import ai_service
    from app.services.credential_manager import credential_manager
    from app.models.ai_models import AIInterpretationRequest
    from app.models.experiment import ExperimentConfig, EnvironmentConditions
    from app.models.components import SelectedComponent, ComponentRole

    orig_cache = dict(credential_manager._cache)
    credential_manager._cache["openai"] = {"api_key": "sk-test", "base_url": "https://api.openai.com/v1", "model": "gpt-4o-mini"}

    try:
        mock_raw = {
            "executive_overview": "Mesophilic PET degradation.",
            "biochemical_mechanism_analysis": "Triad activity.",
            "environmental_and_climate_perspective": "Complete monomer recovery achieved with closed-loop bottle-to-bottle repolymerization.",
            "uncertainties_and_gap_analysis": "Kinetics.",
            "recommended_follow_up_experiments": ["Screen enzyme loading."],
            "proposed_experiment": None,
        }
        mock_resp = MagicMock(status_code=200)
        mock_resp.json.return_value = {"choices": [{"message": {"content": json.dumps(mock_raw)}}]}

        with patch("httpx.AsyncClient.post", return_value=mock_resp):
            cfg = ExperimentConfig(
                name="PET IsPETase Single-Enzyme",
                selected_components=[
                    SelectedComponent(component_id="comp_pet", role=ComponentRole.SUBSTRATE),
                    SelectedComponent(component_id="comp_ispetase", role=ComponentRole.CATALYST),
                ],
                environment=EnvironmentConditions(),
            )
            assessment = scientific_engine.assess_experiment(cfg)
            req = AIInterpretationRequest(experiment=cfg, assessment=assessment)
            res = asyncio.run(ai_service.interpret_assessment(req))

            env_text = res.environmental_and_climate_perspective
            assert "complete monomer recovery" not in env_text.lower()
            assert "closed-loop bottle-to-bottle repolymerization" not in env_text.lower()
            assert "mhet" in env_text.lower()
            assert "downstream mhetase" in env_text.lower() or "not established" in env_text.lower()
    finally:
        credential_manager._cache = orig_cache


def test_governance_test_c_dual_enzyme_no_complete_conversion_claim():
    """Test C: PET + IsPETase + MHETase follow-up proposal does not claim complete conversion or verified circular recovery."""
    import asyncio
    from unittest.mock import patch, MagicMock
    from app.services.ai_service import ai_service
    from app.services.credential_manager import credential_manager
    from app.models.ai_models import AIInterpretationRequest
    from app.models.experiment import ExperimentConfig, EnvironmentConditions
    from app.models.components import SelectedComponent, ComponentRole

    orig_cache = dict(credential_manager._cache)
    credential_manager._cache["openai"] = {"api_key": "sk-test", "base_url": "https://api.openai.com/v1", "model": "gpt-4o-mini"}

    try:
        mock_raw = {
            "executive_overview": "Dual enzyme system.",
            "biochemical_mechanism_analysis": "Cascade cleavage.",
            "environmental_and_climate_perspective": "Potential Benefit circularity.",
            "uncertainties_and_gap_analysis": "Empirical rates.",
            "recommended_follow_up_experiments": ["Test ratios."],
            "proposed_experiment": {
                "config": {
                    "name": "Coupled Cascade",
                    "selected_components": [
                        {"component_id": "comp_pet", "role": "substrate", "concentration": "10 mg/mL"},
                        {"component_id": "comp_ispetase", "role": "catalyst", "concentration": "50 nM"},
                        {"component_id": "comp_mhetase", "role": "catalyst", "concentration": "100 nM"},
                        {"component_id": "comp_buffer_phosphate", "role": "buffer", "concentration": "50 mM"},
                    ],
                    "environment": {"temperature_celsius": 30.0, "ph": 7.0},
                },
                "scientific_rationale": "Achieves complete conversion of PET into pure monomers.",
                "expected_outcomes": ["Complete conversion of PET", "Complete monomer recovery into TPA and EG"],
                "assumptions_and_boundaries": [],
                "supporting_evidence_ids": ["ref_yoshida_2016"],
            },
        }
        mock_resp = MagicMock(status_code=200)
        mock_resp.json.return_value = {"choices": [{"message": {"content": json.dumps(mock_raw)}}]}

        with patch("httpx.AsyncClient.post", return_value=mock_resp):
            cfg = ExperimentConfig(
                name="Base Run",
                selected_components=[SelectedComponent(component_id="comp_pet", role=ComponentRole.SUBSTRATE)],
                environment=EnvironmentConditions(),
            )
            assessment = scientific_engine.assess_experiment(cfg)
            req = AIInterpretationRequest(experiment=cfg, assessment=assessment)
            res = asyncio.run(ai_service.interpret_assessment(req))

            assert res.proposed_experiment is not None
            for out in res.proposed_experiment.expected_outcomes:
                assert "Complete conversion of PET" not in out
                assert "Complete monomer recovery into TPA" not in out
            assert "complete conversion" not in res.proposed_experiment.scientific_rationale.lower()
    finally:
        credential_manager._cache = orig_cache


def test_governance_test_d_buffer_vs_active_ph_stat_proposal_title():
    """Test D: Buffer stabilization vs active pH-stat control (proposal title aligned to Buffer-Mediated pH Stabilization if no titrant)."""
    import asyncio
    from unittest.mock import patch, MagicMock
    from app.services.ai_service import ai_service
    from app.services.credential_manager import credential_manager
    from app.models.ai_models import AIInterpretationRequest
    from app.models.experiment import ExperimentConfig, EnvironmentConditions
    from app.models.components import SelectedComponent, ComponentRole

    orig_cache = dict(credential_manager._cache)
    credential_manager._cache["openai"] = {"api_key": "sk-test", "base_url": "https://api.openai.com/v1", "model": "gpt-4o-mini"}

    try:
        # Case 1: Passive buffer without NaOH titrant -> title renamed to Buffer-Mediated pH Stabilization
        mock_raw = {
            "executive_overview": "Overview.",
            "biochemical_mechanism_analysis": "Mechanism.",
            "environmental_and_climate_perspective": "Governance perspective.",
            "uncertainties_and_gap_analysis": "Gaps.",
            "recommended_follow_up_experiments": ["Rec."],
            "proposed_experiment": {
                "config": {
                    "name": "Coupled PETase-MHETase Depolymerisation with pH-Control at 30°C",
                    "selected_components": [
                        {"component_id": "comp_pet", "role": "substrate", "concentration": "10 mg/mL"},
                        {"component_id": "comp_ispetase", "role": "catalyst", "concentration": "50 nM"},
                        {"component_id": "comp_buffer_phosphate", "role": "buffer", "concentration": "50 mM"},
                    ],
                    "environment": {"temperature_celsius": 30.0, "ph": 7.0},
                },
                "scientific_rationale": "Active pH control prevents acidification.",
                "expected_outcomes": ["Maintains neutral pH via active pH control."],
                "assumptions_and_boundaries": [],
                "supporting_evidence_ids": ["ref_yoshida_2016"],
            },
        }
        mock_resp = MagicMock(status_code=200)
        mock_resp.json.return_value = {"choices": [{"message": {"content": json.dumps(mock_raw)}}]}

        with patch("httpx.AsyncClient.post", return_value=mock_resp):
            cfg = ExperimentConfig(
                name="Base Run",
                selected_components=[SelectedComponent(component_id="comp_pet", role=ComponentRole.SUBSTRATE)],
                environment=EnvironmentConditions(),
            )
            assessment = scientific_engine.assess_experiment(cfg)
            req = AIInterpretationRequest(experiment=cfg, assessment=assessment)
            res = asyncio.run(ai_service.interpret_assessment(req))

            assert res.proposed_experiment is not None
            # Must rename pH-Control to Buffer-Mediated pH Stabilization
            assert "Buffer-Mediated pH Stabilization" in res.proposed_experiment.config.name
            assert "pH-Control" not in res.proposed_experiment.config.name
            assert "active pH control" not in res.proposed_experiment.scientific_rationale.lower()

        # Case 2: Active base titrant (comp_naoh_titrant) present -> active pH-control title permitted
        mock_raw_active = dict(mock_raw)
        mock_raw_active["proposed_experiment"]["config"]["selected_components"].append(
            {"component_id": "comp_naoh_titrant", "role": "buffer", "concentration": "0.1 M"}
        )
        mock_resp.json.return_value = {"choices": [{"message": {"content": json.dumps(mock_raw_active)}}]}

        with patch("httpx.AsyncClient.post", return_value=mock_resp):
            res_active = asyncio.run(ai_service.interpret_assessment(req))
            assert res_active.proposed_experiment is not None
            assert "pH-Control" in res_active.proposed_experiment.config.name
    finally:
        credential_manager._cache = orig_cache


def test_governance_test_e_process_energy_claims_neutrality():
    """Test E: Unsupported energy-efficiency claims (e.g. 30°C/150 RPM reducing electricity demand) are removed or neutralized."""
    import asyncio
    from unittest.mock import patch, MagicMock
    from app.services.ai_service import ai_service
    from app.services.credential_manager import credential_manager
    from app.models.ai_models import AIInterpretationRequest
    from app.models.experiment import ExperimentConfig, EnvironmentConditions
    from app.models.components import SelectedComponent, ComponentRole

    orig_cache = dict(credential_manager._cache)
    credential_manager._cache["openai"] = {"api_key": "sk-test", "base_url": "https://api.openai.com/v1", "model": "gpt-4o-mini"}

    try:
        mock_raw = {
            "executive_overview": "Operating at 30°C is an energy-efficient process reducing electricity demand.",
            "biochemical_mechanism_analysis": "Energy-efficient ester cleavage.",
            "environmental_and_climate_perspective": "Modest heating and low agitation reducing electricity demand.",
            "uncertainties_and_gap_analysis": "Energy-efficient conditions need evaluation.",
            "recommended_follow_up_experiments": ["Sweep parameters."],
            "proposed_experiment": None,
        }
        mock_resp = MagicMock(status_code=200)
        mock_resp.json.return_value = {"choices": [{"message": {"content": json.dumps(mock_raw)}}]}

        with patch("httpx.AsyncClient.post", return_value=mock_resp):
            cfg = ExperimentConfig(
                name="Base Run",
                selected_components=[SelectedComponent(component_id="comp_pet", role=ComponentRole.SUBSTRATE)],
                environment=EnvironmentConditions(temperature_celsius=30.0),
            )
            assessment = scientific_engine.assess_experiment(cfg)
            req = AIInterpretationRequest(experiment=cfg, assessment=assessment)
            res = asyncio.run(ai_service.interpret_assessment(req))

            assert "reducing electricity demand" not in res.environmental_and_climate_perspective.lower()
            assert "reducing electricity demand" not in res.executive_overview.lower()
            assert "energy-efficient process" not in res.executive_overview.lower()
    finally:
        credential_manager._cache = orig_cache


def test_governance_test_f_mhetase_concentration_tagged_exploratory():
    """Test F: Unjustified MHETase concentration tagged as exploratory starting value rather than established optimum."""
    import asyncio
    from unittest.mock import patch, MagicMock
    from app.services.ai_service import ai_service
    from app.services.credential_manager import credential_manager
    from app.models.ai_models import AIInterpretationRequest
    from app.models.experiment import ExperimentConfig, EnvironmentConditions
    from app.models.components import SelectedComponent, ComponentRole

    orig_cache = dict(credential_manager._cache)
    credential_manager._cache["openai"] = {"api_key": "sk-test", "base_url": "https://api.openai.com/v1", "model": "gpt-4o-mini"}

    try:
        mock_raw = {
            "executive_overview": "Overview.",
            "biochemical_mechanism_analysis": "Mechanism.",
            "environmental_and_climate_perspective": "Perspective.",
            "uncertainties_and_gap_analysis": "Gaps.",
            "recommended_follow_up_experiments": [
                "Add 100 nM MHETase as the optimal concentration.",
                "Increase agitation to 300 RPM which directly increases polymer surface area.",
            ],
            "proposed_experiment": {
                "config": {
                    "name": "Exploratory MHETase Sweep",
                    "selected_components": [
                        {"component_id": "comp_pet", "role": "substrate", "concentration": "10 mg/mL"},
                        {"component_id": "comp_ispetase", "role": "catalyst", "concentration": "50 nM"},
                        {"component_id": "comp_mhetase", "role": "catalyst", "concentration": "100 nM"},
                    ],
                    "environment": {"temperature_celsius": 30.0, "ph": 7.0},
                },
                "scientific_rationale": "Rationale.",
                "expected_outcomes": ["Outcomes."],
                "assumptions_and_boundaries": [],
                "supporting_evidence_ids": ["ref_yoshida_2016"],
            },
        }
        mock_resp = MagicMock(status_code=200)
        mock_resp.json.return_value = {"choices": [{"message": {"content": json.dumps(mock_raw)}}]}

        with patch("httpx.AsyncClient.post", return_value=mock_resp):
            cfg = ExperimentConfig(
                name="Base Run",
                selected_components=[SelectedComponent(component_id="comp_pet", role=ComponentRole.SUBSTRATE)],
                environment=EnvironmentConditions(),
            )
            assessment = scientific_engine.assess_experiment(cfg)
            req = AIInterpretationRequest(experiment=cfg, assessment=assessment)
            res = asyncio.run(ai_service.interpret_assessment(req))

            rec0 = res.recommended_follow_up_experiments[0]
            assert "optimal concentration" not in rec0
            assert "exploratory starting concentration" in rec0

            rec1 = res.recommended_follow_up_experiments[1]
            assert "directly increases polymer surface area" not in rec1
            assert "mass transfer" in rec1.lower()

            assert res.proposed_experiment is not None
            mhet_comp = next(c for c in res.proposed_experiment.config.selected_components if c.component_id == "comp_mhetase")
            assert (mhet_comp.notes and "exploratory" in mhet_comp.notes.lower()) or any("exploratory" in a.lower() for a in res.proposed_experiment.assumptions_and_boundaries)
    finally:
        credential_manager._cache = orig_cache


def test_governance_test_g_oxygen_dependency_claims_avoided():
    """Test G: Unsupported aerobic condition assumptions avoided (isolated hydrolytic cleavage does not require molecular oxygen)."""
    import asyncio
    from unittest.mock import patch, MagicMock
    from app.services.ai_service import ai_service
    from app.services.credential_manager import credential_manager
    from app.models.ai_models import AIInterpretationRequest
    from app.models.experiment import ExperimentConfig, EnvironmentConditions
    from app.models.components import SelectedComponent, ComponentRole

    orig_cache = dict(credential_manager._cache)
    credential_manager._cache["openai"] = {"api_key": "sk-test", "base_url": "https://api.openai.com/v1", "model": "gpt-4o-mini"}

    try:
        mock_raw = {
            "executive_overview": "This enzyme requires oxygen for ester cleavage.",
            "biochemical_mechanism_analysis": "The catalytic cycle requires molecular oxygen for hydrolysis.",
            "environmental_and_climate_perspective": "Perspective.",
            "uncertainties_and_gap_analysis": "Gaps.",
            "recommended_follow_up_experiments": ["Sweep parameters."],
            "proposed_experiment": None,
        }
        mock_resp = MagicMock(status_code=200)
        mock_resp.json.return_value = {"choices": [{"message": {"content": json.dumps(mock_raw)}}]}

        with patch("httpx.AsyncClient.post", return_value=mock_resp):
            cfg = ExperimentConfig(
                name="Base Run",
                selected_components=[SelectedComponent(component_id="comp_pet", role=ComponentRole.SUBSTRATE)],
                environment=EnvironmentConditions(),
            )
            assessment = scientific_engine.assess_experiment(cfg)
            req = AIInterpretationRequest(experiment=cfg, assessment=assessment)
            res = asyncio.run(ai_service.interpret_assessment(req))

            assert "requires oxygen for ester cleavage" not in res.executive_overview
            assert "does not biochemically require molecular oxygen" in res.executive_overview
            assert "requires molecular oxygen" not in res.biochemical_mechanism_analysis
    finally:
        credential_manager._cache = orig_cache


def test_governance_test_h_engineered_variant_identity_matches_catalog():
    """Test H: Engineered enzyme variant identity matches catalog (LCC -> comp_lcc_iccg, FAST-PETase -> comp_fast_petase)."""
    import asyncio
    from unittest.mock import patch, MagicMock
    from app.services.ai_service import ai_service
    from app.services.credential_manager import credential_manager
    from app.models.ai_models import AIInterpretationRequest
    from app.models.experiment import ExperimentConfig, EnvironmentConditions
    from app.models.components import SelectedComponent, ComponentRole

    orig_cache = dict(credential_manager._cache)
    credential_manager._cache["openai"] = {"api_key": "sk-test", "base_url": "https://api.openai.com/v1", "model": "gpt-4o-mini"}

    try:
        mock_raw = {
            "executive_overview": "Overview.",
            "biochemical_mechanism_analysis": "Mechanism.",
            "environmental_and_climate_perspective": "Perspective.",
            "uncertainties_and_gap_analysis": "Gaps.",
            "recommended_follow_up_experiments": [
                "Screen thermophilic LCC at 70°C.",
                "Test FAST-PETase consensus variant.",
            ],
            "proposed_experiment": None,
        }
        mock_resp = MagicMock(status_code=200)
        mock_resp.json.return_value = {"choices": [{"message": {"content": json.dumps(mock_raw)}}]}

        with patch("httpx.AsyncClient.post", return_value=mock_resp):
            cfg = ExperimentConfig(
                name="Base Run",
                selected_components=[SelectedComponent(component_id="comp_pet", role=ComponentRole.SUBSTRATE)],
                environment=EnvironmentConditions(),
            )
            assessment = scientific_engine.assess_experiment(cfg)
            req = AIInterpretationRequest(experiment=cfg, assessment=assessment)
            res = asyncio.run(ai_service.interpret_assessment(req))

            assert "comp_lcc_iccg" in res.recommended_follow_up_experiments[0]
            assert "comp_fast_petase" in res.recommended_follow_up_experiments[1]
    finally:
        credential_manager._cache = orig_cache


def test_governance_test_i_scientific_citation_traceability():
    """Test I: Scientific citation traceability in proposal (non-existent IDs removed, verified catalog evidence preserved)."""
    import asyncio
    from unittest.mock import patch, MagicMock
    from app.services.ai_service import ai_service
    from app.services.credential_manager import credential_manager
    from app.models.ai_models import AIInterpretationRequest
    from app.models.experiment import ExperimentConfig, EnvironmentConditions
    from app.models.components import SelectedComponent, ComponentRole

    orig_cache = dict(credential_manager._cache)
    credential_manager._cache["openai"] = {"api_key": "sk-test", "base_url": "https://api.openai.com/v1", "model": "gpt-4o-mini"}

    try:
        mock_raw = {
            "executive_overview": "Overview.",
            "biochemical_mechanism_analysis": "Mechanism.",
            "environmental_and_climate_perspective": "Perspective.",
            "uncertainties_and_gap_analysis": "Gaps.",
            "recommended_follow_up_experiments": ["Sweep parameters."],
            "proposed_experiment": {
                "config": {
                    "name": "Citation Test Run",
                    "selected_components": [
                        {"component_id": "comp_pet", "role": "substrate", "concentration": "10 mg/mL"},
                        {"component_id": "comp_ispetase", "role": "catalyst", "concentration": "50 nM"},
                    ],
                    "environment": {"temperature_celsius": 30.0, "ph": 7.0},
                },
                "scientific_rationale": "Rationale.",
                "expected_outcomes": ["Outcomes."],
                "assumptions_and_boundaries": [],
                "supporting_evidence_ids": ["ref_yoshida_2016", "ref_fake_nonexistent_2099"],
            },
        }
        mock_resp = MagicMock(status_code=200)
        mock_resp.json.return_value = {"choices": [{"message": {"content": json.dumps(mock_raw)}}]}

        with patch("httpx.AsyncClient.post", return_value=mock_resp):
            cfg = ExperimentConfig(
                name="Base Run",
                selected_components=[SelectedComponent(component_id="comp_pet", role=ComponentRole.SUBSTRATE)],
                environment=EnvironmentConditions(),
            )
            assessment = scientific_engine.assess_experiment(cfg)
            req = AIInterpretationRequest(experiment=cfg, assessment=assessment)
            res = asyncio.run(ai_service.interpret_assessment(req))

            assert res.proposed_experiment is not None
            assert "ref_yoshida_2016" in res.proposed_experiment.supporting_evidence_ids
            assert "ref_fake_nonexistent_2099" not in res.proposed_experiment.supporting_evidence_ids
    finally:
        credential_manager._cache = orig_cache


def test_governance_test_j_html_entity_decoding():
    """Test J: HTML entity decoding (e.g. &#x49;ncrease -> Increase, &#39; -> ')."""
    import asyncio
    from unittest.mock import patch, MagicMock
    from app.services.ai_service import ai_service
    from app.services.credential_manager import credential_manager
    from app.models.ai_models import AIInterpretationRequest
    from app.models.experiment import ExperimentConfig, EnvironmentConditions
    from app.models.components import SelectedComponent, ComponentRole

    orig_cache = dict(credential_manager._cache)
    credential_manager._cache["openai"] = {"api_key": "sk-test", "base_url": "https://api.openai.com/v1", "model": "gpt-4o-mini"}

    try:
        mock_raw = {
            "executive_overview": "&#x49;ncrease buffer concentration to avoid acid&#x20;drift.",
            "biochemical_mechanism_analysis": "Enzyme&#39;s catalytic triad.",
            "environmental_and_climate_perspective": "Circularity&#x20;perspective.",
            "uncertainties_and_gap_analysis": "Gap&#39;s analysis.",
            "recommended_follow_up_experiments": [
                "&#x49;ncrease agitation to 300 RPM.",
                "Add 50&#x20;mM Tris-HCl.",
            ],
            "proposed_experiment": None,
        }
        mock_resp = MagicMock(status_code=200)
        mock_resp.json.return_value = {"choices": [{"message": {"content": json.dumps(mock_raw)}}]}

        with patch("httpx.AsyncClient.post", return_value=mock_resp):
            cfg = ExperimentConfig(
                name="Base Run",
                selected_components=[SelectedComponent(component_id="comp_pet", role=ComponentRole.SUBSTRATE)],
                environment=EnvironmentConditions(),
            )
            assessment = scientific_engine.assess_experiment(cfg)
            req = AIInterpretationRequest(experiment=cfg, assessment=assessment)
            res = asyncio.run(ai_service.interpret_assessment(req))

            assert res.executive_overview.startswith("Increase buffer concentration")
            assert "&#x49;" not in res.executive_overview
            assert "Enzyme's catalytic triad" in res.biochemical_mechanism_analysis
            assert "&#39;" not in res.biochemical_mechanism_analysis
            assert res.recommended_follow_up_experiments[0].startswith("Increase agitation")
            assert "&#x49;" not in res.recommended_follow_up_experiments[0]
            assert "50 mM Tris-HCl" in res.recommended_follow_up_experiments[1]
    finally:
        credential_manager._cache = orig_cache


def test_governance_test_k_proposal_title_component_consistency():
    """Test K: Proposal title/component consistency across substrate, enzyme, buffer, and operational parameters."""
    import asyncio
    from unittest.mock import patch, MagicMock
    from app.services.ai_service import ai_service
    from app.services.credential_manager import credential_manager
    from app.models.ai_models import AIInterpretationRequest
    from app.models.experiment import ExperimentConfig, EnvironmentConditions
    from app.models.components import SelectedComponent, ComponentRole

    orig_cache = dict(credential_manager._cache)
    credential_manager._cache["openai"] = {"api_key": "sk-test", "base_url": "https://api.openai.com/v1", "model": "gpt-4o-mini"}

    try:
        mock_raw = {
            "executive_overview": "Overview.",
            "biochemical_mechanism_analysis": "Mechanism.",
            "environmental_and_climate_perspective": "Perspective.",
            "uncertainties_and_gap_analysis": "Gaps.",
            "recommended_follow_up_experiments": ["Sweep parameters."],
            "proposed_experiment": {
                "config": {
                    "name": "Coupled PETase-MHETase Depolymerisation with pH-Control at 30°C",
                    "selected_components": [
                        {"component_id": "comp_pet", "role": "substrate", "concentration": "10 mg/mL"},
                        {"component_id": "comp_ispetase", "role": "catalyst", "concentration": "50 nM"},
                        {"component_id": "comp_mhetase", "role": "catalyst", "concentration": "100 nM"},
                        {"component_id": "comp_buffer_phosphate", "role": "buffer", "concentration": "50 mM"},
                    ],
                    "environment": {
                        "temperature_celsius": 30.0,
                        "ph": 7.0,
                        "oxygen": "Aerobic",
                        "agitation_rpm": 300,
                    },
                },
                "scientific_rationale": "Rationale.",
                "expected_outcomes": ["Outcomes."],
                "assumptions_and_boundaries": [],
                "supporting_evidence_ids": ["ref_yoshida_2016", "ref_palm_2019"],
            },
        }
        mock_resp = MagicMock(status_code=200)
        mock_resp.json.return_value = {"choices": [{"message": {"content": json.dumps(mock_raw)}}]}

        with patch("httpx.AsyncClient.post", return_value=mock_resp):
            cfg = ExperimentConfig(
                name="Base Run",
                selected_components=[SelectedComponent(component_id="comp_pet", role=ComponentRole.SUBSTRATE)],
                environment=EnvironmentConditions(),
            )
            assessment = scientific_engine.assess_experiment(cfg)
            req = AIInterpretationRequest(experiment=cfg, assessment=assessment)
            res = asyncio.run(ai_service.interpret_assessment(req))

            assert res.proposed_experiment is not None
            prop = res.proposed_experiment
            assert "Buffer-Mediated pH Stabilization" in prop.config.name
            assert "pH-Control" not in prop.config.name
            assert any(c.component_id == "comp_pet" for c in prop.config.selected_components)
            assert any(c.component_id == "comp_ispetase" for c in prop.config.selected_components)
            assert any(c.component_id == "comp_mhetase" for c in prop.config.selected_components)
            assert any(c.component_id == "comp_buffer_phosphate" for c in prop.config.selected_components)
            assert any("mass transfer" in a.lower() for a in prop.assumptions_and_boundaries)
            assert any("exploratory" in a.lower() for a in prop.assumptions_and_boundaries)
    finally:
        credential_manager._cache = orig_cache


def test_final_quality_a_no_unsupported_aerobic_condition():
    """Quality Fix A: Remove unsupported aerobic claims from isolated enzyme assays."""
    import asyncio
    from unittest.mock import patch, MagicMock
    from app.services.ai_service import ai_service
    from app.services.credential_manager import credential_manager
    from app.models.ai_models import AIInterpretationRequest
    from app.models.experiment import ExperimentConfig, EnvironmentConditions
    from app.models.components import SelectedComponent, ComponentRole

    orig_cache = dict(credential_manager._cache)
    credential_manager._cache["openai"] = {"api_key": "sk-test", "base_url": "https://api.openai.com/v1", "model": "gpt-4o-mini"}

    try:
        mock_raw = {
            "executive_overview": "Operated under standard conditions (30°C, pH 7.0, aerobic, 150 rpm). The assay proceeds hydrolytically.",
            "biochemical_mechanism_analysis": "Wild-type IsPETase operates under aerobic conditions to cleave ester bonds.",
            "environmental_and_climate_perspective": "Theoretical perspective.",
            "uncertainties_and_gap_analysis": "Rate limitations.",
            "recommended_follow_up_experiments": ["Test under 30°C, pH 7.0, aerobic, 200 rpm."],
            "proposed_experiment": None,
        }
        mock_resp = MagicMock(status_code=200)
        mock_resp.json.return_value = {"choices": [{"message": {"content": json.dumps(mock_raw)}}]}

        with patch("httpx.AsyncClient.post", return_value=mock_resp):
            cfg = ExperimentConfig(
                name="Cell-free Hydrolysis",
                selected_components=[
                    SelectedComponent(component_id="comp_pet", role=ComponentRole.SUBSTRATE),
                    SelectedComponent(component_id="comp_ispetase", role=ComponentRole.CATALYST),
                    SelectedComponent(component_id="comp_buffer_phosphate", role=ComponentRole.BUFFER),
                ],
                environment=EnvironmentConditions(temperature_celsius=30.0, ph=7.0),
            )
            assessment = scientific_engine.assess_experiment(cfg)
            req = AIInterpretationRequest(experiment=cfg, assessment=assessment)
            res = asyncio.run(ai_service.interpret_assessment(req))

            assert "aerobic, 150 rpm" not in res.executive_overview.lower()
            assert "30°c, ph 7.0, 150 rpm" in res.executive_overview.lower()
            assert "under aerobic conditions" not in res.biochemical_mechanism_analysis.lower()
            assert "aerobic" not in res.recommended_follow_up_experiments[0].lower()
    finally:
        credential_manager._cache = orig_cache


def test_final_quality_b_no_achieved_waste_diversion():
    """Quality Fix B: Replace definitive waste diversion claims with qualified prospective language."""
    import asyncio
    from unittest.mock import patch, MagicMock
    from app.services.ai_service import ai_service
    from app.services.credential_manager import credential_manager
    from app.models.ai_models import AIInterpretationRequest
    from app.models.experiment import ExperimentConfig, EnvironmentConditions
    from app.models.components import SelectedComponent, ComponentRole

    orig_cache = dict(credential_manager._cache)
    credential_manager._cache["openai"] = {"api_key": "sk-test", "base_url": "https://api.openai.com/v1", "model": "gpt-4o-mini"}

    try:
        mock_raw = {
            "executive_overview": "Depolymerizing PET, thereby diverting material from the waste stream.",
            "biochemical_mechanism_analysis": "Enzymatic cleavage.",
            "environmental_and_climate_perspective": "Demonstrated diverting post-consumer PET from landfill or incineration.",
            "uncertainties_and_gap_analysis": "Process constraints.",
            "recommended_follow_up_experiments": ["Explore scalability."],
            "proposed_experiment": None,
        }
        mock_resp = MagicMock(status_code=200)
        mock_resp.json.return_value = {"choices": [{"message": {"content": json.dumps(mock_raw)}}]}

        with patch("httpx.AsyncClient.post", return_value=mock_resp):
            cfg = ExperimentConfig(
                name="Waste Qualification Run",
                selected_components=[SelectedComponent(component_id="comp_pet", role=ComponentRole.SUBSTRATE)],
                environment=EnvironmentConditions(),
            )
            assessment = scientific_engine.assess_experiment(cfg)
            req = AIInterpretationRequest(experiment=cfg, assessment=assessment)
            res = asyncio.run(ai_service.interpret_assessment(req))

            assert "thereby diverting material from the waste stream" not in res.executive_overview.lower()
            assert "prospective biological recycling pathway" in res.executive_overview.lower()
            assert "demonstrated diverting" not in res.environmental_and_climate_perspective.lower()
    finally:
        credential_manager._cache = orig_cache


def test_final_quality_c_mhet_bhet_not_classified_as_monomers():
    """Quality Fix C: Distinguish soluble aromatic ester intermediates (MHET, BHET) from true monomers (TPA, EG)."""
    import asyncio
    from unittest.mock import patch, MagicMock
    from app.services.ai_service import ai_service
    from app.services.credential_manager import credential_manager
    from app.models.ai_models import AIInterpretationRequest
    from app.models.experiment import ExperimentConfig, EnvironmentConditions
    from app.models.components import SelectedComponent, ComponentRole

    orig_cache = dict(credential_manager._cache)
    credential_manager._cache["openai"] = {"api_key": "sk-test", "base_url": "https://api.openai.com/v1", "model": "gpt-4o-mini"}

    try:
        mock_raw = {
            "executive_overview": "Assay converting a fraction of PET into soluble monomers under mesophilic conditions.",
            "biochemical_mechanism_analysis": "Initial cleavage yields soluble intermediates.",
            "environmental_and_climate_perspective": "Theoretical perspective.",
            "uncertainties_and_gap_analysis": "Accumulation of intermediates.",
            "recommended_follow_up_experiments": ["Addition of MHETase."],
            "proposed_experiment": None,
        }
        mock_resp = MagicMock(status_code=200)
        mock_resp.json.return_value = {"choices": [{"message": {"content": json.dumps(mock_raw)}}]}

        with patch("httpx.AsyncClient.post", return_value=mock_resp):
            cfg = ExperimentConfig(
                name="Product Terminology Run",
                selected_components=[
                    SelectedComponent(component_id="comp_pet", role=ComponentRole.SUBSTRATE),
                    SelectedComponent(component_id="comp_ispetase", role=ComponentRole.CATALYST),
                ],
                environment=EnvironmentConditions(),
            )
            assessment = scientific_engine.assess_experiment(cfg)
            req = AIInterpretationRequest(experiment=cfg, assessment=assessment)
            res = asyncio.run(ai_service.interpret_assessment(req))

            assert "converting a fraction of pet into soluble monomers" not in res.executive_overview.lower()
            assert "soluble aromatic intermediates" in res.executive_overview.lower()
            assert "Product Classification Note" in res.biochemical_mechanism_analysis
            assert "True monomers: Terephthalic acid (TPA) and ethylene glycol (EG)" in res.biochemical_mechanism_analysis
            assert "Intermediates: Mono-(2-hydroxyethyl) terephthalate (MHET)" in res.biochemical_mechanism_analysis
    finally:
        credential_manager._cache = orig_cache


def test_final_quality_d_buffering_capacity_not_guaranteed_stability():
    """Quality Fix D: Buffer provides chemical resistance against localized acidification rather than guaranteed stability."""
    import asyncio
    from unittest.mock import patch, MagicMock
    from app.services.ai_service import ai_service
    from app.services.credential_manager import credential_manager
    from app.models.ai_models import AIInterpretationRequest
    from app.models.experiment import ExperimentConfig, EnvironmentConditions
    from app.models.components import SelectedComponent, ComponentRole

    orig_cache = dict(credential_manager._cache)
    credential_manager._cache["openai"] = {"api_key": "sk-test", "base_url": "https://api.openai.com/v1", "model": "gpt-4o-mini"}

    try:
        mock_raw = {
            "executive_overview": "Maintaining a passive phosphate buffer at pH 7.0 ensures stable pH throughout the reaction.",
            "biochemical_mechanism_analysis": "Buffer ensures stable pH despite ester hydrolysis.",
            "environmental_and_climate_perspective": "Perspective.",
            "uncertainties_and_gap_analysis": "Gaps.",
            "recommended_follow_up_experiments": ["Scale up."],
            "proposed_experiment": {
                "config": {
                    "name": "Buffer Run",
                    "selected_components": [
                        {"component_id": "comp_pet", "role": "substrate", "concentration": "10 mg/mL"},
                        {"component_id": "comp_ispetase", "role": "catalyst", "concentration": "50 nM"},
                        {"component_id": "comp_buffer_phosphate", "role": "buffer", "concentration": "50 mM"},
                    ],
                    "environment": {"temperature_celsius": 30.0, "ph": 7.0},
                },
                "scientific_rationale": "Phosphate buffer ensures stable pH during operation.",
                "expected_outcomes": ["Maintaining buffer ensures stable pH."],
                "assumptions_and_boundaries": [],
                "supporting_evidence_ids": ["ref_yoshida_2016"],
            },
        }
        mock_resp = MagicMock(status_code=200)
        mock_resp.json.return_value = {"choices": [{"message": {"content": json.dumps(mock_raw)}}]}

        with patch("httpx.AsyncClient.post", return_value=mock_resp):
            cfg = ExperimentConfig(
                name="Buffer Test Run",
                selected_components=[SelectedComponent(component_id="comp_pet", role=ComponentRole.SUBSTRATE)],
                environment=EnvironmentConditions(),
            )
            assessment = scientific_engine.assess_experiment(cfg)
            req = AIInterpretationRequest(experiment=cfg, assessment=assessment)
            res = asyncio.run(ai_service.interpret_assessment(req))

            assert "ensures stable ph" not in res.executive_overview.lower()
            assert "provides chemical resistance against localized ph shifts" in res.executive_overview.lower()
            assert "ensures stable ph" not in res.proposed_experiment.scientific_rationale.lower()
    finally:
        credential_manager._cache = orig_cache


def test_final_quality_e_mhetase_concentration_visibly_exploratory():
    """Quality Fix E: MHETase concentration designated as exploratory starting value with reproducibility disclosure."""
    import asyncio
    from unittest.mock import patch, MagicMock
    from app.services.ai_service import ai_service
    from app.services.credential_manager import credential_manager
    from app.models.ai_models import AIInterpretationRequest
    from app.models.experiment import ExperimentConfig, EnvironmentConditions
    from app.models.components import SelectedComponent, ComponentRole

    orig_cache = dict(credential_manager._cache)
    credential_manager._cache["openai"] = {"api_key": "sk-test", "base_url": "https://api.openai.com/v1", "model": "gpt-4o-mini"}

    try:
        mock_raw = {
            "executive_overview": "Overview.",
            "biochemical_mechanism_analysis": "Mechanism.",
            "environmental_and_climate_perspective": "Perspective.",
            "uncertainties_and_gap_analysis": "Gaps.",
            "recommended_follow_up_experiments": ["Test optimal concentration."],
            "proposed_experiment": {
                "config": {
                    "name": "Exploratory MHETase Run",
                    "selected_components": [
                        {"component_id": "comp_pet", "role": "substrate", "concentration": "10 mg/mL"},
                        {"component_id": "comp_ispetase", "role": "catalyst", "concentration": "50 nM"},
                        {"component_id": "comp_mhetase", "role": "catalyst", "concentration": "100 nM"},
                    ],
                    "environment": {"temperature_celsius": 30.0, "ph": 7.0},
                },
                "scientific_rationale": "Rationale.",
                "expected_outcomes": ["Outcomes."],
                "assumptions_and_boundaries": [],
                "supporting_evidence_ids": ["ref_yoshida_2016"],
            },
        }
        mock_resp = MagicMock(status_code=200)
        mock_resp.json.return_value = {"choices": [{"message": {"content": json.dumps(mock_raw)}}]}

        with patch("httpx.AsyncClient.post", return_value=mock_resp):
            cfg = ExperimentConfig(
                name="Exploratory Run",
                selected_components=[SelectedComponent(component_id="comp_pet", role=ComponentRole.SUBSTRATE)],
                environment=EnvironmentConditions(),
            )
            assessment = scientific_engine.assess_experiment(cfg)
            req = AIInterpretationRequest(experiment=cfg, assessment=assessment)
            res = asyncio.run(ai_service.interpret_assessment(req))

            mhetase_comp = next(c for c in res.proposed_experiment.config.selected_components if c.component_id == "comp_mhetase")
            assert mhetase_comp.notes is not None
            assert "Exploratory starting concentration — not a validated optimum" in mhetase_comp.notes
            assert any("Concentrations are recorded for experimental protocol reproducibility" in a for a in res.proposed_experiment.assumptions_and_boundaries)
    finally:
        credential_manager._cache = orig_cache


def test_final_quality_f_all_five_html_entities_decode():
    """Quality Fix F: All 5 malformed HTML entity escapes decode cleanly with or without semicolons."""
    from app.models.ai_models import clean_html_entities, ProposedExperimentProposal
    from app.models.experiment import ExperimentConfig, EnvironmentConditions

    test_inputs = [
        ("&#x49;ntroduce active pH-stat", "Introduce active pH-stat"),
        ("&#x50;erform HPLC quantification", "Perform HPLC quantification"),
        ("&#x49;mplement thermal pre-treatment", "Implement thermal pre-treatment"),
        ("&#x49;ncrease buffer capacity", "Increase buffer capacity"),
        ("&#x4D;easure residual crystallinity", "Measure residual crystallinity"),
        ("&#x49ntroduce active pH-stat", "Introduce active pH-stat"),
        ("&#x49mplement thermal pre-treatment", "Implement thermal pre-treatment"),
        ("&#x49ncrease buffer capacity", "Increase buffer capacity"),
    ]

    for raw, expected in test_inputs:
        cleaned = clean_html_entities(raw)
        assert cleaned == expected, f"Expected '{expected}', got '{cleaned}'"

    # Also test within Pydantic model serialization
    from app.models.components import SelectedComponent, ComponentRole
    prop = ProposedExperimentProposal(
        config=ExperimentConfig(
            name="&#x49;ntroduce Run",
            selected_components=[SelectedComponent(component_id="comp_pet", role=ComponentRole.SUBSTRATE)],
            environment=EnvironmentConditions()
        ),
        scientific_rationale="&#x50;erform reaction to verify kinetics.",
        expected_outcomes=["&#x49;mplement multi-enzyme system", "&#x49;ncrease buffer"],
        assumptions_and_boundaries=["&#x4D;easure mass loss"],
        supporting_evidence_ids=["ref_yoshida_2016"],
    )
    dumped = prop.model_dump()
    assert dumped["scientific_rationale"] == "Perform reaction to verify kinetics."
    assert dumped["expected_outcomes"][0] == "Implement multi-enzyme system"
    assert dumped["expected_outcomes"][1] == "Increase buffer"
    assert dumped["assumptions_and_boundaries"][0] == "Measure mass loss"


def test_final_quality_g_mhet_inhibition_citations_traceability():
    """Quality Fix G: MHET inhibition explicitly cites Yoshida et al. 2016 & Palm et al. 2019 without fabricated constants."""
    import asyncio
    from unittest.mock import patch, MagicMock
    from app.services.ai_service import ai_service
    from app.services.credential_manager import credential_manager
    from app.models.ai_models import AIInterpretationRequest
    from app.models.experiment import ExperimentConfig, EnvironmentConditions
    from app.models.components import SelectedComponent, ComponentRole

    orig_cache = dict(credential_manager._cache)
    credential_manager._cache["openai"] = {"api_key": "sk-test", "base_url": "https://api.openai.com/v1", "model": "gpt-4o-mini"}

    try:
        mock_raw = {
            "executive_overview": "Overview.",
            "biochemical_mechanism_analysis": "Accumulated MHET inhibits IsPETase (Ki = 0.45 mM, IC50 = 12 uM).",
            "environmental_and_climate_perspective": "Perspective.",
            "uncertainties_and_gap_analysis": "MHET accumulation creates product inhibition.",
            "recommended_follow_up_experiments": ["Include MHETase."],
            "proposed_experiment": {
                "config": {
                    "name": "Co-culture MHETase",
                    "selected_components": [
                        {"component_id": "comp_pet", "role": "substrate", "concentration": "10 mg/mL"},
                        {"component_id": "comp_ispetase", "role": "catalyst", "concentration": "50 nM"},
                        {"component_id": "comp_mhetase", "role": "catalyst", "concentration": "100 nM"},
                    ],
                    "environment": {"temperature_celsius": 30.0, "ph": 7.0},
                },
                "scientific_rationale": "Relieves inhibition.",
                "expected_outcomes": ["Higher conversion."],
                "assumptions_and_boundaries": [],
                "supporting_evidence_ids": ["ref_yoshida_2016"],
            },
        }
        mock_resp = MagicMock(status_code=200)
        mock_resp.json.return_value = {"choices": [{"message": {"content": json.dumps(mock_raw)}}]}

        with patch("httpx.AsyncClient.post", return_value=mock_resp):
            cfg = ExperimentConfig(
                name="Citation Traceability Run",
                selected_components=[SelectedComponent(component_id="comp_pet", role=ComponentRole.SUBSTRATE)],
                environment=EnvironmentConditions(),
            )
            assessment = scientific_engine.assess_experiment(cfg)
            req = AIInterpretationRequest(experiment=cfg, assessment=assessment)
            res = asyncio.run(ai_service.interpret_assessment(req))

            assert "Yoshida et al. (2016)" in res.biochemical_mechanism_analysis
            assert "Palm et al. (2019)" in res.biochemical_mechanism_analysis
            assert "ki = 0.45" not in res.biochemical_mechanism_analysis.lower()
            assert "ic50" not in res.biochemical_mechanism_analysis.lower()
            assert "ref_yoshida_2016" in res.proposed_experiment.supporting_evidence_ids
            assert "ref_palm_2019" in res.proposed_experiment.supporting_evidence_ids
    finally:
        credential_manager._cache = orig_cache





