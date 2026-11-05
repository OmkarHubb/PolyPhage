from enum import Enum
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class ComponentCategory(str, Enum):
    PLASTICS = "Plastics"
    ENZYMES = "Enzymes"
    MICROORGANISMS = "Microorganisms"
    CHEMICALS_AND_COFACTORS = "Chemicals and Cofactors"

class ComponentRole(str, Enum):
    SUBSTRATE = "substrate"
    CATALYST = "catalyst"
    HOST_ORGANISM = "host_organism"
    BUFFER = "buffer"
    COFACTOR = "cofactor"

class Component(BaseModel):
    id: str
    name: str
    category: ComponentCategory
    description: str
    chemical_formula: Optional[str] = None
    ec_number: Optional[str] = None
    properties: Dict[str, Any] = Field(default_factory=dict)
    supported_roles: List[ComponentRole]
    evidence_ids: List[str] = Field(default_factory=list)

class SelectedComponent(BaseModel):
    component_id: str
    role: ComponentRole
    concentration: Optional[str] = None
    notes: Optional[str] = None
