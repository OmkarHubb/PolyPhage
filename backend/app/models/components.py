import re
from enum import Enum
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field, field_validator, model_validator

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

VALID_CONCENTRATION_UNITS: Dict[str, List[str]] = {
    ComponentCategory.ENZYMES.value: ["nM", "µM", "uM", "mg/L", "mg/g substrate"],
    ComponentCategory.PLASTICS.value: ["mg/mL", "g/L", "wt%"],
    ComponentCategory.CHEMICALS_AND_COFACTORS.value: ["mM", "M", "wt%"],
    ComponentCategory.MICROORGANISMS.value: ["OD600", "CFU/mL", "cells/mL"],
}

ALL_VALID_UNITS = {u for units in VALID_CONCENTRATION_UNITS.values() for u in units}

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
    concentration: Optional[str] = Field(
        default=None,
        description="Configured concentration record (e.g. '50 nM', '10 mg/mL'). Non-kinetic boundary condition."
    )
    concentration_value: Optional[float] = None
    concentration_unit: Optional[str] = None
    notes: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def validate_concentration_structure(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data

        raw_conc = data.get("concentration")
        val = data.get("concentration_value")
        unit = data.get("concentration_unit")

        # If value and unit provided explicitly, construct concentration string
        if val is not None and unit:
            try:
                numeric_val = float(val)
            except (ValueError, TypeError):
                raise ValueError(f"Concentration value must be numeric, got: {val}")
            if numeric_val <= 0:
                raise ValueError(f"Concentration quantity must be positive (> 0), got: {numeric_val}")
            clean_unit = str(unit).strip()
            if clean_unit not in ALL_VALID_UNITS:
                raise ValueError(f"Invalid concentration unit '{clean_unit}'. Supported units: {', '.join(sorted(ALL_VALID_UNITS))}")
            data["concentration"] = f"{numeric_val:g} {clean_unit}"
            data["concentration_value"] = numeric_val
            data["concentration_unit"] = clean_unit
            return data

        if raw_conc is not None:
            raw_str = str(raw_conc).strip()
            if not raw_str or raw_str.lower() in ["unspecified", "none", "null"]:
                data["concentration"] = None
                data["concentration_value"] = None
                data["concentration_unit"] = None
                return data

            # Parse string format: "<number> <unit>"
            match = re.match(r"^([+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\s*(.+)$", raw_str)
            if not match:
                raise ValueError(
                    f"Invalid concentration format '{raw_str}'. Expected format: '<number> <unit>' (e.g. '50 nM', '10 mg/mL')."
                )

            num_str, unit_str = match.groups()
            try:
                numeric_val = float(num_str)
            except ValueError:
                raise ValueError(f"Concentration quantity '{num_str}' is not a valid number.")

            if numeric_val <= 0:
                raise ValueError(f"Concentration quantity must be positive (> 0), got: {numeric_val}")

            clean_unit = unit_str.strip()
            if clean_unit not in ALL_VALID_UNITS:
                raise ValueError(
                    f"Unsupported concentration unit '{clean_unit}'. Supported units: {', '.join(sorted(ALL_VALID_UNITS))}"
                )

            data["concentration"] = f"{numeric_val:g} {clean_unit}"
            data["concentration_value"] = numeric_val
            data["concentration_unit"] = clean_unit

        return data

