from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from app.scientific_data.loader import (
    get_all_components,
    get_component_by_id,
    get_all_evidence,
    get_evidence_by_id,
)

router = APIRouter(prefix="/components", tags=["Components"])
evidence_router = APIRouter(prefix="/evidence", tags=["Evidence"])

@router.get("", response_model=List[dict])
def list_components(
    category: Optional[str] = Query(None, description="Filter by category"),
    search: Optional[str] = Query(None, description="Search by name or description"),
):
    comps = get_all_components()
    if category:
        comps = [c for c in comps if c.get("category", "").lower() == category.lower()]
    if search:
        s = search.lower()
        comps = [
            c for c in comps
            if s in c.get("name", "").lower()
            or s in c.get("description", "").lower()
            or s in c.get("chemical_formula", "").lower()
        ]
    return comps

@router.get("/{component_id}", response_model=dict)
def get_component(component_id: str):
    comp = get_component_by_id(component_id)
    if not comp:
        raise HTTPException(status_code=404, detail=f"Component '{component_id}' not found.")
    return comp

@evidence_router.get("", response_model=List[dict])
def list_evidence():
    return get_all_evidence()

@evidence_router.get("/{evidence_id}", response_model=dict)
def get_evidence(evidence_id: str):
    ev = get_evidence_by_id(evidence_id)
    if not ev:
        raise HTTPException(status_code=404, detail=f"Evidence reference '{evidence_id}' not found.")
    return ev
