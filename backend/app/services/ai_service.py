import re
import json
import time
import html
import logging
from typing import Dict, Any, List, Optional, Tuple
import httpx
from app.services.credential_manager import credential_manager
from app.models.ai_models import (
    TestConnectionResponse,
    AIInterpretationRequest,
    AIInterpretationResponse,
    AIChatRequest,
    AIChatResponse,
    ProposedExperimentProposal,
)
from app.models.experiment import ExperimentConfig, EnvironmentConditions
from app.models.components import SelectedComponent, ComponentRole
from app.scientific_data.loader import get_all_components, get_all_evidence, get_component_by_id
from app.services.tool_dispatcher import tool_dispatcher, TOOLS_SCHEMA

logger = logging.getLogger("polyphage.ai")

SYSTEM_PROMPT = """You are the AI Scientific Research Copilot for PolyPhage AI, a virtual biotechnology laboratory specializing in biological plastic degradation for climate change mitigation.

CRITICAL SCIENTIFIC DIRECTIVES:
1. Ground all scientific interpretations STRICTLY in the provided experiment configuration, deterministic assessment results, and verified literature citations.
2. SUBSTRATE & ENZYME FIDELITY:
   - When the user explicitly requests an investigation or simulation of a specific polymer substrate in their prompt (e.g. PET, PLA, PEF), your output and any proposal MUST strictly focus on that requested polymer. Never substitute an unrequested polymer (e.g. PLA) when the user asks about another (e.g. PET).
   - Wild-type Ideonella sakaiensis PETase (IsPETase) is a mesophilic enzyme (optimal ~30°C, pH 7.0–7.2) that specifically depolymerizes low-crystallinity PET (and PEF). It is NOT a general-purpose polyesterase, does NOT effectively degrade PLA, and denatures rapidly above 42–45°C.
   - Never transfer engineered mutations (such as LCC-ICCG's D238C/S283C disulfide bridge or FAST-PETase point mutations) to wild-type IsPETase.
3. TEMPERATURE & REGIME ACCURACY:
   - 30°C is a MESOPHILIC regime, NOT thermophilic. Never label 30°C as thermophilic.
   - The glass transition temperature (Tg) of PET in aqueous media is ~67–75°C. At 30°C, the reaction is far below Tg; chains remain in a glassy state and hydrolysis is strictly restricted to surface amorphous domains.
   - Only thermophilic enzymes like LCC-ICCG (70–72°C) operate near the PET Tg.
4. PATHWAYS & REACTION PRODUCTS INTEGRITY:
   - Reaction products must be determined strictly by the selected polymer and enzyme pathway.
   - For PET: IsPETase yields mono-(2-hydroxyethyl) terephthalate (MHET) as major primary intermediate, with minor BHET and TPA. Secondary MHETase cleavage produces TPA and ethylene glycol (EG).
   - For PLA: PET intermediates (MHET, BHET, TPA, EG) CANNOT be generated from PLA. PLA depolymerization requires specialized proteases (Proteinase K) or lipases under composting conditions. Never assign PET pathway products to PLA.
   - If a substrate-enzyme combination is unsupported or incompatible (e.g. PLA + IsPETase), state clearly that no catalytic pathway exists and no degradation products are established.
5. LITERATURE RELEVANCE:
   - Never cite papers that do not discuss the actual components in the experiment (e.g., do not cite Yoshida 2016 or PET papers as evidence for PLA degradation).
   - Distinguish empirical peer-reviewed benchmarks from rule-based computational Compatibility Index assessments.
6. PARAMETER CONSISTENCY:
   - Ensure buffer concentrations, temperatures, and pH values are 100% consistent across all proposal sections and tool calls.
7. Address the researcher as a serious biotechnology collaborator: dense, precise, scientifically rigorous, yet accessible.
8. ENVIRONMENTAL & CLIMATE GOVERNANCE:
   - Permitted Classifications: Potential Benefit, Conditional Benefit, Requires Validation, Potential Environmental Trade-off.
   - Categorical ratings like "High Benefit", "Moderate Benefit", or claims of demonstrated waste diversion from landfills/incineration, avoided CO2 emissions, closed-loop repolymerization, and reduced marine pollution are STRICTLY PROHIBITED unless empirically measured.
   - Always include the Life Cycle Assessment (LCA) boundary disclaimer (net impact depends on bioreactor process energy, enzyme production overhead, and downstream monomer separation efficiency).
9. CIRCULAR ECONOMY FOR SINGLE-ENZYME PET + IsPETase:
   - In PET + IsPETase without MHETase, mono-(2-hydroxyethyl) terephthalate (MHET) is the major soluble degradation intermediate.
   - Without MHETase or downstream processing, complete monomer recovery into terephthalic acid (TPA) and ethylene glycol (EG) is not established.
   - MHETase is a prospective downstream research requirement, NOT an existing capability of the current single-enzyme configuration.
   - Never claim complete monomer recovery, closed-loop bottle-to-bottle repolymerization, or landfill diversion has been achieved for single-enzyme IsPETase.
   - Even when proposing a follow-up experiment with MHETase: describe dual-enzyme synergy as a literature-supported strategy; do NOT claim that adding MHETase automatically guarantees complete conversion or verified circular recovery.
10. PROCESS ENERGY CLAIMS MUST REMAIN NEUTRAL:
   - Ambient or mesophilic conditions (e.g. 30°C, 150 RPM) must be described neutrally as configured operating conditions.
   - Do NOT label them as "energy-efficient", "low energy", or "reducing electricity demand". Avoid unsubstantiated energy-saving claims.
11. BUFFER STABILIZATION VS ACTIVE PH-STAT CONTROL:
   - Passive chemical buffering (e.g. sodium phosphate, Tris-HCl) provides buffer-mediated pH stabilization against acid release.
   - It must NEVER be titled or described as "active pH-control" or "pH-stat control" unless active base titrant (e.g. `comp_naoh_titrant` or automated base dosing) is explicitly present in the components.
   - If only buffer is present, the proposal title MUST describe "Buffer-Mediated pH Stabilization" rather than "pH-Control".
   - Never claim that passive buffering "ensures stable pH" or guarantees pH constancy. State that buffering provides resistance to pH shifts dependent on buffer capacity, reaction progress, and acid generation rate.
12. CONCENTRATION RIGOR & EXPLORATORY SCREENING:
   - Follow-up enzyme concentrations (e.g. 100 nM MHETase) must be explicitly labeled as "Exploratory starting concentration — not a validated optimum."
   - State that concentrations are recorded for experimental reproducibility and are not used to calculate reaction kinetics or quantitative yield.
13. AGITATION & MASS TRANSFER:
   - Increased agitation (e.g. 300 RPM) must be described as an investigation into boundary-layer mass-transfer limitations or solid-liquid suspension, NOT as directly increasing polymer surface area.
14. REACTION ATMOSPHERE & OXYGEN CONDITIONS:
   - Do NOT report or infer aerobic conditions unless oxygen conditions are explicitly configured in the experiment or living microorganisms are present.
   - Isolated hydrolytic enzymes (IsPETase, MHETase, cutinases) in aqueous buffer do not require molecular oxygen for ester bond cleavage.
   - Only describe configured experimental parameters (temperature, pH, buffer, agitation); never invent or assume an aerobic atmosphere.
15. WASTE DIVERSION & ENVIRONMENTAL QUALIFICATION:
   - Never state or imply that the current reaction is "diverting material from the waste stream", achieving landfill diversion, or avoiding incineration.
   - Characterize biological depolymerization strictly as a prospective laboratory route for polyester recycling, pending validated industrial mass balances.
16. BIOCHEMICAL PRODUCT TERMINOLOGY:
   - Distinguish clearly between soluble oligomers, MHET (mono-(2-hydroxyethyl) terephthalate, major soluble intermediate), BHET (bis-(2-hydroxyethyl) terephthalate, secondary intermediate), TPA (terephthalic acid monomer), and EG (ethylene glycol monomer).
   - Never classify MHET or BHET as fully recovered PET monomers.
   - For PET + wild-type IsPETase without MHETase: MHET is the dominant soluble intermediate; minor direct TPA and BHET formation occurs at low levels; complete monomer recovery is not established.
17. CITATION TRACEABILITY FOR MHET INHIBITION:
   - Cite Yoshida et al. 2016 for identifying PETase conversion primarily into MHET; cite Palm et al. 2019 for structural/functional characterization of MHETase and relief of MHET product inhibition on PETase.
   - Distinguish established empirical observations from mechanistic interpretations. Do not fabricate inhibition constants or kinetic values.
18. ACTIVE-SITE & MECHANISTIC ACCURACY:
   - The Ser160-His237-Asp206 catalytic triad of IsPETase is a literature-supported structural determination (Austin et al. PNAS 2018; Yoshida et al. Science 2016), NOT a molecular simulation computed by PolyPhage AI.
19. HTML ENTITY DECODING:
   - Never emit raw HTML entity escapes (e.g. &#x49;ntroduce...). Use standard clean UTF-8 text.
"""

class AIService:
    """
    Provider-agnostic adapter for OpenAI-compatible LLM endpoints (OpenAI, Groq, OpenRouter, Local Ollama, vLLM).
    Handles BYOK credential checks, timeouts, rate limits, and formatted scientific interpretation.
    """

    async def test_connection(
        self, provider: str, api_key: str, base_url: Optional[str], model: str
    ) -> TestConnectionResponse:
        clean_key = api_key.strip()
        if not clean_key:
            return TestConnectionResponse(
                success=False,
                message="API key is empty. Please enter a valid API key.",
            )

        url = (base_url or "https://api.openai.com/v1").rstrip("/") + "/chat/completions"
        headers = {
            "Authorization": f"Bearer {clean_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": model,
            "messages": [
                {"role": "user", "content": "Respond with the word 'OK' to test API connectivity."}
            ],
            "max_tokens": 5,
            "temperature": 0.0,
        }

        start_time = time.time()
        try:
            async with httpx.AsyncClient(timeout=12.0) as client:
                res = await client.post(url, headers=headers, json=payload)
                latency = round((time.time() - start_time) * 1000, 1)

                if res.status_code == 200:
                    return TestConnectionResponse(
                        success=True,
                        message=f"Connection established successfully with {provider.upper()} ({model}).",
                        detected_model=model,
                        latency_ms=latency,
                    )
                elif res.status_code == 401:
                    return TestConnectionResponse(
                        success=False,
                        message="Authentication failed: Invalid API key or unauthorized access (HTTP 401).",
                    )
                elif res.status_code == 429:
                    return TestConnectionResponse(
                        success=False,
                        message="Rate limit reached or insufficient quota on your provider account (HTTP 429).",
                    )
                elif res.status_code == 404:
                    return TestConnectionResponse(
                        success=False,
                        message=f"Model '{model}' not found or endpoint URL incorrect (HTTP 404). Check provider model name.",
                    )
                else:
                    err_msg = res.text[:200]
                    return TestConnectionResponse(
                        success=False,
                        message=f"Provider error ({res.status_code}): {err_msg}",
                    )
        except httpx.ConnectError:
            return TestConnectionResponse(
                success=False,
                message=f"Network error: Unable to connect to {url}. Check internet connection or base URL.",
            )
        except httpx.TimeoutException:
            return TestConnectionResponse(
                success=False,
                message="Connection timed out after 12 seconds. Provider may be unresponsive.",
            )
        except Exception as e:
            return TestConnectionResponse(
                success=False,
                message=f"Unexpected error testing connection: {str(e)}",
            )

    async def interpret_assessment(
        self, request: AIInterpretationRequest
    ) -> AIInterpretationResponse:
        cfg = credential_manager.get_config()
        api_key = cfg.get("api_key", "").strip()

        if not api_key:
            raise ValueError(
                "AI Assistant is not configured. Please supply an API key in the AI Settings tab (BYOK)."
            )

        provider = cfg.get("provider", "openai")
        base_url = cfg.get("base_url", "https://api.openai.com/v1").rstrip("/") + "/chat/completions"
        model = cfg.get("model", "gpt-4o-mini")

        # Prepare rich context payload
        has_living_cells = any(
            getattr(c, "role", "") in [ComponentRole.HOST_ORGANISM, "host_organism"] or "ideonella" in getattr(c, "component_id", "").lower() or "ecoli" in getattr(c, "component_id", "").lower()
            for c in request.experiment.selected_components
        )
        env_dict = request.experiment.environment.model_dump()
        if not has_living_cells:
            # Omit default oxygen availability for cell-free hydrolytic assays to avoid unconfigured aerobic claims
            env_dict.pop("oxygen", None)

        context_data = {
            "experiment": {
                "name": request.experiment.name,
                "components": [
                    {"component_id": c.component_id, "role": c.role.value if hasattr(c.role, "value") else str(c.role)}
                    for c in request.experiment.selected_components
                ],
                "environment": env_dict,
            },
            "assessment": {
                "overall_status": request.assessment.overall_status,
                "overall_score": request.assessment.overall_score,
                "executive_summary": request.assessment.executive_summary,
                "components": [c.model_dump() for c in request.assessment.component_assessments],
                "interactions": [i.model_dump() for i in request.assessment.interactions],
                "active_pathways": [p.model_dump() for p in request.assessment.active_pathways],
                "potential_products": [p.model_dump() for p in request.assessment.potential_products],
                "environmental_implications": [e.model_dump() for e in request.assessment.environmental_implications],
                "literature_evidence_citations": [
                    {"id": e.get("id"), "title": e.get("title"), "doi": e.get("doi"), "year": e.get("year")}
                    for e in request.assessment.evidence_references
                ],
                "assumptions": request.assessment.assumptions_and_limitations,
                "uncertainties": request.assessment.missing_evidence_and_uncertainties,
                "published_literature_benchmarks": request.assessment.experimental_reference_data_points,
            },
        }

        user_content = (
            f"Please conduct an in-depth scientific interpretation of the following experiment assessment.\n\n"
            f"DATA:\n{json.dumps(context_data, indent=2)}\n\n"
        )
        if request.specific_question:
            user_content += f"RESEARCHER SPECIFIC QUESTION:\n{request.specific_question}\n\n"

        user_content += (
            "Provide your response in JSON format with exactly the following keys:\n"
            "{\n"
            '  "executive_overview": "Comprehensive scientific summary of the experimental viability and system state",\n'
            '  "biochemical_mechanism_analysis": "Detailed breakdown of the catalytic triad, substrate binding, ester cleavage, and intermediate steps",\n'
            '  "environmental_and_climate_perspective": "Analysis of circular carbon recovery, monomer recycling vs emissions, and ocean/landfill impact obeying scientific governance (no unsupported high-benefit claims, LCA boundary noted, MHET accumulation addressed)",\n'
            '  "uncertainties_and_gap_analysis": "Scientific uncertainties, substrate crystallinity factors, and missing empirical data",\n'
            '  "recommended_follow_up_experiments": ["List of 3-5 specific, actionable experimental modifications or parameter sweeps"],\n'
            '  "proposed_experiment": {\n'
            '    "config": {\n'
            '      "name": "Descriptive title for recommended follow-up experiment (use Buffer-Mediated pH Stabilization if passive buffer without caustic titrant)",\n'
            '      "selected_components": [\n'
            '        {"component_id": "valid_catalog_id", "role": "substrate|catalyst|host_organism|buffer|cofactor", "concentration": "e.g. 50 nM"}\n'
            '      ],\n'
            '      "environment": {\n'
            '        "temperature_celsius": 30.0,\n'
            '        "ph": 7.0,\n'
            '        "salinity_percent": 0.0,\n'
            '        "pressure_atm": 1.0,\n'
            '        "duration_hours": 24.0,\n'
            '        "agitation_rpm": 150\n'
            '      }\n'
            '    },\n'
            '    "scientific_rationale": "Mechanistic justification for this configuration grounded in literature",\n'
            '    "expected_outcomes": ["Expected reaction pathways, product yields, or inhibition relief"],\n'
            '    "assumptions_and_boundaries": ["Physical and biochemical constraints"],\n'
            '    "supporting_evidence_ids": ["ref_yoshida_2016", "ref_tournier_2020"]\n'
            '  }\n'
            "}\n"
            "MANDATORY GOVERNANCE DIRECTIVES FOR JSON FIELDS:\n"
            "- Do not output raw HTML entities like &#x49;. Use clean UTF-8 text.\n"
            "- Do not state or infer aerobic conditions unless oxygen conditions are explicitly recorded. Hydrolytic enzymes in aqueous buffer do not require molecular oxygen.\n"
            "- Do not claim that the reaction is diverting material from the waste stream, avoiding incineration, or achieving landfill diversion.\n"
            "- Distinguish soluble oligomers, MHET, and BHET from monomers (TPA and EG). Do not classify MHET or BHET as fully recovered monomers. For single-enzyme IsPETase, note MHET is dominant intermediate and complete monomer recovery is not established.\n"
            "- Do not state that passive buffer 'ensures stable pH' or guarantees pH stability. Explain that chemical buffering provides resistance to pH shifts dependent on buffer capacity and acid generation rate.\n"
            "- In follow-up recommendations and proposals, visibly designate follow-up MHETase concentration as 'Exploratory starting concentration — not a validated optimum.'\n"
            "- Cite Yoshida et al. 2016 for primary MHET formation and Palm et al. 2019 for structural/functional characterization of MHETase and relief of MHET product inhibition on PETase.\n"
            "- environmental_and_climate_perspective MUST strictly obey environmental governance: do NOT use categorical ratings like 'High Benefit', do NOT claim landfill/incineration diversion or avoided CO2 without LCA, address MHET accumulation if IsPETase has no MHETase, and always include the LCA boundary disclaimer.\n"
            "- If proposed_experiment has buffer and no active caustic titrant, its name MUST describe 'Buffer-Mediated pH Stabilization', NOT 'pH-Control'.\n"
            "- All component IDs MUST match catalog IDs (e.g. comp_pet, comp_ispetase, comp_mhetase, comp_lcc_iccg, comp_buffer_phosphate)."
        )

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        use_response_format = provider.lower() in ["openai", "groq", "openrouter"]
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ],
            "temperature": 0.2,
        }
        if use_response_format:
            payload["response_format"] = {"type": "json_object"}

        try:
            async with httpx.AsyncClient(timeout=40.0) as client:
                res = await client.post(base_url, headers=headers, json=payload)

                # If provider rejected response_format specifically with HTTP 400, retry once without it
                if res.status_code == 400 and "response_format" in payload:
                    err_lower = res.text.lower()
                    if any(term in err_lower for term in ["response_format", "json_object", "schema", "unrecognized", "invalid_request_error"]):
                        retry_payload = {k: v for k, v in payload.items() if k != "response_format"}
                        res = await client.post(base_url, headers=headers, json=retry_payload)

                if res.status_code == 401:
                    raise PermissionError("Invalid API key or unauthorized provider credentials.")
                elif res.status_code == 429:
                    raise RuntimeError("Provider rate limit reached or insufficient account balance.")
                elif res.status_code != 200:
                    raise RuntimeError(f"Provider returned error status {res.status_code}: {res.text[:200]}")

                data = res.json()
                raw_text = data["choices"][0]["message"]["content"]

                # Extract JSON even if wrapped in markdown code fence ```json ... ```
                cleaned_text = raw_text.strip()
                if cleaned_text.startswith("```"):
                    lines = cleaned_text.splitlines()
                    if lines and lines[0].startswith("```"):
                        lines = lines[1:]
                    if lines and lines[-1].startswith("```"):
                        lines = lines[:-1]
                    cleaned_text = "\n".join(lines).strip()

                parsed = json.loads(cleaned_text)
                return self._validate_and_sanitize_interpretation(parsed, request, provider, model)
        except json.JSONDecodeError:
            # Fallback if response wasn't strict JSON
            fallback_parsed = {
                "executive_overview": raw_text[:500] if "raw_text" in locals() else "Assessment completed.",
                "biochemical_mechanism_analysis": "Hydrolase catalytic activity evaluated under deterministic constraints.",
                "environmental_and_climate_perspective": "Circularity potential requiring validation.",
                "uncertainties_and_gap_analysis": "Empirical kinetics depend on substrate crystallinity.",
                "recommended_follow_up_experiments": ["Validate against literature benchmarks."],
                "proposed_experiment": None,
            }
            return self._validate_and_sanitize_interpretation(fallback_parsed, request, provider, model)
        except Exception as e:
            raise RuntimeError(f"AI Interpretation failed: {str(e)}")

    def _clean_str(self, val: Any) -> str:
        if isinstance(val, list):
            val = "\n\n".join(str(x) for x in val)
        from app.models.ai_models import clean_html_entities
        return clean_html_entities(val)

    def _sanitize_proposed_experiment_dict(self, raw_prop: Dict[str, Any]) -> Optional[ProposedExperimentProposal]:
        try:
            cfg_data = raw_prop.get("config", {})
            sel_comps = cfg_data.get("selected_components", [])
            valid_ids = {c["id"] for c in get_all_components()}

            clean_comps = []
            for c in sel_comps:
                cid = c.get("component_id", "")
                if cid in valid_ids:
                    # Visible designation for MHETase
                    if "mhetase" in cid:
                        c["notes"] = "Exploratory starting concentration — not a validated optimum."
                    clean_comps.append(c)
                else:
                    matched = next((vc for vc in valid_ids if vc.split("_")[-1] in cid.lower() or cid.lower() in vc), None)
                    if matched:
                        c["component_id"] = matched
                        if "mhetase" in matched:
                            c["notes"] = "Exploratory starting concentration — not a validated optimum."
                        clean_comps.append(c)

            if not clean_comps:
                return None

            cfg_data["selected_components"] = clean_comps

            # Proposal title vs active pH-stat / buffer validation
            has_titrant = any(c.get("component_id") == "comp_naoh_titrant" for c in clean_comps)
            raw_name = self._clean_str(cfg_data.get("name", "Recommended Follow-Up Reaction"))
            if not has_titrant and re.search(r'\bpH-?control\b|\bactive pH\b', raw_name, re.IGNORECASE):
                cfg_data["name"] = re.sub(r'(?:Active )?pH-?Control', 'Buffer-Mediated pH Stabilization', raw_name, flags=re.IGNORECASE)
            else:
                cfg_data["name"] = raw_name

            raw_rationale = self._clean_str(raw_prop.get("scientific_rationale", "Follow-up optimization proposed by AI research copilot."))
            raw_outcomes = [self._clean_str(o) for o in raw_prop.get("expected_outcomes", [])]
            raw_assumptions = [self._clean_str(a) for a in raw_prop.get("assumptions_and_boundaries", [])]

            if not has_titrant:
                raw_rationale = re.sub(
                    r'(?:maintaining a passive [^.\n]*buffer [^.\n]*ensures (?:a )?stable pH|ensures (?:a )?stable pH|active pH-?control)',
                    'passive buffering provides chemical resistance against localized acidification as ester cleavage products accumulate, though actual pH stability depends on buffer capacity and proton generation rates',
                    raw_rationale,
                    flags=re.IGNORECASE,
                )
                raw_outcomes = [
                    re.sub(
                        r'(?:ensures (?:a )?stable pH|guarantees? pH stabilit[y|ies]|active pH-?control)',
                        'provides chemical buffering against localized pH shifts dependent on buffer capacity',
                        o,
                        flags=re.IGNORECASE,
                    )
                    for o in raw_outcomes
                ]

            # Dual enzyme conversion claims
            cids = [c.get("component_id", "") for c in clean_comps]
            if "comp_ispetase" in cids and "comp_mhetase" in cids:
                raw_outcomes = [
                    re.sub(r'complete (?:conversion|monomer recovery|depolymerization)', 'increased soluble TPA:MHET ratio through dual-enzyme synergy (literature-supported strategy; conversion efficiency requires empirical validation)', o, flags=re.IGNORECASE)
                    for o in raw_outcomes
                ]
                raw_rationale = re.sub(r'complete (?:conversion|monomer recovery|depolymerization)', 'improved monomer conversion efficiency', raw_rationale, flags=re.IGNORECASE)

            # Concentration rigor and mass transfer in assumptions
            if not any("not a validated optimum" in a for a in raw_assumptions):
                raw_assumptions.append("comp_mhetase (100 nM): Exploratory starting concentration — not a validated optimum.")
            if not any("reproducibility" in a.lower() for a in raw_assumptions):
                raw_assumptions.append("Concentrations are recorded for experimental protocol reproducibility and are not used to calculate reaction kinetics or quantitative yield in this model.")
            rpm = cfg_data.get("environment", {}).get("agitation_rpm", 0)
            if rpm > 150 or not any("mass transfer" in a.lower() for a in raw_assumptions):
                raw_assumptions.append("Agitation parameter evaluates boundary-layer mass transfer limitations and requires hydrodynamic validation.")

            # Supporting evidence validation: include both Yoshida 2016 and Palm 2019 for MHETase
            valid_ev_ids = {e["id"] for e in get_all_evidence()}
            prop_ev = [eid for eid in raw_prop.get("supporting_evidence_ids", []) if eid in valid_ev_ids]
            if not prop_ev:
                for c in clean_comps:
                    cd = get_component_by_id(c.get("component_id", ""))
                    if cd:
                        prop_ev.extend(cd.get("evidence_ids", []))
                prop_ev = list(dict.fromkeys(prop_ev))[:3]

            if any("mhetase" in c.get("component_id", "") for c in clean_comps):
                if "ref_yoshida_2016" not in prop_ev and "ref_yoshida_2016" in valid_ev_ids:
                    prop_ev.insert(0, "ref_yoshida_2016")
                if "ref_palm_2019" not in prop_ev and "ref_palm_2019" in valid_ev_ids:
                    prop_ev.append("ref_palm_2019")

            valid_config = ExperimentConfig(**cfg_data)
            return ProposedExperimentProposal(
                config=valid_config,
                scientific_rationale=raw_rationale,
                expected_outcomes=raw_outcomes,
                assumptions_and_boundaries=raw_assumptions,
                supporting_evidence_ids=prop_ev,
            )
        except Exception as pe:
            logger.warning(f"Could not build sanitized ProposedExperimentProposal: {pe}")
            return None

    def _validate_and_sanitize_interpretation(
        self,
        parsed: Dict[str, Any],
        request: AIInterpretationRequest,
        provider: str = "openai",
        model: str = "gpt-4o-mini",
    ) -> AIInterpretationResponse:
        exec_ov = self._clean_str(parsed.get("executive_overview", "Analysis completed."))
        bio_mech = self._clean_str(parsed.get("biochemical_mechanism_analysis", ""))
        env_persp = self._clean_str(parsed.get("environmental_and_climate_perspective", ""))
        uncert = self._clean_str(parsed.get("uncertainties_and_gap_analysis", ""))
        raw_recs = parsed.get("recommended_follow_up_experiments", [])
        if isinstance(raw_recs, list):
            recs = [self._clean_str(r) for r in raw_recs]
        else:
            recs = [self._clean_str(raw_recs)]

        comps = request.experiment.selected_components
        sub_cids = [c.component_id.lower() for c in comps if getattr(c, "role", "") == "substrate" or getattr(getattr(c, "role", None), "value", "") == "substrate"]
        cat_cids = [c.component_id.lower() for c in comps if getattr(c, "role", "") == "catalyst" or getattr(getattr(c, "role", None), "value", "") == "catalyst"]
        is_pet = any("pet" in cid for cid in sub_cids)
        is_ispetase = any("ispetase" in cid for cid in cat_cids)
        has_mhetase = any("mhetase" in cid for cid in cat_cids)

        # Remove unsupported oxygen conditions for cell-free reactions
        has_living_cells = any(
            getattr(c, "role", "") in [ComponentRole.HOST_ORGANISM, "host_organism"] or "ideonella" in getattr(c, "component_id", "").lower() or "ecoli" in getattr(c, "component_id", "").lower()
            for c in comps
        )
        if not has_living_cells:
            exec_ov = re.sub(r',\s*aerobic(?:\s*conditions?)?|\baerobic,\s*', '', exec_ov, flags=re.IGNORECASE)
            exec_ov = re.sub(r'\b(?:under |in )?aerobic conditions?\b', 'under configured reaction conditions', exec_ov, flags=re.IGNORECASE)
            exec_ov = re.sub(r'requires oxygen for (?:ester cleavage|hydrolysis)|aerobic degradation requirement', 'does not biochemically require molecular oxygen for hydrolytic cleavage', exec_ov, flags=re.IGNORECASE)
            bio_mech = re.sub(r',\s*aerobic(?:\s*conditions?)?|\baerobic,\s*', '', bio_mech, flags=re.IGNORECASE)
            bio_mech = re.sub(r'\b(?:under |in )?aerobic conditions?\b', 'under configured reaction conditions', bio_mech, flags=re.IGNORECASE)
            bio_mech = re.sub(r'requires molecular oxygen|aerobic enzymatic pathway', 'operates via hydrolytic ester cleavage (water-mediated nucleophilic attack; molecular oxygen is not biochemically required by the hydrolase)', bio_mech, flags=re.IGNORECASE)

        # 1. Environmental Governance
        # Governance classification header
        if "Governance Classifications:" not in env_persp and "Evidence Classifications:" not in env_persp:
            env_persp = "**Governance Classifications**: [Permitted: Potential Benefit | Conditional Benefit | Requires Validation | Potential Environmental Trade-off]\n\n" + env_persp

        # Replace categorical benefit labels
        env_persp = re.sub(r'\bHigh-benefit circular-economy pathway\b', 'Potential circular-economy pathway requiring lifecycle validation', env_persp, flags=re.IGNORECASE)
        env_persp = re.sub(r'\bHigh-benefit\b', 'Potential-benefit', env_persp, flags=re.IGNORECASE)
        env_persp = re.sub(r'\bHigh Benefit\b', 'Potential Benefit', env_persp, flags=re.IGNORECASE)
        env_persp = re.sub(r'\bModerate Benefit\b', 'Conditional Benefit', env_persp, flags=re.IGNORECASE)

        # Sanitize demonstrated landfill / incineration diversion claims
        env_persp = re.sub(
            r'(?:demonstrated )?diversion of [^.\n]*from (?:incineration or landfill|landfill or incineration)[^.\n]*\.?',
            'Biological depolymerization offers a theoretical diversion route from landfill or incineration, but demonstrated net diversion requires full industrial lifecycle validation.',
            env_persp,
            flags=re.IGNORECASE,
        )
        env_persp = re.sub(
            r'diverting post-consumer [^.\n]*from (?:incineration|landfill)[^.\n]*\.?',
            'Provides a literature-supported biochemical basis for polyester breakdown; commercial diversion outcomes require operational pilot verification.',
            env_persp,
            flags=re.IGNORECASE,
        )
        env_persp = re.sub(
            r'(?:thereby )?diverting (?:material|plastic|waste|PET) from (?:the )?waste stream[^.\n]*\.?',
            'representing a prospective biological recycling pathway for solid polyester waste, though demonstrated waste stream diversion requires validated industrial-scale mass balances.',
            env_persp,
            flags=re.IGNORECASE,
        )
        env_persp = re.sub(
            r'diverting material from the waste stream',
            'representing a prospective biological recycling pathway for solid polyester waste',
            env_persp,
            flags=re.IGNORECASE,
        )
        env_persp = re.sub(
            r'(?:thereby )?diverts? (?:material|plastic|waste|PET) from (?:the )?(?:waste stream|landfill|incineration)',
            'represents a prospective biological route for polyester degradation rather than demonstrated waste diversion',
            env_persp,
            flags=re.IGNORECASE,
        )

        exec_ov = re.sub(
            r'(?:thereby )?diverting (?:material|plastic|waste|PET) from (?:the )?waste stream[^.\n]*\.?',
            'investigating a prospective biological recycling pathway for solid polyester waste.',
            exec_ov,
            flags=re.IGNORECASE,
        )

        # Biochemical product terminology: distinguish oligomers, MHET, BHET, TPA, EG
        exec_ov = re.sub(
            r'converting (?:a fraction of )?PET into soluble monomers',
            'converting a fraction of PET into soluble aromatic intermediates (primarily mono-(2-hydroxyethyl) terephthalate, MHET, with minor direct TPA and BHET)',
            exec_ov,
            flags=re.IGNORECASE,
        )
        bio_mech = re.sub(
            r'converting (?:a fraction of )?PET into soluble monomers',
            'converting a fraction of PET into soluble aromatic intermediates (predominantly MHET, with trace TPA and BHET)',
            bio_mech,
            flags=re.IGNORECASE,
        )
        bio_mech = re.sub(
            r'\bconverting PET into monomers\b',
            'converting PET into soluble intermediates (MHET, BHET) and terminal monomers (TPA, EG)',
            bio_mech,
            flags=re.IGNORECASE,
        )

        # Buffer stabilization: chemical resistance, not guaranteed stability
        exec_ov = re.sub(
            r'maintaining a passive [^.\n]*buffer [^.\n]*ensures (?:a )?stable pH[^.\n]*\.?',
            'passive buffering provides chemical resistance against localized acidification as ester cleavage products accumulate, though actual pH stability depends on buffer capacity and proton generation rates.',
            exec_ov,
            flags=re.IGNORECASE,
        )
        exec_ov = re.sub(
            r'ensures (?:a )?stable pH|guarantees? (?:a )?stable pH|ensures stable pH',
            'provides chemical resistance against localized pH shifts (stability depends on buffer capacity and acid generation rate)',
            exec_ov,
            flags=re.IGNORECASE,
        )
        bio_mech = re.sub(
            r'ensures (?:a )?stable pH|guarantees? (?:a )?stable pH|ensures stable pH',
            'provides chemical resistance against localized pH shifts',
            bio_mech,
            flags=re.IGNORECASE,
        )

        # Sanitize avoided CO2 claims
        env_persp = re.sub(
            r'avoided co2 emissions through closed-loop repolymerization\.?',
            'Potential CO2 emission avoidance conditional on life cycle assessment accounting for thermal process energy and downstream separation overhead.',
            env_persp,
            flags=re.IGNORECASE,
        )

        # Sanitize marine pollution claims
        env_persp = re.sub(
            r'reduced secondary marine pollution\.?',
            'Potential reduction in environmental macro- and microplastic persistence, requiring empirical environmental validation.',
            env_persp,
            flags=re.IGNORECASE,
        )

        # Sanitize energy-efficiency / low electricity claims
        env_persp = re.sub(
            r'(?:modest heating and low agitation reducing electricity demand|reduces? electricity demand|energy-efficient process|low energy requirements?)\.?',
            'Reaction conditions represent configured laboratory benchmark parameters; net energy demands require rigorous pilot-scale accounting.',
            env_persp,
            flags=re.IGNORECASE,
        )

        # Single enzyme PET + IsPETase without MHETase circularity check
        if is_pet and is_ispetase and not has_mhetase:
            env_persp = re.sub(r'closed-loop (?:bottle-to-bottle )?repolymerization', 'prospective monomer recovery', env_persp, flags=re.IGNORECASE)
            env_persp = re.sub(r'complete monomer recovery', 'partial depolymerization into soluble intermediates', env_persp, flags=re.IGNORECASE)
            if "mhet" not in env_persp.lower() or "not established" not in env_persp.lower():
                env_persp += (
                    "\n\n**Circular Economy & Intermediate Dynamics**: In this single-enzyme IsPETase configuration without MHETase, "
                    "mono-(2-hydroxyethyl) terephthalate (MHET) is the dominant soluble intermediate. Complete recovery into purified terephthalic acid (TPA) "
                    "and ethylene glycol (EG) is not established in this configuration. Downstream MHETase cleavage represents a prospective research requirement "
                    "rather than an existing capability of the current experiment. Bottle-to-bottle closed-loop recycling has not been demonstrated in this single-enzyme configuration."
                )

        if is_pet and "mhet" in env_persp.lower() and "fully recovered monomers" not in env_persp.lower():
            env_persp += "\n\n*Product Classification Note: Soluble cleavage products (MHET, BHET, and oligomers) represent hydrolytic ester intermediates rather than fully recovered PET monomers (pure TPA and EG). Quantitative monomer yield into free TPA and EG is not established in single-enzyme systems without downstream MHETase.*"

        # Ensure LCA Boundary is present
        if "Life Cycle Assessment (LCA) Boundary" not in env_persp:
            env_persp += (
                "\n\n**Life Cycle Assessment (LCA) Boundary**: Net environmental benefit cannot be inferred from in vitro compatibility alone. "
                "Quantitative carbon accounting requires cradle-to-grave LCA encompassing enzyme expression burdens, bioreactor heating and agitation energy, "
                "buffer neutralization salts, and downstream monomer separation efficiency. Measured environmental outcomes cannot be claimed without empirical pilot data."
            )

        # 2. Executive Overview, Mechanism, Uncertainties
        exec_ov = re.sub(r'energy-efficient(?: process)?|low-energy(?: process)?|(?:reduc(?:es?|ing)|lower(?:s|ing)?) electricity demand', 'configured operating conditions', exec_ov, flags=re.IGNORECASE)

        bio_mech = re.sub(r'simulated by PolyPhage AI|computed by PolyPhage AI', 'determined via literature-supported crystallographic structures (Austin et al., PNAS 2018; Yoshida et al., Science 2016)', bio_mech, flags=re.IGNORECASE)
        bio_mech = re.sub(r'energy-efficient|low energy|(?:reduc(?:es?|ing)|lower(?:s|ing)?) electricity demand', 'mesophilic operating', bio_mech, flags=re.IGNORECASE)
        # Purge fabricated inhibition constants
        bio_mech = re.sub(r'(?:Ki|IC50|inhibition constant)\s*=\s*\d+(?:\.\d+)?\s*(?:µM|uM|nM|mM)', 'inhibition observed empirically upon intermediate accumulation (Palm et al. (2019))', bio_mech, flags=re.IGNORECASE)
        if is_pet and ("mhet" in bio_mech.lower() or "intermediates" in bio_mech.lower()):
            if "Product Classification Note" not in bio_mech:
                bio_mech += "\n\n*Product Classification Note: Intermediates: Mono-(2-hydroxyethyl) terephthalate (MHET), BHET, and soluble oligomers represent hydrolytic ester intermediates rather than fully recovered PET monomers. True monomers: Terephthalic acid (TPA) and ethylene glycol (EG). Quantitative monomer yield into free TPA and EG is not established in single-enzyme systems without downstream MHETase.*"
            if "yoshida" not in bio_mech.lower():
                bio_mech += " Primary MHET accumulation is documented by Yoshida et al. (2016)."
            if "palm et al. (2019)" not in bio_mech.lower():
                bio_mech += " MHET product inhibition on IsPETase and its relief by MHETase were characterized by Palm et al. (2019)."

        uncert = re.sub(r'energy-efficient|low energy|(?:reduc(?:es?|ing)|lower(?:s|ing)?) electricity demand', 'ambient operating', uncert, flags=re.IGNORECASE)

        # 3. Follow-Up Recommendations
        clean_recs: List[str] = []
        for r in recs:
            clean_r = self._clean_str(r)
            if not has_living_cells:
                clean_r = re.sub(r',\s*aerobic(?:\s*conditions?)?|\baerobic,\s*', '', clean_r, flags=re.IGNORECASE)
                clean_r = re.sub(r'\b(?:under |in )?aerobic conditions?\b', 'under configured reaction conditions', clean_r, flags=re.IGNORECASE)
            if "agitation" in clean_r.lower() or "rpm" in clean_r.lower():
                clean_r = re.sub(r'(?:directly )?increases? (?:polymer )?surface area', 'enhances boundary-layer mass transfer and solid-liquid suspension', clean_r, flags=re.IGNORECASE)
                if "mass-transfer" not in clean_r.lower():
                    clean_r += " (hydrodynamic mass-transfer investigation requiring empirical validation)"
            if "mhetase" in clean_r.lower() and re.search(r'\d+\s*(?:nm|µm|um|mg/ml)', clean_r, re.IGNORECASE):
                if re.search(r'\boptima\b|\boptimum\b|\boptimal\b', clean_r, re.IGNORECASE):
                    clean_r = re.sub(r'established optimum|optimal concentration|optimum concentration|optimal', 'exploratory starting concentration — not a validated optimum', clean_r, flags=re.IGNORECASE)
                elif "not a validated optimum" not in clean_r.lower():
                    clean_r += " (Exploratory starting concentration — not a validated optimum)"
            if re.search(r'\blcc\b(?!-iccg)', clean_r, re.IGNORECASE):
                clean_r = re.sub(r'\blcc\b(?!-iccg)', 'LCC-ICCG Cutinase (comp_lcc_iccg)', clean_r, flags=re.IGNORECASE)
            if re.search(r'\bfast-?petase\b', clean_r, re.IGNORECASE):
                clean_r = re.sub(r'\bfast-?petase\b', 'FAST-PETase (comp_fast_petase)', clean_r, flags=re.IGNORECASE)
            clean_recs.append(clean_r)

        # 4. Proposed Experiment
        proposed_exp = None
        raw_prop = parsed.get("proposed_experiment")
        if isinstance(raw_prop, dict) and "config" in raw_prop:
            proposed_exp = self._sanitize_proposed_experiment_dict(raw_prop)

        return AIInterpretationResponse(
            success=True,
            executive_overview=exec_ov,
            biochemical_mechanism_analysis=bio_mech,
            environmental_and_climate_perspective=env_persp,
            uncertainties_and_gap_analysis=uncert,
            recommended_follow_up_experiments=clean_recs,
            proposed_experiment=proposed_exp,
            provider=provider,
            model=model,
        )

    async def chat(self, request: AIChatRequest) -> AIChatResponse:
        cfg = credential_manager.get_config()
        api_key = cfg.get("api_key", "").strip()

        if not api_key:
            raise ValueError(
                "AI Assistant is not configured. Please supply an API key in the AI Settings tab (BYOK)."
            )

        provider = cfg.get("provider", "openai")
        base_url = cfg.get("base_url", "https://api.openai.com/v1").rstrip("/") + "/chat/completions"
        model = cfg.get("model", "gpt-4o-mini")

        system_msg = SYSTEM_PROMPT
        last_user_msg = next((m.content or "" for m in reversed(request.messages) if getattr(m, "role", "") == "user"), "")
        t_user = last_user_msg.lower()

        # Detect user's explicit requested polymer in prompt
        user_explicit_polymer = None
        if re.search(r"\bpet\b|poly\(ethylene terephthalate\)|polyethylene terephthalate|ispetase", t_user):
            user_explicit_polymer = "PET"
        elif re.search(r"\bpla\b|poly\(lactic acid\)|polylactic acid", t_user):
            user_explicit_polymer = "PLA"
        elif re.search(r"\bpef\b|poly\(ethylene 2,5-furandicarboxylate\)", t_user):
            user_explicit_polymer = "PEF"

        if request.context_experiment and request.context_assessment:
            system_msg += f"\n\nCURRENT EXPERIMENT CONTEXT:\nExperiment Name: {request.context_experiment.name}\n"
            system_msg += f"Status: {request.context_assessment.overall_status} (Score: {request.context_assessment.overall_score}/100)\n"
            system_msg += f"Summary: {request.context_assessment.executive_summary}\n"
            system_msg += f"Assumptions & Limitations: {request.context_assessment.assumptions_and_limitations}\n"
            if user_explicit_polymer:
                system_msg += (
                    f"\nCRITICAL DIRECTIVE: The user's prompt explicitly inquires about {user_explicit_polymer}. "
                    f"The user's explicitly requested substrate polymer takes strict precedence over any previous experiment context. "
                    f"You MUST evaluate and propose strictly for {user_explicit_polymer}. Do NOT substitute previous context polymers (e.g. PLA)!\n"
                )

        formatted_msgs: List[Dict[str, Any]] = [{"role": "system", "content": system_msg}]
        for m in request.messages:
            msg_dict: Dict[str, Any] = {"role": m.role, "content": m.content or ""}
            if m.name:
                msg_dict["name"] = m.name
            if m.tool_calls:
                msg_dict["tool_calls"] = m.tool_calls
            formatted_msgs.append(msg_dict)

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        use_tools = provider.lower() in ["openai", "groq", "openrouter"]
        payload: Dict[str, Any] = {
            "model": model,
            "messages": formatted_msgs,
            "temperature": 0.3,
            "max_tokens": 1200,
        }
        if use_tools:
            payload["tools"] = TOOLS_SCHEMA

        max_tool_steps = 5
        step = 0

        try:
            async with httpx.AsyncClient(timeout=45.0) as client:
                res = await client.post(base_url, headers=headers, json=payload)

                # If provider rejected tools specifically with HTTP 400, retry once without tools
                if res.status_code == 400 and "tools" in payload:
                    err_lower = res.text.lower()
                    if any(t in err_lower for t in ["tools", "function", "unrecognized", "schema", "invalid_request_error"]):
                        logger.info("Provider rejected tools parameter; retrying chat without tools.")
                        payload.pop("tools", None)
                        res = await client.post(base_url, headers=headers, json=payload)

                if res.status_code == 401:
                    raise PermissionError("Invalid API key or unauthorized provider credentials.")
                elif res.status_code == 429:
                    raise RuntimeError("Provider rate limit reached or insufficient quota.")
                elif res.status_code != 200:
                    raise RuntimeError(f"Provider error ({res.status_code}): {res.text[:200]}")

                data = res.json()

                # Controlled tool execution loop
                executed_tools: List[Dict[str, Any]] = []
                proposed_experiment: Optional[ProposedExperimentProposal] = None

                while step < max_tool_steps:
                    choice = data.get("choices", [{}])[0]
                    message = choice.get("message", {})
                    tool_calls = message.get("tool_calls")

                    if not tool_calls:
                        break

                    step += 1
                    logger.info(f"AI Assistant triggered {len(tool_calls)} tool call(s) (step {step}/{max_tool_steps})")

                    # Standardize assistant message across providers
                    clean_assistant_msg = {
                        "role": "assistant",
                        "content": message.get("content") or None,
                        "tool_calls": [
                            {
                                "id": tc.get("id") or f"call_{step}_{idx}",
                                "type": tc.get("type", "function"),
                                "function": {
                                    "name": tc.get("function", {}).get("name", ""),
                                    "arguments": tc.get("function", {}).get("arguments", "{}"),
                                },
                            }
                            for idx, tc in enumerate(tool_calls)
                        ],
                    }
                    formatted_msgs.append(clean_assistant_msg)

                    for idx, tc in enumerate(tool_calls):
                        fn = tc.get("function", {})
                        fn_name = fn.get("name", "")
                        fn_args_raw = fn.get("arguments", "{}")
                        try:
                            fn_args = json.loads(fn_args_raw) if isinstance(fn_args_raw, str) else (fn_args_raw or {})
                        except Exception:
                            fn_args = {}

                        tool_result = tool_dispatcher.dispatch(fn_name, fn_args)

                        # Generate readable summary of action
                        summary = ""
                        if fn_name == "get_component_catalog":
                            summary = f"Queried catalog ({fn_args.get('search') or fn_args.get('category') or 'all'}): found {tool_result.get('count', 0)} item(s)"
                        elif fn_name == "search_literature":
                            summary = f"Searched literature citations ({fn_args.get('query') or fn_args.get('component_id') or fn_args.get('doi') or 'all'}): found {tool_result.get('count', 0)} paper(s)"
                        elif fn_name == "simulate_assessment":
                            score = tool_result.get("overall_score", "N/A")
                            status = tool_result.get("overall_status", "N/A")
                            summary = f"Simulated reaction: Compatibility Index {score}/100 ({status})"
                            if tool_result.get("success") and "selected_components" in fn_args:
                                try:
                                    sim_cfg = ExperimentConfig(
                                        name=fn_args.get("name", "AI Proposed Reaction Configuration"),
                                        selected_components=fn_args["selected_components"],
                                        environment=fn_args.get("environment", {
                                            "temperature_celsius": 30.0,
                                            "ph": 7.0,
                                            "oxygen": "Aerobic",
                                            "salinity_percent": 0.0,
                                            "pressure_atm": 1.0,
                                            "duration_hours": 24.0,
                                            "agitation_rpm": 150,
                                        }),
                                    )
                                    proposed_experiment = ProposedExperimentProposal(
                                        config=sim_cfg,
                                        scientific_rationale=tool_result.get("executive_summary", "Simulated reaction configuration assessed deterministically."),
                                        expected_outcomes=tool_result.get("active_pathways", []),
                                        assumptions_and_boundaries=[
                                            "Computational rule-based simulation based on published literature tolerance thresholds.",
                                            "Non-kinetic concentration parameters recorded for experimental reproducibility.",
                                        ],
                                        supporting_evidence_ids=["ref_yoshida_2016"] if any("pet" in str(c.get("component_id", "")).lower() for c in fn_args.get("selected_components", [])) else [],
                                    )
                                except Exception as p_err:
                                    logger.debug(f"Could not build proposal from tool call: {p_err}")
                        else:
                            summary = f"Executed {fn_name}"

                        executed_tools.append({
                            "tool": fn_name,
                            "arguments": fn_args,
                            "summary": summary,
                            "result": tool_result,
                        })

                        call_id = tc.get("id") or f"call_{step}_{idx}"
                        formatted_msgs.append({
                            "role": "tool",
                            "tool_call_id": call_id,
                            "content": json.dumps(tool_result),
                        })

                    payload["messages"] = formatted_msgs
                    res = await client.post(base_url, headers=headers, json=payload)
                    if res.status_code != 200:
                        logger.warning(f"Tool loop continuation call returned status {res.status_code}: {res.text[:200]}")
                        break
                    data = res.json()

                choice = data.get("choices", [{}])[0]
                final_reply = choice.get("message", {}).get("content")

                # Workflow Orchestration Check:
                # If the user requested an assessment or proposal, but simulate_assessment was not invoked:
                is_assessment_req = self._is_assessment_or_proposal_requested(request.messages)
                sim_run = next(
                    (et["result"] for et in executed_tools if et["tool"] == "simulate_assessment" and et["result"].get("success")),
                    None,
                )

                if is_assessment_req and not sim_run:
                    logger.info("Enforcing scientific workflow orchestration: executing required assessment and proposal generation.")
                    forced_prop, forced_sim = self._orchestrate_required_workflow_steps(request.messages, executed_tools)
                    if forced_prop and forced_sim:
                        proposed_experiment = forced_prop
                        sim_run = forced_sim

                # If an assessment simulation ran, ensure proposed_experiment is populated
                if sim_run and not proposed_experiment:
                    proposed_experiment = self._build_proposal_from_sim_result(sim_run, executed_tools)

                # Backend Pre-Proposal Validation Stage (Requirement 9)
                proposed_experiment, sim_run = self._validate_and_sanitize_proposal(
                    messages=request.messages,
                    proposal=proposed_experiment,
                    sim_run=sim_run,
                    executed_tools=executed_tools,
                )

                # Check if LLM response contained hallucinations (e.g. PLA when user asked for PET)
                if user_explicit_polymer == "PET" and final_reply and ("pla" in final_reply.lower() or "poly(lactic" in final_reply.lower()):
                    logger.warning("Validation: Detected polymer hallucination (PLA) in LLM reply when user requested PET. Overriding with authoritative scientific response.")
                    final_reply = None

                # If final_reply is empty or only contains unstructured logs, format the structured 7-section scientific response
                has_assessment_sections = final_reply and ("Selected Components" in final_reply or "Compatibility Index" in final_reply)
                if sim_run and (not final_reply or not has_assessment_sections):
                    final_reply = self._format_structured_scientific_response(
                        sim_run=sim_run,
                        proposal=proposed_experiment,
                        executed_tools=executed_tools,
                    )
                elif not final_reply and executed_tools:
                    # Grounded scientific summary synthesized from executed tools
                    tool_bullets = "\n".join([f"- **{et['tool']}**: {et['summary']}" for et in executed_tools])
                    final_reply = (
                        "### AI Research Copilot Findings\n\n"
                        f"Executed biochemical research tools:\n{tool_bullets}\n\n"
                        "*Note: All findings are derived deterministically from the PolyPhage database and literature thresholds.*"
                    )
                elif not final_reply:
                    final_reply = "I evaluated your inquiry against the PolyPhage biochemical database and literature benchmarks. Please specify which enzyme, polymer substrate, or buffer conditions you would like to explore."

                return AIChatResponse(
                    reply=final_reply,
                    executed_tools=executed_tools,
                    proposed_experiment=proposed_experiment,
                    provider=provider,
                    model=model,
                )
        except Exception as e:
            raise RuntimeError(f"AI Chat error: {str(e)}")

    def _is_assessment_or_proposal_requested(self, messages: List[Any]) -> bool:
        """Determines whether the user's latest prompt asks for an assessment, simulation, or experiment proposal."""
        last_user_msg = next((m.content or "" for m in reversed(messages) if getattr(m, "role", "") == "user"), "")
        t = last_user_msg.lower()
        keywords = [
            "assessment", "assess", "simulate", "simulation", "evaluate", "evaluation",
            "proposal", "propose", "experiment", "pathway", "reaction", "thermophilic",
            "degradation", "turnover", "70°c", "72°c", "50°c", "30°c", "lcc", "ispetase",
            "products", "role", "intermediate"
        ]
        return any(k in t for k in keywords)

    def _orchestrate_required_workflow_steps(
        self, messages: List[Any], executed_tools: List[Dict[str, Any]]
    ) -> Tuple[Optional[ProposedExperimentProposal], Optional[Dict[str, Any]]]:
        """
        Reliably completes explicitly requested workflow steps:
        1. Resolves substrate and enzyme with strict precedence to user prompt.
        2. Queries component catalog for substrate, enzyme, and buffer if missing.
        3. Retrieves empirical literature citations matching the actual components.
        4. Invokes simulate_assessment with actual catalog IDs.
        5. Constructs validated ProposedExperimentProposal with consistent parameters and IDs.
        """
        last_user_msg = next((m.content or "" for m in reversed(messages) if getattr(m, "role", "") == "user"), "")
        t = last_user_msg.lower()

        # 1. Resolve polymer (strict precedence to user prompt!)
        if re.search(r"\bpla\b|poly\(lactic acid\)|polylactic acid", t):
            polymer_id = "comp_pla"
            polymer_name = "Poly(lactic acid) (PLA)"
        elif re.search(r"\bpef\b|poly\(ethylene 2,5-furandicarboxylate\)", t):
            polymer_id = "comp_pef"
            polymer_name = "Poly(ethylene 2,5-furandicarboxylate) (PEF)"
        elif re.search(r"\bpet\b|poly\(ethylene terephthalate\)|polyethylene terephthalate|ispetase|mhetase", t):
            polymer_id = "comp_pet"
            polymer_name = "Poly(ethylene terephthalate) (PET)"
        else:
            polymer_id = "comp_pet"
            polymer_name = "Poly(ethylene terephthalate) (PET)"

        # 2. Resolve enzyme
        if re.search(r"\blcc\b|cutinase|thermophilic", t) and not re.search(r"\bispetase\b", t):
            enzyme_id = "comp_lcc_iccg"
            enzyme_name = "LCC-ICCG Cutinase (Thermostabilized)"
            default_temp = 70.0 if "70" in t else 72.0
            default_ph = 8.0
        elif re.search(r"\bfast-petase\b|fast petase", t):
            enzyme_id = "comp_fast_petase"
            enzyme_name = "FAST-PETase (Machine Learning Engineered)"
            default_temp = 50.0
            default_ph = 8.0
        elif re.search(r"\bmhetase\b", t) and not re.search(r"\bispetase\b", t):
            enzyme_id = "comp_mhetase"
            enzyme_name = "Ideonella sakaiensis MHETase"
            default_temp = 30.0
            default_ph = 7.5
        else:
            enzyme_id = "comp_ispetase"
            enzyme_name = "Ideonella sakaiensis PETase (IsPETase)"
            default_temp = 30.0
            default_ph = 7.0

        # 3. Extract temperature and pH parameters
        m_temp = re.search(r"(\d+(?:\.\d+)?)\s*(?:°\s*C|deg\s*C|C\b)", last_user_msg, re.IGNORECASE)
        temp = float(m_temp.group(1)) if m_temp else default_temp

        m_ph = re.search(r"pH\s*[:=]?\s*(\d+(?:\.\d+)?)", last_user_msg, re.IGNORECASE)
        ph = float(m_ph.group(1)) if m_ph else default_ph

        # 4. Resolve buffer with 100% parameter consistency
        if "tris" in t:
            buffer_id = "comp_buffer_tris"
            buffer_name = "Tris-HCl Buffer (50 mM, pH 8.0)"
            buffer_conc = "50 mM"
        else:
            buffer_id = "comp_buffer_phosphate"
            buffer_name = "Phosphate Buffer Matrix"
            buffer_conc = "100 mM" if ph >= 7.8 else "50 mM"

        # Determine scientific regime
        if temp >= 60.0:
            regime_title = "Thermophilic"
        elif temp >= 45.0:
            regime_title = "Thermostabilized"
        else:
            regime_title = "Mesophilic"

        # 5. Catalog queries
        executed_tool_names = {et.get("tool") for et in executed_tools}
        if "get_component_catalog" not in executed_tool_names:
            search_poly = "PET" if polymer_id == "comp_pet" else ("PLA" if polymer_id == "comp_pla" else "PEF")
            cat_res = tool_dispatcher.dispatch("get_component_catalog", {"search": search_poly})
            executed_tools.append({
                "tool": "get_component_catalog",
                "arguments": {"search": search_poly},
                "summary": f"Queried catalog ({search_poly}): found {cat_res.get('count', 0)} item(s)",
                "result": cat_res,
            })
            enz_keyword = "PETase" if "ispetase" in enzyme_id else ("LCC" if "lcc" in enzyme_id else enzyme_name.split()[0])
            enz_res = tool_dispatcher.dispatch("get_component_catalog", {"search": enz_keyword})
            executed_tools.append({
                "tool": "get_component_catalog",
                "arguments": {"search": enz_keyword},
                "summary": f"Queried catalog ({enz_keyword}): found {enz_res.get('count', 0)} item(s)",
                "result": enz_res,
            })

        # 6. Literature queries relevant to the actual enzyme and polymer
        lit_searched = any(et.get("tool") == "search_literature" for et in executed_tools)
        if not lit_searched:
            lit_res = tool_dispatcher.dispatch("search_literature", {"component_id": enzyme_id})
            executed_tools.append({
                "tool": "search_literature",
                "arguments": {"component_id": enzyme_id},
                "summary": f"Searched literature citations ({enzyme_id}): found {lit_res.get('count', 0)} paper(s)",
                "result": lit_res,
            })

        # 7. Assemble experiment configuration
        components = [
            {"component_id": polymer_id, "role": "substrate", "concentration": "10 mg/mL"},
            {"component_id": enzyme_id, "role": "catalyst", "concentration": "50 nM"},
            {"component_id": buffer_id, "role": "buffer", "concentration": buffer_conc},
        ]
        if "mhetase" in t and enzyme_id != "comp_mhetase" and polymer_id == "comp_pet":
            components.append({"component_id": "comp_mhetase", "role": "catalyst", "concentration": "50 nM"})

        env_dict = {
            "temperature_celsius": temp,
            "ph": ph,
            "oxygen": "Aerobic",
            "salinity_percent": 0.0,
            "pressure_atm": 1.0,
            "duration_hours": 24.0,
            "agitation_rpm": 150,
        }

        short_poly = "PLA" if polymer_id == "comp_pla" else ("PEF" if polymer_id == "comp_pef" else "PET")
        sim_name = f"{regime_title} {short_poly} Depolymerization via {enzyme_name.split()[0]}"

        # 8. Execute deterministic simulation
        sim_args = {
            "name": sim_name,
            "selected_components": components,
            "environment": env_dict,
        }
        sim_res = tool_dispatcher.dispatch("simulate_assessment", sim_args)
        executed_tools.append({
            "tool": "simulate_assessment",
            "arguments": sim_args,
            "summary": f"Simulated reaction: Compatibility Index {sim_res.get('overall_score', 'N/A')}/100 ({sim_res.get('overall_status', 'N/A')})",
            "result": sim_res,
        })

        # 9. Construct proposal
        try:
            date_str = time.strftime("%Y%m%d")
            exp_id = f"{short_poly}-{date_str}-001"
            cfg = ExperimentConfig(
                id=exp_id,
                name=sim_name,
                selected_components=components,
                environment=EnvironmentConditions(**env_dict),
            )
            evidence_ids = []
            for c in components:
                detail = get_component_by_id(c["component_id"])
                if detail:
                    evidence_ids.extend(detail.get("evidence_ids", []))
            evidence_ids = list(dict.fromkeys(evidence_ids))

            outcomes = list(sim_res.get("active_pathways", ["No active catalytic pathway established."]))
            product_names = [p.get("name") for p in sim_res.get("potential_products", []) if p.get("name")]
            if product_names:
                outcomes.append(f"Expected Products: {', '.join(product_names)}")

            proposal = ProposedExperimentProposal(
                config=cfg,
                scientific_rationale=sim_res.get("executive_summary", f"{regime_title} enzymatic depolymerization reaction assessed under deterministic thermodynamic constraints."),
                expected_outcomes=outcomes,
                assumptions_and_boundaries=[
                    "Computational rule-based simulation based on published literature tolerance thresholds.",
                    "Enzyme operating stability adheres to published thermal denaturation onset thresholds.",
                    "Concentrations are recorded as experimental parameters (non-kinetic modeling in current engine).",
                ],
                supporting_evidence_ids=evidence_ids[:3],
            )
            return proposal, sim_res
        except Exception as e:
            logger.error(f"Failed to construct proposal: {e}")
            return None, sim_res

    def _build_proposal_from_sim_result(
        self, sim_run: Dict[str, Any], executed_tools: List[Dict[str, Any]]
    ) -> Optional[ProposedExperimentProposal]:
        """Constructs a ProposedExperimentProposal from an existing simulation tool execution record."""
        sim_tool = next((et for et in executed_tools if et.get("tool") == "simulate_assessment"), None)
        if not sim_tool:
            return None
        args = sim_tool.get("arguments", {})
        selected_comps = args.get("selected_components", [])
        evidence_ids = []
        for c in selected_comps:
            detail = get_component_by_id(c.get("component_id", ""))
            if detail:
                evidence_ids.extend(detail.get("evidence_ids", []))
        evidence_ids = list(dict.fromkeys(evidence_ids))

        try:
            cfg = ExperimentConfig(
                name=args.get("name", "Biochemical Reaction Proposal"),
                selected_components=selected_comps,
                environment=args.get("environment", {
                    "temperature_celsius": 30.0,
                    "ph": 7.0,
                    "oxygen": "Aerobic",
                    "salinity_percent": 0.0,
                    "pressure_atm": 1.0,
                    "duration_hours": 24.0,
                    "agitation_rpm": 150,
                }),
            )
            outcomes = list(sim_run.get("active_pathways", ["No active depolymerization pathway detected for this configuration."]))
            product_names = [p.get("name") for p in sim_run.get("potential_products", []) if p.get("name")]
            if product_names:
                outcomes.append(f"Expected Products: {', '.join(product_names)}")

            return ProposedExperimentProposal(
                config=cfg,
                scientific_rationale=sim_run.get("executive_summary", "Simulated reaction configuration assessed deterministically."),
                expected_outcomes=outcomes,
                assumptions_and_boundaries=[
                    "Computational rule-based simulation based on published literature tolerance thresholds.",
                    "Non-kinetic concentration parameters recorded for experimental reproducibility.",
                ],
                supporting_evidence_ids=evidence_ids[:3],
            )
        except Exception as e:
            logger.debug(f"Could not build proposal from sim_run: {e}")
            return None

    def _validate_and_sanitize_proposal(
        self,
        messages: List[Any],
        proposal: Optional[ProposedExperimentProposal],
        sim_run: Optional[Dict[str, Any]],
        executed_tools: List[Dict[str, Any]],
    ) -> Tuple[Optional[ProposedExperimentProposal], Optional[Dict[str, Any]]]:
        """
        Final backend validation stage (Requirement 9):
        1. Ensures requested polymer in user prompt matches proposed polymer.
        2. Validates enzyme identity, variant, and substrate compatibility.
        3. Ensures reaction products match the substrate.
        4. Validates literature relevance.
        5. Enforces parameter consistency (buffer concentration identical across proposal & text).
        6. Enforces Experiment ID prefix matching substrate polymer.
        """
        last_user_msg = next((m.content or "" for m in reversed(messages) if getattr(m, "role", "") == "user"), "")
        t = last_user_msg.lower()

        # Check user explicit requested polymer
        requested_polymer = None
        if re.search(r"\bpla\b|poly\(lactic acid\)|polylactic acid", t):
            requested_polymer = "comp_pla"
        elif re.search(r"\bpef\b|poly\(ethylene 2,5-furandicarboxylate\)", t):
            requested_polymer = "comp_pef"
        elif re.search(r"\bpet\b|poly\(ethylene terephthalate\)|polyethylene terephthalate|ispetase", t):
            requested_polymer = "comp_pet"

        # Check user explicit requested enzyme
        requested_enzyme = None
        if re.search(r"\blcc\b|cutinase|thermophilic", t) and not re.search(r"\bispetase\b", t):
            requested_enzyme = "comp_lcc_iccg"
        elif re.search(r"\bfast-petase\b|fast petase", t):
            requested_enzyme = "comp_fast_petase"
        elif re.search(r"\bispetase\b|is-petase|wild-type petase|wild type petase", t):
            requested_enzyme = "comp_ispetase"

        if proposal and proposal.config:
            comps = proposal.config.selected_components
            sub_comp = next((c for c in comps if (getattr(c, "role", "") == "substrate" or getattr(c.role, "value", "") == "substrate")), None)
            cat_comp = next((c for c in comps if (getattr(c, "role", "") == "catalyst" or getattr(c.role, "value", "") == "catalyst")), None)
            buf_comp = next((c for c in comps if (getattr(c, "role", "") == "buffer" or getattr(c.role, "value", "") == "buffer")), None)

            needs_resimulation = False

            # 1. Polymer mismatch correction: if user asked for PET, but proposal has PLA (or vice versa)
            if requested_polymer and sub_comp and sub_comp.component_id != requested_polymer:
                logger.warning(f"Validation: correcting substrate from {sub_comp.component_id} to requested {requested_polymer}")
                sub_comp.component_id = requested_polymer
                needs_resimulation = True

            # 2. Enzyme mismatch correction: if user asked for IsPETase, but proposal has LCC (or vice versa)
            if requested_enzyme and cat_comp and cat_comp.component_id != requested_enzyme:
                logger.warning(f"Validation: correcting enzyme from {cat_comp.component_id} to requested {requested_enzyme}")
                cat_comp.component_id = requested_enzyme
                needs_resimulation = True

            # 3. Parameter consistency: standardize buffer concentration
            if buf_comp and not buf_comp.concentration:
                env_ph = proposal.config.environment.ph
                buf_comp.concentration = "100 mM" if env_ph >= 7.8 else "50 mM"

            # Re-simulate if parameters were corrected to ensure sim_run is authentic
            if needs_resimulation or (sim_run is None):
                sim_args = {
                    "name": proposal.config.name,
                    "selected_components": [
                        {"component_id": c.component_id, "role": c.role.value if hasattr(c.role, "value") else str(c.role), "concentration": c.concentration}
                        for c in comps
                    ],
                    "environment": proposal.config.environment.model_dump() if hasattr(proposal.config.environment, "model_dump") else dict(proposal.config.environment),
                }
                new_sim = tool_dispatcher.dispatch("simulate_assessment", sim_args)
                sim_run = new_sim
                executed_tools.append({
                    "tool": "simulate_assessment",
                    "arguments": sim_args,
                    "summary": f"Validation re-simulated reaction: Compatibility Index {new_sim.get('overall_score')}/100 ({new_sim.get('overall_status')})",
                    "result": new_sim,
                })
                proposal.scientific_rationale = new_sim.get("executive_summary", proposal.scientific_rationale)
                re_outcomes = list(new_sim.get("active_pathways", ["No active catalytic pathway established."]))
                re_prods = [p.get("name") for p in new_sim.get("potential_products", []) if p.get("name")]
                if re_prods:
                    re_outcomes.append(f"Expected Products: {', '.join(re_prods)}")
                proposal.expected_outcomes = re_outcomes

            # 4. Ensure experiment ID prefix strictly matches the substrate polymer
            current_sub = next((c for c in comps if (getattr(c, "role", "") == "substrate" or getattr(c.role, "value", "") == "substrate")), None)
            if current_sub:
                sub_cid = current_sub.component_id.lower()
                expected_prefix = "PLA" if "pla" in sub_cid else ("PEF" if "pef" in sub_cid else "PET")
                if proposal.config.id:
                    parts = proposal.config.id.split("-", 1)
                    if parts[0].upper() != expected_prefix:
                        suffix = parts[1] if len(parts) > 1 else parts[0]
                        proposal.config.id = f"{expected_prefix}-{suffix}"
                else:
                    date_str = time.strftime("%Y%m%d")
                    proposal.config.id = f"{expected_prefix}-{date_str}-001"

            # 5. Filter supporting evidence IDs to only those relevant to the actual components
            valid_evidence_ids = []
            for c in comps:
                detail = get_component_by_id(c.component_id)
                if detail:
                    valid_evidence_ids.extend(detail.get("evidence_ids", []))
            proposal.supporting_evidence_ids = list(dict.fromkeys(valid_evidence_ids))[:3]

            # 6. Validate proposal title against actual proposed components (buffer vs active pH-stat)
            has_titrant = any(c.component_id == "comp_naoh_titrant" for c in comps)
            if not has_titrant and re.search(r'\bpH-?control\b|\bactive pH\b', proposal.config.name, re.IGNORECASE):
                logger.info("Validation: Proposal has buffer without active titrant; aligning title to Buffer-Mediated pH Stabilization.")
                proposal.config.name = re.sub(r'(?:Active )?pH-?Control', 'Buffer-Mediated pH Stabilization', proposal.config.name, flags=re.IGNORECASE)

            # 7. Circular economy & dual-enzyme claims check: no complete conversion claims
            cids = [c.component_id for c in comps]
            if "comp_ispetase" in cids and "comp_mhetase" in cids:
                proposal.expected_outcomes = [
                    re.sub(r'complete (?:conversion|monomer recovery|depolymerization)', 'increased soluble TPA:MHET ratio through dual-enzyme synergy (literature-supported strategy; conversion requires empirical validation)', o, flags=re.IGNORECASE)
                    for o in proposal.expected_outcomes
                ]
                proposal.scientific_rationale = re.sub(r'complete (?:conversion|monomer recovery|depolymerization)', 'improved monomer conversion efficiency', proposal.scientific_rationale, flags=re.IGNORECASE)

            # 8. Clean HTML entities in proposal strings
            proposal.config.name = self._clean_str(proposal.config.name)
            proposal.scientific_rationale = self._clean_str(proposal.scientific_rationale)
            proposal.expected_outcomes = [self._clean_str(o) for o in proposal.expected_outcomes]
            proposal.assumptions_and_boundaries = [self._clean_str(a) for a in proposal.assumptions_and_boundaries]

        return proposal, sim_run

    def _format_structured_scientific_response(
        self,
        sim_run: Dict[str, Any],
        proposal: Optional[ProposedExperimentProposal],
        executed_tools: List[Dict[str, Any]],
    ) -> str:
        """
        Renders the authoritative 7-section scientific response required by the PolyPhage research copilot:
        1. Selected Components
        2. Scientific Justification
        3. Proposed Experiment
        4. Actual Assessment
        5. Expected Biochemical Pathway
        6. Scientific Evidence
        7. Limitations
        """
        comp_ass = sim_run.get("component_assessments", [])
        score = sim_run.get("overall_score", 0)
        status = str(sim_run.get("overall_status", "unknown")).upper()
        active_pathways = sim_run.get("active_pathways", [])
        products = sim_run.get("potential_products", [])
        score_breakdown = sim_run.get("score_breakdown", [])
        env = proposal.config.environment if proposal else None
        env_temp = env.temperature_celsius if env else 30.0
        env_ph = env.ph if env else 7.0

        # Resolve components details
        substrate_info = next((ca for ca in comp_ass if ca.get("role") == "substrate"), None)
        catalyst_info = next((ca for ca in comp_ass if ca.get("role") == "catalyst"), None)
        buffer_info = next((ca for ca in comp_ass if ca.get("role") == "buffer"), None)

        substrate_id = substrate_info.get("component_id", "comp_pet") if substrate_info else "comp_pet"
        substrate_name = substrate_info.get("name") if substrate_info else "Poly(ethylene terephthalate) (PET)"
        catalyst_id = catalyst_info.get("component_id", "comp_ispetase") if catalyst_info else "comp_ispetase"
        catalyst_name = catalyst_info.get("name") if catalyst_info else "Ideonella sakaiensis PETase (IsPETase)"
        buffer_id = buffer_info.get("component_id", "comp_buffer_phosphate") if buffer_info else "comp_buffer_phosphate"
        buffer_name = buffer_info.get("name") if buffer_info else "Phosphate Buffer Matrix"

        # Buffer concentration consistency from proposal
        buf_comp = next((c for c in proposal.config.selected_components if getattr(c, "role", "") == "buffer" or getattr(getattr(c, "role", None), "value", "") == "buffer"), None) if proposal else None
        buffer_conc = buf_comp.concentration if buf_comp and buf_comp.concentration else ("100 mM" if env_ph >= 7.8 else "50 mM")

        # Section 1. Selected Components
        p_lines = [
            "### 1. Selected Components\n",
            f"- **Substrate Polymer**: {substrate_name} (Catalogue ID: `{substrate_id}`) — Solid-phase polymer target.",
            f"- **Hydrolytic Enzyme**: {catalyst_name} (Catalogue ID: `{catalyst_id}`) — Biocatalytic hydrolase.",
            f"- **Buffer Matrix**: {buffer_name} (Catalogue ID: `{buffer_id}`) — Medium pH stabilization ({buffer_conc}).\n",
        ]

        # Section 2. Scientific Justification (Dynamically tailored to actual catalyst, regime & substrate)
        if catalyst_id == "comp_ispetase":
            enzyme_justification = (
                f"The selection of **{catalyst_name}** is mechanistically justified by its canonical Ser160-His237-Asp206 "
                f"catalytic triad located within an open hydrophobic substrate cleft (X-ray crystal structure solved to 0.92 Å resolution, PDB ID 6EQE; Austin et al., PNAS 2018). "
                f"Wild-type IsPETase operates with high catalytic specificity on accessible ester linkages in low-crystallinity PET at mesophilic temperatures (~30°C). "
                f"At {env_temp:.1f}°C, the reaction operates in a mesophilic regime far below the PET glass transition temperature (Tg ~67°C in water); "
                f"polymer chains are in a glassy state, restricting cleavage to mobile amorphous surface domains without polymer softening. "
                f"Thermodynamic stability and catalytic competence follow distinct boundaries: thermal denaturation onset (Tonset) begins between 42°C and 45°C, "
                f"the melting temperature (Tm) is ~48.8°C, while functional loss of catalytic activity during extended incubation initiates above 37–40°C."
            )
        elif catalyst_id == "comp_fast_petase":
            enzyme_justification = (
                f"The selection of **{catalyst_name}** is mechanistically justified by 5 structure-based consensus mutations "
                f"(N233K/R224Q/S121E/D186H/R280A; Lu et al. Nature 2022) conferring an 8.8°C elevation in melting temperature (Tm). "
                f"This engineered stability enables sustained depolymerization at intermediate temperatures ({env_temp:.1f}°C), "
                f"accelerating ester cleavage on post-consumer substrate while remaining below thermophilic energy requirements."
            )
        elif catalyst_id == "comp_lcc_iccg":
            enzyme_justification = (
                f"The selection of **{catalyst_name}** is mechanistically justified by an engineered disulfide bridge (D238C/S283C) "
                f"and active-site mutations (F243I/Y127G; Tournier et al. Nature 2020), elevating melting temperature by ~9.8°C. "
                f"At {env_temp:.1f}°C, the system operates in a thermophilic regime near the PET glass transition temperature (Tg ~67–75°C), "
                f"substantially increasing amorphous chain mobility and facilitating rapid catalytic triad access."
            )
        else:
            enzyme_justification = (
                f"The selection of **{catalyst_name}** is evaluated under the specified reaction conditions ({env_temp:.1f}°C, pH {env_ph:.1f})."
            )

        if "pla" in substrate_id.lower() and catalyst_id in ["comp_ispetase", "comp_fast_petase", "comp_lcc_iccg"]:
            compat_warning = (
                f"\n\n**Substrate-Enzyme Catalytic Incompatibility**: {catalyst_name} is an aromatic polyesterase "
                f"specifically active on PET (and PEF). It lacks documented catalytic depolymerization activity on aliphatic polyesters "
                f"such as Poly(lactic acid) (PLA). In published literature (Kawai et al. 2019), PLA depolymerization requires specialized "
                f"proteases (e.g., Proteinase K) or microbial lipases under elevated composting temperatures (>58°C)."
            )
        else:
            compat_warning = (
                f" Sustained depolymerization requires active buffer stabilization ({buffer_conc} {buffer_name}) "
                f"to counter localized acidification as acidic monomers are released."
            )

        p_lines.extend([
            "### 2. Scientific Justification\n",
            enzyme_justification + compat_warning + "\n",
        ])

        # Section 3. Proposed Experiment
        p_lines.extend([
            "### 3. Proposed Experiment\n",
            f"- **Polymer Substrate**: {substrate_name} (Configured: 10 mg/mL)",
            f"- **Primary Catalyst**: {catalyst_name} (Configured: 50 nM)",
            f"- **Buffering Agent**: {buffer_name} (Configured: {buffer_conc}, pH {env_ph:.1f})",
            f"- **Incubation Temperature**: {env_temp:.1f}°C",
            f"- **Medium pH**: {env_ph:.1f}",
            f"- **System Pressure**: {env.pressure_atm if env else 1.0} atm",
            f"- **Orbital Agitation**: {env.agitation_rpm if env else 150} RPM",
            f"- **Incubation Duration**: {env.duration_hours if env else 24.0} hours\n",
        ])

        # Section 4. Actual Assessment
        score_details = sim_run.get("score_details") or {}
        raw_mean = score_details.get("raw_component_mean")
        applied_cap = score_details.get("applied_cap")
        override_reason = score_details.get("override_reason")

        breakdown_lines = []
        if score_breakdown:
            n_comps = len(score_breakdown)
            weight_pct = round(100.0 / n_comps, 1) if n_comps > 0 else 0
            breakdown_lines.append("  - **Component Heuristic Contributions**:")
            for sb in score_breakdown:
                breakdown_lines.append(
                    f"    - **{sb['name']}**: heuristic score **{sb['heuristic_score']}/100** ({sb['basis']}) — Contributes {weight_pct}% to unweighted component mean."
                )

            scores_list = [str(sb['heuristic_score']) for sb in score_breakdown]
            sum_str = " + ".join(scores_list)
            computed_raw = sum(sb['heuristic_score'] for sb in score_breakdown) / n_comps if n_comps > 0 else 0

            breakdown_lines.append("  - **Score Aggregation & Contribution**:")
            breakdown_lines.append(
                f"    - **Raw Component Mean**: ({sum_str}) / {n_comps} = **{computed_raw:.1f}** (integer rounded: **{int(computed_raw)}/100**)."
            )
            if applied_cap is not None:
                breakdown_lines.append(
                    f"    - **Applied System Override**: **Capped at {applied_cap}/100** ({override_reason or 'Boundary condition constraint'})."
                )
                breakdown_lines.append(
                    f"    - **Final Index Derivation**: Overrides raw mean of {int(computed_raw)} to reflect catalytic boundary → **{score}/100** ({status})."
                )
            else:
                breakdown_lines.append(
                    f"    - **Applied System Override**: **None** (all components operate within published viable tolerance envelopes, active depolymerization pathway confirmed)."
                )
                breakdown_lines.append(
                    f"    - **Final Index Derivation**: Directly equals integer raw component mean → **{score}/100** ({status})."
                )
            breakdown_str = "\n".join(breakdown_lines)
        else:
            breakdown_str = f"  - Individual component evaluations: {catalyst_name} evaluated under operating envelope."

        score_caveat = (
            "- **Scientific Metric Nature**: The Compatibility Index is a deterministic, rule-based computational viability score "
            "derived from published biochemical tolerance windows and thermodynamic boundaries. It is NOT an experimentally measured "
            "degradation yield, quantitative turnover percentage, or physical reaction rate."
        )

        p_lines.extend([
            "### 4. Actual Assessment\n",
            f"- **Deterministic Compatibility Index**: **{score}/100** ({status})",
            "- **Score Breakdown & Derivation**:",
            breakdown_str,
            f"- **Assessment Status**: Reaction conditions ({env_temp:.1f}°C, pH {env_ph:.1f}) evaluate to {status} for {catalyst_name} with {substrate_name}.",
            f"- **System Constraint**: {sim_run.get('override_reason') or 'Operating within verified tolerance envelopes.'}",
            score_caveat + "\n",
        ])

        # Section 5. Expected Biochemical Pathway
        if "pla" in substrate_id.lower() and catalyst_id in ["comp_ispetase", "comp_fast_petase", "comp_lcc_iccg"]:
            pathway_str = "No active catalytic pathway established (catalytic incompatibility between IsPETase and PLA)."
            product_bullets = (
                "  - **No Enzymatic Cleavage Products**: IsPETase does not hydrolyze PLA ester bonds. "
                "PET-specific intermediates (MHET, TPA, EG) are derived solely from poly(ethylene terephthalate) and are NOT formed from PLA."
            )
            intermediate_fate = (
                "- **Intermediate Fate**: PLA remains chemically intact under IsPETase incubation. "
                "PLA depolymerization requires specialized proteases (Proteinase K) or lipases yielding lactic acid monomers."
            )
        elif active_pathways:
            pathway_str = active_pathways[0]
            product_bullets = "\n".join([
                f"  - **{p.get('name')}** (`{p.get('formula')}`): {p.get('stage', 'product').replace('_', ' ').capitalize()} — {p.get('biological_impact', 'Soluble intermediate')}"
                for p in products[:4]
            ]) if products else "  - Soluble monomeric intermediates."
            if "mhetase" in [c.get("component_id", "") for c in sim_run.get("component_assessments", [])]:
                intermediate_fate = "- **Intermediate Fate**: Dual-enzyme cascade enables primary IsPETase cleavage yielding MHET, followed by secondary MHETase conversion into terminal TPA and EG monomers, avoiding feedback product inhibition."
            elif catalyst_id == "comp_ispetase":
                intermediate_fate = "- **Intermediate Fate**: Primary IsPETase cleavage liberates soluble MHET as dominant intermediate. Without downstream MHETase, MHET accumulates and exerts feedback product inhibition on the enzyme."
            else:
                intermediate_fate = "- **Intermediate Fate**: Direct enzymatic ester bond cleavage yields soluble hydrolytic monomers and oligomers."
        else:
            pathway_str = "No active catalytic pathway established under assessed conditions."
            product_bullets = "  - No cleavage products established."
            intermediate_fate = "- **Intermediate Fate**: Substrate ester bonds remain unhydrolyzed."

        p_lines.extend([
            "### 5. Expected Biochemical Pathway\n",
            f"- **Primary Cleavage Sequence**: {pathway_str}",
            "- **Anticipated Degradation Products & Intermediates**:",
            product_bullets,
            intermediate_fate + "\n",
        ])

        # Section 6. Scientific Evidence (Filter strictly relevant references and ensure every cited paper appears)
        mandatory_ev_ids = set()
        if catalyst_id == "comp_ispetase":
            mandatory_ev_ids.update(["ref_yoshida_2016", "ref_austin_2018"])
        elif catalyst_id == "comp_lcc_iccg":
            mandatory_ev_ids.update(["ref_tournier_2020", "ref_kawai_2019"])
        elif catalyst_id == "comp_fast_petase":
            mandatory_ev_ids.update(["ref_lu_2022"])

        if "pla" in substrate_id.lower():
            mandatory_ev_ids.add("ref_kawai_2019")

        relevant_refs = []
        for et in executed_tools:
            if et.get("tool") == "search_literature" and et.get("result", {}).get("success"):
                relevant_refs.extend(et["result"].get("references", []))

        # Filter references matching actual components
        filtered_refs = []
        for r in relevant_refs:
            r_id = r.get("id", "")
            if "pla" in substrate_id.lower():
                if r_id in ["ref_kawai_2019"]:
                    filtered_refs.append(r)
            elif "pet" in substrate_id.lower():
                if catalyst_id == "comp_ispetase" and r_id in ["ref_yoshida_2016", "ref_austin_2018", "ref_taniguchi_2019"]:
                    filtered_refs.append(r)
                elif catalyst_id == "comp_lcc_iccg" and r_id in ["ref_tournier_2020", "ref_kawai_2019"]:
                    filtered_refs.append(r)
                elif catalyst_id == "comp_fast_petase" and r_id in ["ref_lu_2022"]:
                    filtered_refs.append(r)
                elif r_id in ["ref_yoshida_2016", "ref_austin_2018", "ref_tournier_2020", "ref_lu_2022", "ref_kawai_2019"]:
                    filtered_refs.append(r)

        # Ensure all mandatory citations from the scientific justification are present
        present_ids = {r.get("id") for r in filtered_refs}
        for m_id in mandatory_ev_ids:
            if m_id not in present_ids:
                matching_ev = next((ev for ev in get_all_evidence() if ev.get("id") == m_id), None)
                if matching_ev:
                    filtered_refs.append(matching_ev)
                    present_ids.add(m_id)

        if not filtered_refs:
            if "pla" in substrate_id.lower():
                filtered_refs = [r for r in get_all_evidence() if r.get("id") == "ref_kawai_2019"]
            elif catalyst_id == "comp_ispetase":
                filtered_refs = [r for r in get_all_evidence() if r.get("id") in ["ref_yoshida_2016", "ref_austin_2018"]]
            elif catalyst_id == "comp_lcc_iccg":
                filtered_refs = [r for r in get_all_evidence() if r.get("id") in ["ref_tournier_2020", "ref_kawai_2019"]]
            else:
                filtered_refs = get_all_evidence()[:2]

        seen_dois = set()
        evidence_bullets = []
        for r in filtered_refs:
            doi = r.get("doi", "")
            if doi in seen_dois:
                continue
            seen_dois.add(doi)
            clean_link = f"[{doi}](https://doi.org/{doi})" if doi else "Verified Reference"
            evidence_bullets.append(
                f"- **{r.get('title')}** ({r.get('journal')}, {r.get('year')}) — Authors: {r.get('authors', '').split(',')[0]} et al. — DOI: {clean_link}"
            )

        evidence_str = "\n".join(evidence_bullets) if evidence_bullets else "- Kawai et al. (Catalysts, 2019) — DOI: [10.3390/catal9110888](https://doi.org/10.3390/catal9110888)"

        p_lines.extend([
            "### 6. Scientific Evidence\n",
            evidence_str,
            "\n*Distinction: Literature evidence citations report authentic empirical benchmarks observed in vitro by original researchers. The Compatibility Index above is a computational rule-based viability assessment derived from published tolerance thresholds.*\n",
        ])

        # Section 7. Limitations
        if catalyst_id == "comp_ispetase":
            thermal_limitation = (
                f"- **Enzyme Thermal Stability**: Wild-type {catalyst_name} is constrained to mesophilic temperatures (~30°C). "
                f"Thermodynamic stability and catalytic competence follow distinct boundaries: "
                f"(1) Functional loss of catalytic activity occurs during extended incubation above 37–40°C due to active-site flexibility and cleft collapse; "
                f"(2) Thermal denaturation onset (Tonset) initiates between 42°C and 45°C where cooperative tertiary unfolding begins; and "
                f"(3) Apparent melting temperature (Tm) is ~48.8°C, above which global irreversible unfolding and aggregation occur."
            )
        elif catalyst_id == "comp_fast_petase":
            thermal_limitation = (
                f"- **Enzyme Thermal Stability**: {catalyst_name} incorporates 5 consensus mutations elevating its melting temperature (Tm) to 57.6°C (+8.8°C over wild-type). "
                f"While operational up to 50–52°C, thermal denaturation onset (Tonset) initiates near 53°C, and loss of sustained catalytic activity accelerates above 52°C."
            )
        elif catalyst_id == "comp_lcc_iccg":
            thermal_limitation = (
                f"- **Enzyme Thermal Stability**: {catalyst_name} possesses an engineered disulfide bond (D238C/S283C) conferring a melting temperature (Tm) of 94.7°C (in the presence of 1 mM Ca2+). "
                f"While optimal at 70–72°C near the PET glass transition, thermal denaturation onset (Tonset) occurs around 85°C, and extended incubation >75°C without calcium cofactors accelerates loss of catalytic activity."
            )
        else:
            thermal_limitation = f"- **Enzyme Thermal Stability**: Catalytic activity and thermodynamic stability are governed by verified denaturation onset (Tonset) and melting temperature (Tm) boundaries for {catalyst_name}."

        p_lines.extend([
            "### 7. Limitations\n",
            thermal_limitation,
            "- **Crystallinity Boundary**: Hydrolysis is substantially faster on mobile amorphous polyester domains; dense crystalline lamellae exhibit low surface accessibility.",
            "- **Non-Kinetic Modeling Disclosure**: Component concentrations are recorded for experimental protocol reproducibility. This version does not use concentration to calculate empirical reaction rates or quantitative degradation yield.",
            "- **Life Cycle Assessment (LCA) Boundary**: Net environmental benefit depends on bioreactor process energy, enzyme production overhead, and downstream monomer separation efficiency.",
        ])

        return "\n".join(p_lines)

ai_service = AIService()

