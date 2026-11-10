export type ComponentCategory = 'Plastics' | 'Enzymes' | 'Microorganisms' | 'Chemicals and Cofactors';

export type ComponentRole = 'substrate' | 'catalyst' | 'host_organism' | 'buffer' | 'cofactor';

export interface ComponentItem {
  id: string;
  name: string;
  category: ComponentCategory;
  description: string;
  chemical_formula?: string;
  ec_number?: string;
  properties: {
    molecular_weight_repeat_unit?: string;
    glass_transition_temp_celsius?: number;
    melting_temp_celsius?: number;
    crystallinity_variants?: string[];
    ester_bond_cleavage_susceptibility?: string;
    environmental_persistence_years?: string;
    catalytic_triad?: string;
    optimal_temperature_celsius?: number;
    viable_temperature_min?: number;
    viable_temperature_max?: number;
    thermal_denaturation_onset_celsius?: number;
    optimal_ph?: number;
    viable_ph_min?: number;
    viable_ph_max?: number;
    substrate_preference?: string;
    major_primary_product?: string;
    product_inhibition?: string;
    thermostability_gain?: string;
    growth_temperature_optimal_celsius?: number;
    respiration?: string;
    [key: string]: any;
  };
  supported_roles: ComponentRole[];
  evidence_ids: string[];
}

export interface SelectedComponent {
  component_id: string;
  role: ComponentRole;
  concentration?: string;
  concentration_value?: number;
  concentration_unit?: string;
  notes?: string;
}

export const VALID_CONCENTRATION_UNITS: Record<ComponentCategory, string[]> = {
  Enzymes: ['nM', 'µM', 'mg/L', 'mg/g substrate'],
  Plastics: ['mg/mL', 'g/L', 'wt%'],
  'Chemicals and Cofactors': ['mM', 'M', 'wt%'],
  Microorganisms: ['OD600', 'CFU/mL', 'cells/mL'],
};

export type OxygenAvailability = 'Aerobic' | 'Microaerophilic' | 'Anaerobic';

export interface EnvironmentConditions {
  temperature_celsius: number;
  ph: number;
  oxygen: OxygenAvailability;
  salinity_percent: number;
  pressure_atm: number;
  duration_hours: number;
  agitation_rpm?: number;
}

export interface ExperimentConfig {
  id?: string;
  name: string;
  description?: string;
  selected_components: SelectedComponent[];
  environment: EnvironmentConditions;
  createdAt?: string;
}

export type ViabilityStatus = 'optimal' | 'suboptimal' | 'inhibitory' | 'denatured_or_lethal' | 'incompatible';

export type EvidenceLevel = 'experimental' | 'literature_supported' | 'computational' | 'insufficient_evidence';

export interface ComponentAssessment {
  component_id: string;
  name: string;
  role: string;
  viability_status: ViabilityStatus;
  temperature_assessment: string;
  ph_assessment: string;
  concentration?: string;
  notes: string[];
}

export interface InteractionAssessment {
  interaction_type: string;
  title: string;
  description: string;
  participants: string[];
  evidence_ids: string[];
  confidence: EvidenceLevel;
}

export interface PathwayFinding {
  pathway_id: string;
  name: string;
  description: string;
  status: 'active' | 'rate_limited' | 'inactivated';
  limiting_factors: string[];
  steps: Array<{
    step_order: number;
    name: string;
    mechanism: string;
    substrates?: string[];
    catalysts?: string[];
    products?: any[];
    evidence_id?: string;
  }>;
  evidence_ids: string[];
}

export interface ProductFinding {
  product_id: string;
  name: string;
  formula?: string;
  molar_mass?: string;
  reaction_stage?: 'primary_cleavage_intermediate' | 'secondary_hydrolysis_product' | 'direct_cleavage_monomer' | 'byproduct';
  yield_classification: string;
  solubility_and_phase: string;
  biological_and_environmental_impact: string;
  evidence_id?: string;
}

export interface EnvironmentalImplication {
  category: string;
  finding: string;
  recommendation: string;
  severity_or_benefit: string;
  evidence_type?: string;
}

export interface EvidenceRecord {
  id: string;
  title: string;
  authors: string;
  journal: string;
  year: number;
  volume_issue_pages: string;
  doi: string;
  url: string;
  verified: boolean;
  evidence_level: EvidenceLevel;
  abstract_summary: string;
  key_findings: string[];
  experimental_conditions_reported?: Record<string, any>;
}

export interface LiteratureBenchmark {
  source: string;
  doi: string;
  condition: string;
  substrate: string;
  reported_observation: string;
  major_products_detected: string;
}

export interface ComponentScoreEntry {
  component_id: string;
  name: string;
  category: string;
  heuristic_score: number;
  basis: string;
}

export interface ScoreCalculationDetails {
  raw_component_mean: number;
  applied_cap?: number | null;
  override_reason?: string | null;
  calculation_steps: string[];
}

export interface ScientificAssessmentResult {
  experiment_id: string;
  timestamp: string;
  overall_status: 'viable' | 'suboptimal' | 'inactivated' | 'incompatible';
  overall_score: number;
  score_methodology?: string;
  score_breakdown?: ComponentScoreEntry[];
  score_details?: ScoreCalculationDetails;
  executive_summary: string;
  component_assessments: ComponentAssessment[];
  interactions: InteractionAssessment[];
  active_pathways: PathwayFinding[];
  potential_products: ProductFinding[];
  environmental_implications: EnvironmentalImplication[];
  lca_disclaimer?: string;
  process_energy_considerations?: string[];
  circularity_potential?: string;
  acidification_considerations?: string;
  evidence_references: EvidenceRecord[];
  assumptions_and_limitations: string[];
  missing_evidence_and_uncertainties: string[];
  experimental_reference_data_points: LiteratureBenchmark[];
}

export interface AISettings {
  provider: string;
  api_key_configured: boolean;
  masked_key?: string;
  base_url: string;
  model: string;
  is_active: boolean;
  status_message?: string;
}

export interface ProposedExperimentProposal {
  config: ExperimentConfig;
  scientific_rationale: string;
  expected_outcomes: string[];
  assumptions_and_boundaries: string[];
  supporting_evidence_ids: string[];
}

export interface AIInterpretationResponse {
  success: boolean;
  executive_overview: string;
  biochemical_mechanism_analysis: string;
  environmental_and_climate_perspective: string;
  uncertainties_and_gap_analysis: string;
  recommended_follow_up_experiments: string[];
  proposed_experiment?: ProposedExperimentProposal;
  provider: string;
  model: string;
}

export interface ToolExecutionRecord {
  tool: string;
  arguments: Record<string, any>;
  summary: string;
  result?: Record<string, any>;
}

export interface AIChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  executed_tools?: ToolExecutionRecord[];
  proposed_experiment?: ProposedExperimentProposal;
}

export interface AIChatResponse {
  reply: string;
  executed_tools?: ToolExecutionRecord[];
  proposed_experiment?: ProposedExperimentProposal;
  provider: string;
  model: string;
}

