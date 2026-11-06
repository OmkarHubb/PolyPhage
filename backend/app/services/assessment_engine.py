from datetime import datetime
from typing import List, Dict, Any, Tuple
from app.models.experiment import ExperimentConfig, OxygenAvailability
from app.models.assessment import (
    ScientificAssessmentResult,
    ComponentAssessment,
    ComponentScoreEntry,
    ScoreCalculationDetails,
    InteractionAssessment,
    PathwayFinding,
    ProductFinding,
    EnvironmentalImplication,
    ViabilityStatus,
    EvidenceLevel,
)
from app.scientific_data.loader import (
    get_component_by_id,
    get_evidence_by_ids,
    get_all_pathways,
)

class ScientificAssessmentEngine:
    """
    Deterministic scientific assessment engine.
    Applies validated biochemical rules to evaluate plastic depolymerization systems.
    Does NOT fabricate kinetic rates, percentages, or synthetic DOIs.
    """

    def assess_experiment(self, config: ExperimentConfig) -> ScientificAssessmentResult:
        timestamp = datetime.utcnow().isoformat() + "Z"
        experiment_id = config.id or f"exp_{int(datetime.utcnow().timestamp())}"

        # 1. Resolve and validate components
        selected_comps = config.selected_components
        env = config.environment

        comp_details: Dict[str, Dict[str, Any]] = {}
        for sc in selected_comps:
            detail = get_component_by_id(sc.component_id)
            if detail:
                comp_details[sc.component_id] = detail

        # 2. Evaluate individual components under environmental conditions
        component_assessments: List[ComponentAssessment] = []
        viability_scores: List[int] = []
        score_breakdown_entries: List[ComponentScoreEntry] = []
        collected_evidence_ids: set = set()

        for sc in selected_comps:
            detail = comp_details.get(sc.component_id)
            if not detail:
                continue

            for eid in detail.get("evidence_ids", []):
                collected_evidence_ids.add(eid)

            status, score, temp_note, ph_note, general_notes, score_basis = self._evaluate_component_viability(
                detail, sc.role.value, env
            )
            viability_scores.append(score)

            component_assessments.append(
                ComponentAssessment(
                    component_id=detail["id"],
                    name=detail["name"],
                    role=sc.role.value,
                    viability_status=status,
                    temperature_assessment=temp_note,
                    ph_assessment=ph_note,
                    notes=general_notes,
                )
            )
            score_breakdown_entries.append(
                ComponentScoreEntry(
                    component_id=detail["id"],
                    name=detail["name"],
                    category=detail["category"],
                    heuristic_score=score,
                    basis=score_basis,
                )
            )

        # 3. Identify interactions and synergies
        interactions, interaction_evidence_ids = self._evaluate_interactions(
            selected_comps, comp_details, env
        )
        collected_evidence_ids.update(interaction_evidence_ids)

        # 4. Determine active pathways and product outcomes
        pathways, products, pathway_evidence_ids = self._evaluate_pathways_and_products(
            selected_comps, comp_details, env, component_assessments
        )
        collected_evidence_ids.update(pathway_evidence_ids)

        # 5. Formulate environmental and climate implications
        environmental_implications = self._evaluate_environmental_impact(
            selected_comps, pathways, env
        )

        # 6. Overall system score and status
        if not viability_scores:
            overall_score = 0
            overall_status = "incompatible"
            score_details = ScoreCalculationDetails(
                raw_component_mean=0.0,
                applied_cap=None,
                override_reason="No components configured",
                calculation_steps=["No components configured; index set to 0."]
            )
        else:
            raw_mean = sum(viability_scores) / len(viability_scores)
            overall_score = int(raw_mean)
            applied_cap = None
            override_reason = None
            calculation_steps = []

            # Step 1: Component evaluation summary
            comp_score_strs = [f"{ca.name}: {s}" for ca, s in zip(component_assessments, viability_scores)]
            calculation_steps.append(
                f"Step 1 (Component Evaluation): Individual heuristic scores assigned based on literature tolerance thresholds: {', '.join(comp_score_strs)}."
            )

            # Step 2: Arithmetic mean
            calculation_steps.append(
                f"Step 2 (Arithmetic Mean): Raw unweighted component mean = sum({viability_scores}) / {len(viability_scores)} = {raw_mean:.1f} (integer: {overall_score})."
            )

            # Step 3: Check for terminal biocatalytic failures (thermal denaturation / lethal stress)
            denatured_components = [ca.name for ca in component_assessments if ca.viability_status == ViabilityStatus.DENATURED_OR_LETHAL]
            if denatured_components:
                overall_status = "inactivated"
                if overall_score > 30:
                    applied_cap = 30
                    overall_score = 30
                    override_reason = (
                        f"Terminal inactivation override: {', '.join(denatured_components)} suffered lethal/denaturing stress (score 10–15). "
                        "Overall compatibility index is capped at 30 to reflect catalytic cessation regardless of substrate or buffer stability."
                    )
                    calculation_steps.append(f"Step 3 (Terminal Override Applied): {override_reason}")
                else:
                    calculation_steps.append(
                        f"Step 3 (Terminal Status): {', '.join(denatured_components)} denatured; raw mean ({overall_score}) is already at or below the 30 ceiling."
                    )
            elif any(ca.viability_status == ViabilityStatus.SUBOPTIMAL for ca in component_assessments):
                overall_status = "suboptimal"
                calculation_steps.append(
                    "Step 3 (Suboptimal Check): No terminal denaturation; one or more components operate under suboptimal temperature or pH conditions."
                )
            elif any(p.status == "active" for p in pathways):
                overall_status = "viable"
                calculation_steps.append(
                    "Step 3 (Viability Check): All components operate within published viable windows and at least one catalytic pathway is active."
                )
            else:
                overall_status = "suboptimal"
                calculation_steps.append(
                    "Step 3 (Viability Check): Reaction conditions viable but catalytic pathway is inactive or rate-limited."
                )

            # Step 4: Final index
            calculation_steps.append(
                f"Step 4 (Final Compatibility Index): Overall index = {overall_score} / 100 (Status: {overall_status})."
            )

            score_details = ScoreCalculationDetails(
                raw_component_mean=round(raw_mean, 1),
                applied_cap=applied_cap,
                override_reason=override_reason,
                calculation_steps=calculation_steps
            )

        score_methodology = (
            "The compatibility index is computed in 4 deterministic steps: "
            "1. Individual heuristic score evaluation per component based on published thermodynamic and biochemical tolerance thresholds "
            "(optimal window: 90–95, viable range: 80, cold/heat stress: 45–50, pH stress: -35 pt deduction down to 15 floor, denatured/lethal: 10–15; "
            "plastic substrate baseline: 90, buffer/chemical baseline: 90). "
            "2. Unweighted arithmetic mean calculation of all component scores to establish the raw component mean. "
            "3. Terminal viability verification: if any biocatalyst or microbial host suffers thermal denaturation or lethal stress (status 'denatured_or_lethal'), "
            "the overall index is capped at a maximum of 30, overriding the raw arithmetic mean to reflect catalytic cessation. "
            "4. Status classification: 'inactivated' (if capped at 30 due to denaturation), 'suboptimal' (if any component is suboptimal or off-peak), "
            "or 'viable' (if all components operational and pathway active). "
            "This index represents rule-based biochemical compatibility under configured conditions and is not an experimentally validated degradation yield, rate, or probability."
        )

        # 7. Executive summary
        executive_summary = self._generate_executive_summary(
            config, component_assessments, pathways, products, overall_status, overall_score
        )

        # 8. Assumptions, limitations, and uncertainties (strict scientific rigor)
        assumptions = [
            "Assessment is based on published enzymatic biochemical profiles and known thermodynamic tolerance thresholds.",
            "Substrate crystallinity strongly dictates real-world hydrolytic rates: amorphous regions degrade markedly faster than crystalline bottle-grade lamellae.",
            "Enzyme accessibility assumes adequate agitation and liquid-solid interfacial surface contact.",
            "No molecular simulation or atomistic conformational dynamics are claimed; rules are deterministic literature-derived constraints."
        ]

        uncertainties = [
            "Quantitative kinetic curves (e.g. % depolymerization over time) are intentionally omitted without calibrated empirical substrate geometry (e.g., powder mesh size, surface area m²/g).",
            "High concentrations of accumulated TPA or MHET may elicit variable degrees of product inhibition depending on local stirring and liquid renewal.",
            "Trace heavy metal additives or dyes in post-consumer plastic specimens can influence enzymatic half-life."
        ]

        # 9. Fetch verified evidence references
        evidence_records = get_evidence_by_ids(list(collected_evidence_ids))

        # 10. Real literature comparison data points (authentic published benchmarks)
        benchmarks = self._get_relevant_literature_benchmarks(selected_comps)

        return ScientificAssessmentResult(
            experiment_id=experiment_id,
            timestamp=timestamp,
            overall_status=overall_status,
            overall_score=overall_score,
            score_methodology=score_methodology,
            score_breakdown=score_breakdown_entries,
            score_details=score_details,
            executive_summary=executive_summary,
            component_assessments=component_assessments,
            interactions=interactions,
            active_pathways=pathways,
            potential_products=products,
            environmental_implications=environmental_implications,
            evidence_references=evidence_records,
            assumptions_and_limitations=assumptions,
            missing_evidence_and_uncertainties=uncertainties,
            experimental_reference_data_points=benchmarks,
        )

    def _evaluate_component_viability(
        self, comp: Dict[str, Any], role: str, env
    ) -> Tuple[ViabilityStatus, int, str, str, List[str], str]:
        """Returns: status, score, temp_note, ph_note, notes, score_basis"""
        props = comp.get("properties", {})
        cid = comp["id"]
        category = comp["category"]

        temp = env.temperature_celsius
        ph = env.ph
        o2 = env.oxygen
        notes = []
        score_basis = ""

        # Default neutral
        status = ViabilityStatus.OPTIMAL
        score = 85

        # Enzyme evaluations
        if category == "Enzymes":
            opt_temp = props.get("optimal_temperature_celsius", 30.0)
            t_min = props.get("viable_temperature_min", 20.0)
            t_max = props.get("viable_temperature_max", 42.0)
            t_denat = props.get("thermal_denaturation_onset_celsius", 45.0)

            opt_ph = props.get("optimal_ph", 7.0)
            ph_min = props.get("viable_ph_min", 6.0)
            ph_max = props.get("viable_ph_max", 9.0)

            # Temp evaluation
            if temp >= t_denat:
                status = ViabilityStatus.DENATURED_OR_LETHAL
                score = 10
                temp_note = f"Thermal denaturation: Reaction temperature ({temp:.1f}°C) exceeds denaturation threshold ({t_denat:.1f}°C). Irreversible active-site inactivation occurs."
                score_basis = f"Score 10: temperature {temp:.1f}°C ≥ denaturation onset {t_denat:.1f}°C (denatured)"
                notes.append("Enzyme undergoes rapid tertiary structure unfolding.")
            elif temp > t_max:
                status = ViabilityStatus.SUBOPTIMAL
                score = 45
                temp_note = f"Elevated thermal stress: Reaction temperature ({temp:.1f}°C) exceeds maximum viable boundary ({t_max:.1f}°C). Kinetic half-life significantly reduced."
                score_basis = f"Score 45: temperature {temp:.1f}°C above viable max {t_max:.1f}°C (heat-stressed)"
            elif temp < t_min:
                status = ViabilityStatus.SUBOPTIMAL
                score = 50
                temp_note = f"Low temperature inhibition: Temperature ({temp:.1f}°C) is below minimum kinetic range ({t_min:.1f}°C). Catalytic velocity is substantially depressed."
                score_basis = f"Score 50: temperature {temp:.1f}°C below viable min {t_min:.1f}°C (cold-stressed)"
            elif abs(temp - opt_temp) <= 3.0:
                temp_note = f"Near-optimal temperature: {temp:.1f}°C is within optimal catalytic window (~{opt_temp:.1f}°C)."
                score = 95
                score_basis = f"Score 95: temperature {temp:.1f}°C within ±3°C of optimal {opt_temp:.1f}°C"
            else:
                temp_note = f"Viable temperature: {temp:.1f}°C is within tolerable operating boundary ({t_min:.1f} - {t_max:.1f}°C)."
                score = 80
                score_basis = f"Score 80: temperature {temp:.1f}°C viable but off-peak (optimal {opt_temp:.1f}°C)"

            # pH evaluation
            if ph < ph_min or ph > ph_max:
                if status != ViabilityStatus.DENATURED_OR_LETHAL:
                    status = ViabilityStatus.SUBOPTIMAL
                score = max(15, score - 35)
                ph_note = f"pH Stress: pH {ph:.1f} falls outside functional catalytic limits ({ph_min:.1f} - {ph_max:.1f}), disrupting catalytic triad ionization."
                score_basis += f"; pH {ph:.1f} outside [{ph_min:.1f}–{ph_max:.1f}] → −35 pts (floor 15)"
            elif abs(ph - opt_ph) <= 0.4:
                ph_note = f"Optimal pH: {ph:.1f} aligns with the enzyme's reported isoelectric and catalytic optimum (~{opt_ph:.1f})."
            else:
                ph_note = f"Acceptable pH: {ph:.1f} within operational tolerance ({ph_min:.1f} - {ph_max:.1f})."

            if cid == "comp_lcc_iccg" and temp < 60.0:
                notes.append("LCC operates most effectively near the PET glass transition temperature (Tg ~67°C). Lower temperatures reduce chain mobility in amorphous regions, which literature suggests correlates with slower enzymatic surface access — though direct causation and quantitative rate effects depend on additional substrate-specific factors.")

        elif category == "Microorganisms":
            opt_temp = props.get("growth_temperature_optimal_celsius", 30.0)
            if temp > 40.0:
                status = ViabilityStatus.DENATURED_OR_LETHAL
                score = 15
                temp_note = f"Lethal temperature: Host bacterium cannot survive sustained incubation at {temp:.1f}°C."
                score_basis = f"Score 15: temperature {temp:.1f}°C is lethal for this organism (>40°C)"
            elif abs(temp - opt_temp) <= 3.0:
                temp_note = f"Optimal growth temperature: {temp:.1f}°C supports active cell proliferation and protein secretion."
                score = 90
                score_basis = f"Score 90: temperature {temp:.1f}°C within ±3°C of optimal {opt_temp:.1f}°C"
            else:
                status = ViabilityStatus.SUBOPTIMAL
                temp_note = f"Non-ideal growth temperature: {temp:.1f}°C diverges from optimal {opt_temp:.1f}°C."
                score = 65
                score_basis = f"Score 65: temperature {temp:.1f}°C viable but off-optimal {opt_temp:.1f}°C"

            ph_note = f"Assessed at pH {ph:.1f}. Bacterial cell viability supported between pH 6.0 and 8.0."
            if o2 == OxygenAvailability.ANAEROBIC and cid == "comp_ideonella":
                status = ViabilityStatus.DENATURED_OR_LETHAL
                score = 10
                score_basis += "; obligate aerobe under anaerobic conditions → score 10"
                notes.append("Ideonella sakaiensis is an obligate aerobe; anaerobic conditions halt respiration and metabolic synthesis.")

        elif category == "Plastics":
            tg = props.get("glass_transition_temp_celsius", 67.0)
            temp_diff = tg - temp
            if temp >= tg:
                temp_note = f"Operating at or above the PET glass transition temperature (Tg = {tg:.1f}°C). Polymer amorphous chain mobility is elevated in this regime, which literature associates with improved enzyme surface accessibility — though conversion rate also depends on substrate crystallinity, particle size, and enzyme loading."
                notes.append("Elevated chain mobility in amorphous domains may promote endo-cleavage (literature-supported association, not direct rate calculation).")
            else:
                temp_note = f"Operating below the polymer glass transition temperature ({temp:.1f}°C vs Tg {tg:.1f}°C; ΔT = -{temp_diff:.1f}°C). Polymer chains are in a glassy state; hydrolysis is restricted to accessible surface amorphous domains. Proximity to Tg is associated in published literature with higher enzyme accessibility, but Tg alone does not determine reaction rate."
            ph_note = "Plastic substrate is chemically stable across broad pH range; not hydrolyzed by dilute acid/base alone under typical enzymatic assay timescales."
            score = 90
            score_basis = "Score 90: plastic substrate baseline (chemically stable; enzymatic susceptibility assessed separately)"

        else:  # Chemicals and cofactors
            temp_note = f"Thermodynamically stable across assay temperature ({temp:.1f}°C)."
            ph_note = f"Buffer capacity maintains system near pH {ph:.1f}."
            score = 90
            score_basis = "Score 90: chemical/cofactor baseline (chemically stable across assessed conditions)"

        return status, score, temp_note, ph_note, notes, score_basis

    def _evaluate_interactions(
        self, selected_comps, comp_details, env
    ) -> Tuple[List[InteractionAssessment], set]:
        interactions: List[InteractionAssessment] = []
        ev_ids: set = set()
        cids = {sc.component_id for sc in selected_comps}

        # Interaction: PET + IsPETase
        if "comp_pet" in cids and "comp_ispetase" in cids:
            ev_ids.update(["ref_yoshida_2016", "ref_austin_2018"])
            interactions.append(
                InteractionAssessment(
                    interaction_type="catalytic_cleavage",
                    title="Enzymatic Ester Depolymerization of PET",
                    description="IsPETase binds amorphous regions of poly(ethylene terephthalate) through its open hydrophobic cleft, cleaving ester bonds via the Ser160 catalytic triad to liberate soluble MHET.",
                    participants=["Poly(ethylene terephthalate) (PET)", "Ideonella sakaiensis PETase (IsPETase)"],
                    evidence_ids=["ref_yoshida_2016", "ref_austin_2018"],
                    confidence=EvidenceLevel.EXPERIMENTAL,
                )
            )

        # Interaction: PET + FAST-PETase
        if "comp_pet" in cids and "comp_fast_petase" in cids:
            ev_ids.add("ref_lu_2022")
            interactions.append(
                InteractionAssessment(
                    interaction_type="catalytic_cleavage",
                    title="Machine-Learning Engineered Accelerated Depolymerization",
                    description="FAST-PETase leverages stabilized mutations (N233K/R224Q/S121E/D186H/R280A) for enhanced thermal resistance up to 50°C and depolymerization of post-consumer PET substrates.",
                    participants=["Poly(ethylene terephthalate) (PET)", "FAST-PETase"],
                    evidence_ids=["ref_lu_2022"],
                    confidence=EvidenceLevel.EXPERIMENTAL,
                )
            )

        # Interaction: PET + LCC-ICCG
        if "comp_pet" in cids and "comp_lcc_iccg" in cids:
            ev_ids.update(["ref_tournier_2020", "ref_kawai_2019"])
            interactions.append(
                InteractionAssessment(
                    interaction_type="catalytic_cleavage",
                    title="Thermophilic Cutinase Cleavage near Glass Transition (Tg)",
                    description="LCC-ICCG utilizes engineered disulfide bonds to operate at 72°C near the PET glass-transition temperature, rapidly hydrolyzing both amorphous and mobile chains directly into TPA and EG.",
                    participants=["Poly(ethylene terephthalate) (PET)", "LCC-ICCG Cutinase"],
                    evidence_ids=["ref_tournier_2020"],
                    confidence=EvidenceLevel.EXPERIMENTAL,
                )
            )

        # Synergy: PETase + MHETase
        if ("comp_ispetase" in cids or "comp_fast_petase" in cids) and "comp_mhetase" in cids:
            ev_ids.update(["ref_yoshida_2016", "ref_palm_2019"])
            interactions.append(
                InteractionAssessment(
                    interaction_type="synergistic_cascade",
                    title="Dual-Enzyme Synergy & Product Inhibition Relief",
                    description="Accumulation of mono-(2-hydroxyethyl) terephthalate (MHET) causes feedback product inhibition on PETase. The addition of MHETase rapidly clears MHET by converting it to monomeric TPA and EG, accelerating overall net depolymerization.",
                    participants=["PETase Variant", "MHETase"],
                    evidence_ids=["ref_yoshida_2016", "ref_palm_2019"],
                    confidence=EvidenceLevel.EXPERIMENTAL,
                )
            )

        # Cofactor: LCC + CaCl2
        if "comp_lcc_iccg" in cids and "comp_cacl2" in cids:
            ev_ids.add("ref_tournier_2020")
            interactions.append(
                InteractionAssessment(
                    interaction_type="cofactor_stabilization",
                    title="Divalent Cation (Ca2+) Thermal Stabilization",
                    description="Calcium ions bind specific coordination loops in the cutinase fold, suppressing conformational fluctuations and extending operational half-life at temperatures >65°C.",
                    participants=["LCC-ICCG Cutinase", "Calcium Chloride (CaCl2)"],
                    evidence_ids=["ref_tournier_2020"],
                    confidence=EvidenceLevel.EXPERIMENTAL,
                )
            )

        # Buffer: Acidification Warning if unbuffered
        has_buffer = any(cid in ["comp_buffer_phosphate", "comp_buffer_tris", "comp_naoh_titrant"] for cid in cids)
        if not has_buffer and ("comp_ispetase" in cids or "comp_fast_petase" in cids or "comp_lcc_iccg" in cids):
            interactions.append(
                InteractionAssessment(
                    interaction_type="environmental_stress",
                    title="Unbuffered Acidification Risk",
                    description="Hydrolysis of PET ester bonds releases carboxylic acid end groups (terephthalic acid pKa ~3.5 / 4.5). Without sufficient buffer or active base titration, medium pH will drop rapidly, inactivating the enzyme.",
                    participants=["Released Carboxylic Acids", "Catalytic Hydrolase"],
                    evidence_ids=["ref_tournier_2020", "ref_kawai_2019"],
                    confidence=EvidenceLevel.LITERATURE_SUPPORTED,
                )
            )

        return interactions, ev_ids

    def _evaluate_pathways_and_products(
        self, selected_comps, comp_details, env, comp_assessments
    ) -> Tuple[List[PathwayFinding], List[ProductFinding], set]:
        pathways: List[PathwayFinding] = []
        products: List[ProductFinding] = []
        ev_ids: set = set()

        cids = {sc.component_id for sc in selected_comps}
        all_pathways = get_all_pathways()

        # Check PET Primary Hydrolysis
        if "comp_pet" in cids and ("comp_ispetase" in cids or "comp_fast_petase" in cids):
            # Find primary pathway
            for p in all_pathways:
                if p["id"] == "pathway_pet_primary_hydrolysis":
                    ev_ids.update(p.get("evidence_ids", []))
                    limiting = []

                    # Check enzyme viability
                    is_ispetase = "comp_ispetase" in cids
                    if is_ispetase and env.temperature_celsius >= 45.0:
                        p_status = "inactivated"
                        limiting.append("IsPETase is thermally denatured above 45°C.")
                    elif env.temperature_celsius < 20.0:
                        p_status = "rate_limited"
                        limiting.append("Low temperature limits molecular collision frequency.")
                    elif env.ph < 6.0 or env.ph > 9.0:
                        p_status = "rate_limited"
                        limiting.append("pH shifts outside catalytic triad optimal ionization state.")
                    else:
                        p_status = "active"

                    pathways.append(
                        PathwayFinding(
                            pathway_id=p["id"],
                            name=p["name"],
                            description=p["description"],
                            status=p_status,
                            limiting_factors=limiting,
                            steps=p.get("reaction_steps", []),
                            evidence_ids=p.get("evidence_ids", []),
                        )
                    )

                    # Products generated
                    if p_status != "inactivated":
                        # Primary cleavage intermediate products
                        if "comp_mhetase" not in cids:
                            products.append(
                                ProductFinding(
                                    product_id="prod_mhet",
                                    name="Mono-(2-hydroxyethyl) terephthalate (MHET)",
                                    formula="C10H10O5",
                                    molar_mass="210.18 g/mol",
                                    reaction_stage="primary_cleavage_intermediate",
                                    yield_classification="Primary cleavage intermediate (soluble)",
                                    solubility_and_phase="Aqueous soluble monomeric ester",
                                    biological_and_environmental_impact="Major soluble intermediate of mesophilic PETase cleavage on amorphous PET (Yoshida et al. 2016); accumulates and exerts feedback product inhibition without downstream MHETase.",
                                    evidence_id="ref_yoshida_2016",
                                )
                            )
                            products.append(
                                ProductFinding(
                                    product_id="prod_bhet",
                                    name="Bis(2-hydroxyethyl) terephthalate (BHET)",
                                    formula="C12H14O6",
                                    molar_mass="254.24 g/mol",
                                    reaction_stage="primary_cleavage_intermediate",
                                    yield_classification="Trace cleavage intermediate",
                                    solubility_and_phase="Partially soluble",
                                    biological_and_environmental_impact="Trace soluble intermediate from dual-ester cleavage.",
                                    evidence_id="ref_austin_2018",
                                )
                            )
                            products.append(
                                ProductFinding(
                                    product_id="prod_tpa",
                                    name="Terephthalic Acid (TPA)",
                                    formula="C8H6O4",
                                    molar_mass="166.13 g/mol",
                                    reaction_stage="primary_cleavage_intermediate",
                                    yield_classification="Minor direct cleavage product (incomplete recovery)",
                                    solubility_and_phase="Precipitates at pH < 4; soluble dianion at neutral/alkaline pH",
                                    biological_and_environmental_impact="Minor direct cleavage product of IsPETase alone; complete monomer recovery is not achieved without downstream MHETase.",
                                    evidence_id="ref_yoshida_2016",
                                )
                            )
                        else:
                            # In dual-enzyme cascade, MHET is transiently formed before secondary hydrolysis
                            products.append(
                                ProductFinding(
                                    product_id="prod_mhet_transient",
                                    name="Mono-(2-hydroxyethyl) terephthalate (MHET, transient)",
                                    formula="C10H10O5",
                                    molar_mass="210.18 g/mol",
                                    reaction_stage="primary_cleavage_intermediate",
                                    yield_classification="Transient cleavage intermediate (cleared by MHETase)",
                                    solubility_and_phase="Aqueous soluble monomeric ester",
                                    biological_and_environmental_impact="Transiently liberated by IsPETase primary cleavage and rapidly hydrolyzed by secondary MHETase, preventing feedback inhibition.",
                                    evidence_id="ref_yoshida_2016",
                                )
                            )

        # Check MHETase secondary pathway
        if "comp_mhetase" in cids and any(p.pathway_id == "pathway_pet_primary_hydrolysis" and p.status != "inactivated" for p in pathways):
            for p in all_pathways:
                if p["id"] == "pathway_mhet_terminal_hydrolysis":
                    ev_ids.update(p.get("evidence_ids", []))
                    limiting = []
                    if env.temperature_celsius >= 45.0:
                        m_status = "inactivated"
                        limiting.append("MHETase undergoes thermal denaturation above 42-45°C.")
                    else:
                        m_status = "active"

                    pathways.append(
                        PathwayFinding(
                            pathway_id=p["id"],
                            name=p["name"],
                            description=p["description"],
                            status=m_status,
                            limiting_factors=limiting,
                            steps=p.get("reaction_steps", []),
                            evidence_ids=p.get("evidence_ids", []),
                        )
                    )

                    if m_status != "inactivated":
                        # TPA and EG become secondary hydrolysis products
                        products.append(
                            ProductFinding(
                                product_id="prod_tpa_cascade",
                                name="Terephthalic Acid (TPA)",
                                formula="C8H6O4",
                                molar_mass="166.13 g/mol",
                                reaction_stage="secondary_hydrolysis_product",
                                yield_classification="Secondary hydrolysis monomer (TPA)",
                                solubility_and_phase="Aqueous solution at pH 7-8",
                                biological_and_environmental_impact="Aromatic monomer recovered from secondary hydrolysis of MHET by MHETase; actual recovery depends on substrate crystallinity, particle geometry, and reaction time (not guaranteed complete yield).",
                                evidence_id="ref_palm_2019",
                            )
                        )
                        products.append(
                            ProductFinding(
                                product_id="prod_eg",
                                name="Ethylene Glycol (EG)",
                                formula="C2H6O2",
                                molar_mass="62.07 g/mol",
                                reaction_stage="secondary_hydrolysis_product",
                                yield_classification="Secondary hydrolysis monomer (EG)",
                                solubility_and_phase="Miscible liquid diol",
                                biological_and_environmental_impact="Diol co-monomer liberated stoichiometrically alongside TPA.",
                                evidence_id="ref_yoshida_2016",
                            )
                        )

        # Check LCC thermophilic pathway
        if "comp_pet" in cids and "comp_lcc_iccg" in cids:
            for p in all_pathways:
                if p["id"] == "pathway_lcc_thermophilic_depolymerization":
                    ev_ids.update(p.get("evidence_ids", []))
                    limiting = []
                    if env.temperature_celsius < 60.0:
                        l_status = "rate_limited"
                        limiting.append("Temperature is below PET chain mobility threshold (Tg ~67°C).")
                    elif env.temperature_celsius > 78.0:
                        l_status = "inactivated"
                        limiting.append("Exceeds engineered cutinase upper thermal stability limit.")
                    else:
                        l_status = "active"

                    pathways.append(
                        PathwayFinding(
                            pathway_id=p["id"],
                            name=p["name"],
                            description=p["description"],
                            status=l_status,
                            limiting_factors=limiting,
                            steps=p.get("reaction_steps", []),
                            evidence_ids=p.get("evidence_ids", []),
                        )
                    )

                    if l_status == "active":
                        products.append(
                            ProductFinding(
                                product_id="prod_tpa_lcc",
                                name="Terephthalic Acid (TPA)",
                                formula="C8H6O4",
                                molar_mass="166.13 g/mol",
                                reaction_stage="direct_cleavage_monomer",
                                yield_classification="Direct thermophilic cleavage monomer (TPA)",
                                solubility_and_phase="Disodium terephthalate in neutralized digest",
                                biological_and_environmental_impact="Direct aromatic monomer product from thermophilic cutinase cleavage near polymer Tg (Tournier et al. 2020 achieved 90% conversion under continuous automated NaOH titration with micronized amorphous PET; unbuffered or high-crystallinity specimens yield substantially lower conversion).",
                                evidence_id="ref_tournier_2020",
                            )
                        )
                        products.append(
                            ProductFinding(
                                product_id="prod_eg_lcc",
                                name="Ethylene Glycol (EG)",
                                formula="C2H6O2",
                                molar_mass="62.07 g/mol",
                                reaction_stage="direct_cleavage_monomer",
                                yield_classification="Direct thermophilic cleavage monomer (EG)",
                                solubility_and_phase="Soluble diol",
                                biological_and_environmental_impact="Direct diol co-monomer liberated alongside TPA.",
                                evidence_id="ref_tournier_2020",
                            )
                        )

        return pathways, products, ev_ids

    def _evaluate_environmental_impact(
        self, selected_comps, pathways, env
    ) -> List[EnvironmentalImplication]:
        implications: List[EnvironmentalImplication] = []
        cids = {sc.component_id for sc in selected_comps}

        # Climate & Circularity
        if "comp_pet" in cids and any(p.status == "active" for p in pathways):
            implications.append(
                EnvironmentalImplication(
                    category="Carbon Emission Abatement & Circular Economy",
                    finding="Biological depolymerization diverts post-consumer PET from municipal incineration and landfill accumulation.",
                    recommendation="Conversion to pure TPA monomers enables closed-loop recycling without petrochemical cracking. The magnitude of lifecycle CO2-equivalent savings depends on process energy inputs and is not calculable from biochemical parameters alone.",
                    severity_or_benefit="High Benefit",
                )
            )

        # Microplastic mitigation
        if "comp_pet" in cids:
            implications.append(
                EnvironmentalImplication(
                    category="Microplastic Fragmentation Mitigation",
                    finding="Enzymatic hydrolysis cleaves ester linkages into soluble small molecules rather than mechanically abrading into microplastic / nanoplastic particles.",
                    recommendation="Ensure complete conversion or enzymatic digestion of secondary particulate residue to prevent fine particulate release into aquatic effluents.",
                    severity_or_benefit="Moderate Benefit",
                )
            )

        # Acidification management
        implications.append(
            EnvironmentalImplication(
                category="Reactor Effluent Neutralization & Acidification",
                finding="Depolymerization generates 1-2 molar equivalents of free carboxylic acid groups (pKa1 3.5, pKa2 4.5) per cleaved repeat unit.",
                recommendation="Install automated base dosing (e.g. 1M NaOH) to prevent sudden drop to pH <5.5, which would halt biocatalysis and pose localized effluent acidity.",
                severity_or_benefit="Critical Precaution",
            )
        )

        return implications

    def _generate_executive_summary(
        self, config, comp_assessments, pathways, products, overall_status, overall_score
    ) -> str:
        names = [ca.name for ca in comp_assessments]
        comps_str = ", ".join(names) if names else "unspecified components"
        temp = config.environment.temperature_celsius
        ph = config.environment.ph

        if overall_status == "inactivated":
            return (
                f"Assessment indicates system inactivation (Viability Score: {overall_score}/100). "
                f"Under configured conditions ({temp:.1f}°C, pH {ph:.1f}), key biocatalytic components suffer thermal denaturation "
                f"or lethal environmental stress. Enzymatic turnover cannot proceed without adjusting operating parameters."
            )
        elif overall_status == "viable":
            active_p = [p.name for p in pathways if p.status == "active"]
            return (
                f"Experiment configuration is biochemically viable (Viability Score: {overall_score}/100). "
                f"Environmental parameters ({temp:.1f}°C, pH {ph:.1f}) fall within verified operational windows for {comps_str}. "
                f"Active pathway: {'; '.join(active_p)}. Soluble hydrolytic intermediates and monomers are anticipated based on published evidence."
            )
        else:
            return (
                f"Experiment is viable under suboptimal conditions (Viability Score: {overall_score}/100). "
                f"Parameters ({temp:.1f}°C, pH {ph:.1f}) diverge from optimal catalytic rates. "
                f"Reaction will proceed at diminished turnover velocities or with kinetic rate-limiting bottlenecks."
            )

    def _get_relevant_literature_benchmarks(self, selected_comps) -> List[Dict[str, Any]]:
        """
        Returns REAL verified experimental benchmark points from published literature.
        No fabricated data!
        """
        cids = {sc.component_id for sc in selected_comps}
        benchmarks = []

        if "comp_ispetase" in cids or "comp_pet" in cids:
            benchmarks.append({
                "source": "Yoshida et al. 2016 (Science)",
                "doi": "10.1126/science.aad6359",
                "condition": "30°C, pH 7.0, 50 mM sodium phosphate",
                "substrate": "Low-crystallinity (1.9%) amorphous PET film (thickness 60 µm)",
                "reported_observation": "Initial degradation rate of 0.13 mg/cm²/day at 30°C by Ideonella sakaiensis PETase; complete film disappearance observed after 6 weeks for amorphous specimen.",
                "major_products_detected": "MHET (dominant), TPA, BHET"
            })
            benchmarks.append({
                "source": "Austin et al. 2018 (PNAS)",
                "doi": "10.1073/pnas.1718804115",
                "condition": "30°C, pH 7.2, 50 mM sodium phosphate, 100 mM NaCl",
                "substrate": "Amorphous PET vs Post-consumer bottle PET",
                "reported_observation": "Engineered double mutant S238F/W159H demonstrated ~1.2-2.0x higher substrate depolymerization rate than wild-type IsPETase, and demonstrated activity on PEF film.",
                "major_products_detected": "MHET, TPA"
            })

        if "comp_lcc_iccg" in cids:
            benchmarks.append({
                "source": "Tournier et al. 2020 (Nature)",
                "doi": "10.1038/s41586-020-2149-4",
                "condition": "72°C, pH 8.0, 100 mM potassium phosphate buffer with continuous NaOH titration",
                "substrate": "Post-consumer micronized amorphous PET (3 kg batch)",
                "reported_observation": "90% conversion to monomers achieved in 10 hours at 3 mg enzyme / g PET; produced TPA was purified to >99.8% and repolymerized into virgin-grade PET bottles.",
                "major_products_detected": "TPA (>95% purity post-crystallization), EG"
            })

        if "comp_fast_petase" in cids:
            benchmarks.append({
                "source": "Lu et al. 2022 (Nature)",
                "doi": "10.1038/s41586-022-04599-z",
                "condition": "50°C, pH 8.0, 100 mM potassium phosphate",
                "substrate": "Commercial thermoformed PET container fragments",
                "reported_observation": "Demonstrated complete depolymerization of untreated post-consumer amorphous containers within 1-7 days depending on thickness; active across 51 consumer products.",
                "major_products_detected": "TPA, MHET"
            })

        return benchmarks

scientific_engine = ScientificAssessmentEngine()

