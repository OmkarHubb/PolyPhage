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
