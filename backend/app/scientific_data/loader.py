import json
from pathlib import Path
from typing import List, Dict, Any, Optional

DATA_DIR = Path(__file__).parent

def _load_json(filename: str) -> List[Dict[str, Any]]:
    path = DATA_DIR / filename
    if not path.exists():
        return []
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

# In-memory cached scientific data
_COMPONENTS: List[Dict[str, Any]] = []
_EVIDENCE: List[Dict[str, Any]] = []
_PATHWAYS: List[Dict[str, Any]] = []

def init_scientific_data():
    global _COMPONENTS, _EVIDENCE, _PATHWAYS
    _COMPONENTS = _load_json("components_catalog.json")
    _EVIDENCE = _load_json("literature_evidence.json")
    _PATHWAYS = _load_json("degradation_pathways.json")

def get_all_components() -> List[Dict[str, Any]]:
    if not _COMPONENTS:
        init_scientific_data()
    return _COMPONENTS

def get_component_by_id(component_id: str) -> Optional[Dict[str, Any]]:
    for c in get_all_components():
        if c.get("id") == component_id:
            return c
    return None

def get_all_evidence() -> List[Dict[str, Any]]:
    if not _EVIDENCE:
        init_scientific_data()
    return _EVIDENCE

def get_evidence_by_id(evidence_id: str) -> Optional[Dict[str, Any]]:
    for e in get_all_evidence():
        if e.get("id") == evidence_id:
            return e
    return None

def get_evidence_by_ids(evidence_ids: List[str]) -> List[Dict[str, Any]]:
    ev_map = {e.get("id"): e for e in get_all_evidence()}
    return [ev_map[eid] for eid in evidence_ids if eid in ev_map]

def get_all_pathways() -> List[Dict[str, Any]]:
    if not _PATHWAYS:
        init_scientific_data()
    return _PATHWAYS

def find_matching_pathways(substrate_ids: List[str], enzyme_ids: List[str]) -> List[Dict[str, Any]]:
    pathways = get_all_pathways()
    matched = []
    sub_set = set(substrate_ids)
    enz_set = set(enzyme_ids)

    for p in pathways:
        sub_match = p.get("substrate_id") in sub_set or p.get("substrate_id") == "prod_mhet" # Intermediate handling
        primary_enzymes = set(p.get("primary_enzyme_ids", []))
        enz_match = bool(primary_enzymes.intersection(enz_set))

        if sub_match and enz_match:
            matched.append(p)
    return matched
