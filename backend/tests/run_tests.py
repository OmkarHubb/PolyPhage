"""
PolyPhage AI Test Runner
Executes all scientific verification and API test cases.
"""
import sys
import os

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

if __name__ == "__main__":
    from tests.test_assessment import (
        test_import_resilience,
        test_pet_ispetase_assessment,
        test_pet_ispetase_buffer_mean,
        test_pet_ispetase_mhetase_cascade,
        test_pet_lcc_thermophilic,
        test_thermal_denaturation_override_cap,
        test_ph_stress_penalty,
        test_api_health_endpoint,
        test_api_components_catalog,
        test_api_assessment_run_endpoint,
        test_pressure_parameter_in_assessment,
        test_custom_provider_omits_response_format,
        test_custom_provider_retry_on_400,
        test_concentration_validation_positive_and_units,
        test_concentration_preservation_and_non_kinetic_invariance,
        test_tool_dispatcher_catalog_and_literature,
        test_tool_dispatcher_simulate_assessment,
        test_ai_interpretation_with_proposed_experiment,
        test_ai_chat_tool_calling_loop,
        test_environmental_impact_and_lca_disclaimer,
        test_environmental_scientific_governance_refinement,
        test_experiment_id_generation_and_preservation,
        test_ai_chat_response_executed_tools_and_synthesis,
        test_thermophilic_workflow_orchestration_completes_simulation_and_7_sections,
        test_regression_a_pet_ispetase,
        test_regression_b_pla_ispetase_incompatibility,
        test_regression_c_engineered_vs_wild_type_fidelity,
        test_regression_d_buffer_consistency,
        test_regression_e_scoring_and_status_consistency,
        test_regression_f_context_preservation_and_prompt_precedence,
        test_governance_test_a_environmental_claims_obey_governance,
        test_governance_test_b_pet_ispetase_mhet_accumulation_and_downstream_requirement,
        test_governance_test_c_dual_enzyme_no_complete_conversion_claim,
        test_governance_test_d_buffer_vs_active_ph_stat_proposal_title,
        test_governance_test_e_process_energy_claims_neutrality,
        test_governance_test_f_mhetase_concentration_tagged_exploratory,
        test_governance_test_g_oxygen_dependency_claims_avoided,
        test_governance_test_h_engineered_variant_identity_matches_catalog,
        test_governance_test_i_scientific_citation_traceability,
        test_governance_test_j_html_entity_decoding,
        test_governance_test_k_proposal_title_component_consistency,
        test_final_quality_a_no_unsupported_aerobic_condition,
        test_final_quality_b_no_achieved_waste_diversion,
        test_final_quality_c_mhet_bhet_not_classified_as_monomers,
        test_final_quality_d_buffering_capacity_not_guaranteed_stability,
        test_final_quality_e_mhetase_concentration_visibly_exploratory,
        test_final_quality_f_all_five_html_entities_decode,
        test_final_quality_g_mhet_inhibition_citations_traceability,
    )

    tests = [
        ("test_import_resilience", test_import_resilience),
        ("test_pet_ispetase_assessment", test_pet_ispetase_assessment),
        ("test_pet_ispetase_buffer_mean", test_pet_ispetase_buffer_mean),
        ("test_pet_ispetase_mhetase_cascade", test_pet_ispetase_mhetase_cascade),
        ("test_pet_lcc_thermophilic", test_pet_lcc_thermophilic),
        ("test_thermal_denaturation_override_cap", test_thermal_denaturation_override_cap),
        ("test_ph_stress_penalty", test_ph_stress_penalty),
        ("test_api_health_endpoint", test_api_health_endpoint),
        ("test_api_components_catalog", test_api_components_catalog),
        ("test_api_assessment_run_endpoint", test_api_assessment_run_endpoint),
        ("test_pressure_parameter_in_assessment", test_pressure_parameter_in_assessment),
        ("test_custom_provider_omits_response_format", test_custom_provider_omits_response_format),
        ("test_custom_provider_retry_on_400", test_custom_provider_retry_on_400),
        ("test_concentration_validation_positive_and_units", test_concentration_validation_positive_and_units),
        ("test_concentration_preservation_and_non_kinetic_invariance", test_concentration_preservation_and_non_kinetic_invariance),
        ("test_tool_dispatcher_catalog_and_literature", test_tool_dispatcher_catalog_and_literature),
        ("test_tool_dispatcher_simulate_assessment", test_tool_dispatcher_simulate_assessment),
        ("test_ai_interpretation_with_proposed_experiment", test_ai_interpretation_with_proposed_experiment),
        ("test_ai_chat_tool_calling_loop", test_ai_chat_tool_calling_loop),
        ("test_environmental_impact_and_lca_disclaimer", test_environmental_impact_and_lca_disclaimer),
        ("test_environmental_scientific_governance_refinement", test_environmental_scientific_governance_refinement),
        ("test_experiment_id_generation_and_preservation", test_experiment_id_generation_and_preservation),
        ("test_ai_chat_response_executed_tools_and_synthesis", test_ai_chat_response_executed_tools_and_synthesis),
        ("test_thermophilic_workflow_orchestration_completes_simulation_and_7_sections", test_thermophilic_workflow_orchestration_completes_simulation_and_7_sections),
        ("test_regression_a_pet_ispetase", test_regression_a_pet_ispetase),
        ("test_regression_b_pla_ispetase_incompatibility", test_regression_b_pla_ispetase_incompatibility),
        ("test_regression_c_engineered_vs_wild_type_fidelity", test_regression_c_engineered_vs_wild_type_fidelity),
        ("test_regression_d_buffer_consistency", test_regression_d_buffer_consistency),
        ("test_regression_e_scoring_and_status_consistency", test_regression_e_scoring_and_status_consistency),
        ("test_regression_f_context_preservation_and_prompt_precedence", test_regression_f_context_preservation_and_prompt_precedence),
        ("test_governance_test_a_environmental_claims_obey_governance", test_governance_test_a_environmental_claims_obey_governance),
        ("test_governance_test_b_pet_ispetase_mhet_accumulation_and_downstream_requirement", test_governance_test_b_pet_ispetase_mhet_accumulation_and_downstream_requirement),
        ("test_governance_test_c_dual_enzyme_no_complete_conversion_claim", test_governance_test_c_dual_enzyme_no_complete_conversion_claim),
        ("test_governance_test_d_buffer_vs_active_ph_stat_proposal_title", test_governance_test_d_buffer_vs_active_ph_stat_proposal_title),
        ("test_governance_test_e_process_energy_claims_neutrality", test_governance_test_e_process_energy_claims_neutrality),
        ("test_governance_test_f_mhetase_concentration_tagged_exploratory", test_governance_test_f_mhetase_concentration_tagged_exploratory),
        ("test_governance_test_g_oxygen_dependency_claims_avoided", test_governance_test_g_oxygen_dependency_claims_avoided),
        ("test_governance_test_h_engineered_variant_identity_matches_catalog", test_governance_test_h_engineered_variant_identity_matches_catalog),
        ("test_governance_test_i_scientific_citation_traceability", test_governance_test_i_scientific_citation_traceability),
        ("test_governance_test_j_html_entity_decoding", test_governance_test_j_html_entity_decoding),
        ("test_governance_test_k_proposal_title_component_consistency", test_governance_test_k_proposal_title_component_consistency),
        ("test_final_quality_a_no_unsupported_aerobic_condition", test_final_quality_a_no_unsupported_aerobic_condition),
        ("test_final_quality_b_no_achieved_waste_diversion", test_final_quality_b_no_achieved_waste_diversion),
        ("test_final_quality_c_mhet_bhet_not_classified_as_monomers", test_final_quality_c_mhet_bhet_not_classified_as_monomers),
        ("test_final_quality_d_buffering_capacity_not_guaranteed_stability", test_final_quality_d_buffering_capacity_not_guaranteed_stability),
        ("test_final_quality_e_mhetase_concentration_visibly_exploratory", test_final_quality_e_mhetase_concentration_visibly_exploratory),
        ("test_final_quality_f_all_five_html_entities_decode", test_final_quality_f_all_five_html_entities_decode),
        ("test_final_quality_g_mhet_inhibition_citations_traceability", test_final_quality_g_mhet_inhibition_citations_traceability),
    ]

    passed = 0
    failed = 0
    print("=" * 60)
    print("PolyPhage AI Backend Scientific Verification Test Suite")
    print("=" * 60)

    for name, fn in tests:
        try:
            fn()
            print(f"  [PASS] {name}")
            passed += 1
        except Exception as e:
            print(f"  [FAIL] {name}: {e}")
            failed += 1

    print("-" * 60)
    print(f"Summary: {passed} passed, {failed} failed out of {len(tests)} tests.")
    print("=" * 60)

    if failed > 0:
        sys.exit(1)
    else:
        sys.exit(0)
