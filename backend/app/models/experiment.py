from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field
from app.models.components import SelectedComponent, ComponentRole, ComponentCategory

class OxygenAvailability(str, Enum):
    AEROBIC = "Aerobic"
    MICROAEROPHILIC = "Microaerophilic"
    ANAEROBIC = "Anaerobic"

class EnvironmentConditions(BaseModel):
    temperature_celsius: float = Field(default=30.0, ge=0.0, le=100.0, description="Reaction temperature in Celsius")
    ph: float = Field(default=7.0, ge=1.0, le=14.0, description="Medium pH")
    oxygen: OxygenAvailability = Field(default=OxygenAvailability.AEROBIC, description="Oxygen availability")
    salinity_percent: float = Field(default=0.0, ge=0.0, le=35.0, description="Salinity in weight/volume percent (0% fresh, 3.5% seawater)")
    pressure_atm: float = Field(default=1.0, ge=0.5, le=10.0, description="System atmospheric pressure")
    duration_hours: float = Field(default=24.0, ge=0.5, le=2160.0, description="Reaction incubation time in hours")
    agitation_rpm: Optional[int] = Field(default=150, ge=0, le=1000, description="Vessel orbital agitation speed")

class ExperimentConfig(BaseModel):
    id: Optional[str] = None
    name: str = Field(default="Plastic Biocatalysis Experiment", min_length=2, max_length=150)
    description: Optional[str] = None
    selected_components: List[SelectedComponent] = Field(min_length=1)
    environment: EnvironmentConditions

