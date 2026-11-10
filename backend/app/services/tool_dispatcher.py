import logging
from typing import Dict, Any, List, Optional
from app.models.experiment import ExperimentConfig
from app.scientific_data.loader import get_all_components, get_all_evidence
from app.services.assessment_engine import scientific_engine

logger = logging.getLogger("polyphage.tools")

TOOLS_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "get_component_catalog",
            "description": (
                "Retrieve verified biochemical components from the curated PolyPhage laboratory catalog. "
                "Filter by category ('Plastics', 'Enzymes', 'Microorganisms', 'Chemicals and Cofactors') or keyword search."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "category": {
                        "type": "string",
                        "description": "Optional category filter: 'All', 'Plastics', 'Enzymes', 'Microorganisms', or 'Chemicals and Cofactors'",
                    },
                    "search": {
                        "type": "string",
                        "description": "Optional keyword to search in component names, descriptions, or properties",
                    },
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_literature",
            "description": (
                "Search the curated empirical literature evidence database by keyword, associated component ID, or DOI. "
                "Returns peer-reviewed citations with experimental conditions and published findings. Never fabricates data."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search keyword matching title, abstract, authors, or key findings",
                    },
                    "component_id": {
                        "type": "string",
                        "description": "Filter by associated component ID (e.g. 'comp_pet', 'comp_ispetase', 'comp_mhetase', 'comp_lcc_iccg')",
                    },
                    "doi": {
                        "type": "string",
                        "description": "Exact DOI query (e.g. '10.1126/science.aad6359')",
                    },
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "simulate_assessment",
            "description": (
                "Run a computational rule-based assessment of an experiment configuration through the deterministic "
                "PolyPhage scientific assessment engine. Does not alter the user's active workspace. "
                "Note: This is a computational/rule-based evaluation based on published thermodynamic boundaries, "
                "not a physical wet-lab experiment or molecular dynamics simulation."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "Descriptive title for the simulated experiment",
                    },
                    "selected_components": {
                        "type": "array",
                        "description": "List of components with roles and optional non-kinetic concentrations",
                        "items": {
                            "type": "object",
                            "properties": {
                                "component_id": {"type": "string", "description": "Catalog ID of the component"},
                                "role": {
                                    "type": "string",
                                    "enum": ["substrate", "catalyst", "host_organism", "buffer", "cofactor"],
                                    "description": "Component biochemical role in the reaction",
                                },
                                "concentration": {
                                    "type": "string",
                                    "description": "Recorded concentration with unit (e.g. '50 nM', '10 mg/mL', '50 mM')",
                                },
                            },
                            "required": ["component_id", "role"],
                        },
                    },
                    "environment": {
                        "type": "object",
                        "properties": {
                            "temperature_celsius": {"type": "number", "description": "Temperature in °C (0-100)"},
                            "ph": {"type": "number", "description": "Medium pH (1-14)"},
                            "oxygen": {"type": "string", "enum": ["Aerobic", "Microaerophilic", "Anaerobic"]},
                            "salinity_percent": {"type": "number", "description": "Salinity % (0-35)"},
                            "pressure_atm": {"type": "number", "description": "Atmospheric pressure (0.5-10.0)"},
                            "duration_hours": {"type": "number", "description": "Reaction time in hours"},
                            "agitation_rpm": {"type": "integer", "description": "Stirring speed in RPM (0-1000)"},
                        },
                    },
                },
                "required": ["selected_components"],
            },
        },
    },
]

ALLOWED_TOOL_NAMES = {"get_component_catalog", "search_literature", "simulate_assessment"}


class ScientificToolDispatcher:
    """
    Controlled backend dispatcher for scientific tools.
    Strictly gates execution to whitelisted, read-only/computational operations.
    Never executes arbitrary code or shell commands.
    """

    def get_component_catalog(
        self, category: Optional[str] = None, search: Optional[str] = None
    ) -> Dict[str, Any]:
        all_comps = get_all_components()
        results = []

        clean_cat = (category or "").strip()
        clean_search = (search or "").strip().lower()

        for c in all_comps:
            if clean_cat and clean_cat != "All" and c.get("category", "").lower() != clean_cat.lower():
                continue
            if clean_search:
                haystack = f"{c.get('name', '')} {c.get('description', '')} {c.get('id', '')}".lower()
                if clean_search not in haystack:
                    continue

            results.append({
                "id": c["id"],
                "name": c["name"],
                "category": c["category"],
                "chemical_formula": c.get("chemical_formula"),
                "ec_number": c.get("ec_number"),
                "supported_roles": c.get("supported_roles", []),
                "properties": c.get("properties", {}),
                "evidence_ids": c.get("evidence_ids", []),
            })

        logger.info(f"Tool executed: get_component_catalog (returned {len(results)} items)")
        return {
            "success": True,
            "count": len(results),
            "components": results,
        }

    def search_literature(
        self,
        query: Optional[str] = None,
        component_id: Optional[str] = None,
        doi: Optional[str] = None,
    ) -> Dict[str, Any]:
        all_ev = get_all_evidence()
        results = []

        q = (query or "").strip().lower()
        cid = (component_id or "").strip().lower()
        d = (doi or "").strip().lower()

        # Build mapping of component_id to evidence_ids if filtering by component
        comp_ev_map = {}
        if cid:
            for c in get_all_components():
                comp_ev_map[c["id"].lower()] = set(c.get("evidence_ids", []))

        for ev in all_ev:
            if d and d not in ev.get("doi", "").lower():
                continue

            if cid:
                linked_ids = comp_ev_map.get(cid, set())
                if ev.get("id") not in linked_ids:
                    # Also check if text mentions the component
                    text_blob = f"{ev.get('title', '')} {ev.get('abstract_summary', '')}".lower()
                    if cid.replace("comp_", "") not in text_blob:
                        continue

            if q:
                q_terms = [q]
                if "ispetase" in q or "is-petase" in q:
                    q_terms.extend(["petase", "ideonella", "austin", "yoshida"])
                elif "petase" in q:
                    q_terms.extend(["ispetase", "pet hydrolase", "austin", "yoshida"])
                elif "lcc" in q:
                    q_terms.extend(["cutinase", "tournier"])
                elif "fast" in q and "pet" in q:
                    q_terms.extend(["fast-petase", "lu"])

                findings_str = " ".join(ev.get("key_findings", []))
                blob = f"{ev.get('id', '')} {ev.get('title', '')} {ev.get('authors', '')} {ev.get('abstract_summary', '')} {findings_str}".lower()
                if not any(term in blob for term in q_terms):
                    continue

            results.append({
                "id": ev["id"],
                "title": ev["title"],
                "authors": ev["authors"],
                "journal": ev["journal"],
                "year": ev["year"],
                "doi": ev["doi"],
                "url": ev.get("url"),
                "evidence_level": ev.get("evidence_level"),
                "abstract_summary": ev.get("abstract_summary"),
                "key_findings": ev.get("key_findings", []),
                "experimental_conditions_reported": ev.get("experimental_conditions_reported", {}),
            })

        logger.info(f"Tool executed: search_literature (returned {len(results)} references)")
        return {
            "success": True,
            "count": len(results),
            "references": results,
        }

    def simulate_assessment(self, **kwargs) -> Dict[str, Any]:
        try:
            # Ensure name and default environment if omitted
            if "name" not in kwargs:
                kwargs["name"] = "AI Simulated Reaction Run"
            if "environment" not in kwargs or not kwargs["environment"]:
                kwargs["environment"] = {
                    "temperature_celsius": 30.0,
                    "ph": 7.0,
                    "oxygen": "Aerobic",
                    "salinity_percent": 0.0,
                    "pressure_atm": 1.0,
                    "duration_hours": 24.0,
                    "agitation_rpm": 150,
                }

            cfg = ExperimentConfig(**kwargs)
            res = scientific_engine.assess_experiment(cfg)

            logger.info(f"Tool executed: simulate_assessment (score={res.overall_score}, status={res.overall_status})")
            return {
                "success": True,
                "assessment_nature": "Computational rule-based assessment based on literature tolerance thresholds. Not a physical wet-lab experiment or molecular simulation.",
                "experiment_id": res.experiment_id,
                "overall_status": res.overall_status,
                "overall_score": res.overall_score,
                "executive_summary": res.executive_summary,
                "component_assessments": [
                    {
                        "name": ca.name,
                        "role": ca.role,
                        "viability_status": ca.viability_status.value,
                        "concentration": ca.concentration or "Unspecified (Non-Kinetic)",
                        "temperature_assessment": ca.temperature_assessment,
                        "ph_assessment": ca.ph_assessment,
                        "notes": ca.notes,
                    }
                    for ca in res.component_assessments
                ],
                "score_breakdown": [
                    {
                        "name": e.name,
                        "heuristic_score": e.heuristic_score,
                        "basis": e.basis,
                    }
                    for e in res.score_breakdown
                ],
                "active_pathways": [p.name for p in res.active_pathways],
                "potential_products": [
                    {
                        "name": p.name,
                        "formula": p.formula,
                        "stage": p.reaction_stage,
                        "biological_impact": p.biological_and_environmental_impact,
                    }
                    for p in res.potential_products
                ],
                "evidence_references": [
                    {
                        "id": ev.get("id") if isinstance(ev, dict) else getattr(ev, "id", ""),
                        "title": ev.get("title") if isinstance(ev, dict) else getattr(ev, "title", ""),
                        "authors": ev.get("authors") if isinstance(ev, dict) else getattr(ev, "authors", ""),
                        "journal": ev.get("journal") if isinstance(ev, dict) else getattr(ev, "journal", ""),
                        "year": ev.get("year") if isinstance(ev, dict) else getattr(ev, "year", None),
                        "doi": ev.get("doi") if isinstance(ev, dict) else getattr(ev, "doi", ""),
                        "url": ev.get("url") if isinstance(ev, dict) else getattr(ev, "url", ""),
                    }
                    for ev in res.evidence_references
                ],
                "assumptions_and_limitations": res.assumptions_and_limitations,
                "missing_evidence_and_uncertainties": res.missing_evidence_and_uncertainties,
                "applied_cap": res.score_details.applied_cap if res.score_details else None,
                "override_reason": res.score_details.override_reason if res.score_details else None,
            }
        except Exception as e:
            logger.warning(f"simulate_assessment failed validation: {str(e)}")
            return {
                "success": False,
                "error": f"Invalid experiment configuration for simulation: {str(e)}",
            }

    def dispatch(self, tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        if tool_name not in ALLOWED_TOOL_NAMES:
            logger.warning(f"Unauthorized tool execution attempt rejected: {tool_name}")
            return {
                "success": False,
                "error": f"Tool '{tool_name}' is not recognized. Allowed tools: {list(ALLOWED_TOOL_NAMES)}",
            }

        try:
            if tool_name == "get_component_catalog":
                return self.get_component_catalog(
                    category=arguments.get("category"),
                    search=arguments.get("search"),
                )
            elif tool_name == "search_literature":
                return self.search_literature(
                    query=arguments.get("query"),
                    component_id=arguments.get("component_id"),
                    doi=arguments.get("doi"),
                )
            elif tool_name == "simulate_assessment":
                return self.simulate_assessment(**arguments)
        except Exception as e:
            logger.error(f"Error executing tool {tool_name}: {str(e)}")
            return {
                "success": False,
                "error": f"Tool execution failed: {str(e)}",
            }


tool_dispatcher = ScientificToolDispatcher()

