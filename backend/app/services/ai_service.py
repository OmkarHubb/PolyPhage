import json
import time
from typing import Dict, Any, List, Optional
import httpx
from app.services.credential_manager import credential_manager
from app.models.ai_models import (
    TestConnectionResponse,
    AIInterpretationRequest,
    AIInterpretationResponse,
    AIChatRequest,
    AIChatResponse,
)

SYSTEM_PROMPT = """You are the AI Scientific Assistant for PolyPhage AI, a virtual biotechnology laboratory specializing in biological plastic degradation for climate change mitigation.

CRITICAL SCIENTIFIC DIRECTIVES:
1. Ground all scientific interpretations STRICTLY in the provided experiment configuration, deterministic assessment results, and verified literature citations.
2. NEVER invent, synthesize, or hallucinate citations, DOIs, authors, degradation percentages, or kinetic curves.
3. If specific numerical rates or conversion percentages are not present in the assessment data or cited literature benchmarks, explicitly state that empirical kinetics depend on substrate crystallinity, surface area, and enzyme concentration, and are not inferred from pH/temperature alone.
4. Distinguish clearly between:
   - Experimental facts from verified papers (e.g., Yoshida 2016, Austin 2018, Tournier 2020)
   - Established biochemical mechanisms (catalytic triads, ester bond hydrolysis)
   - Thermodynamic and environmental tolerance constraints
   - Missing evidence and research uncertainties
5. Address the researcher as a serious biotechnology collaborator: dense, precise, scientifically rigorous, yet accessible.
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
        context_data = {
            "experiment": {
                "name": request.experiment.name,
                "components": [
                    {"component_id": c.component_id, "role": c.role.value}
                    for c in request.experiment.selected_components
                ],
                "environment": request.experiment.environment.model_dump(),
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
            '  "environmental_and_climate_perspective": "Analysis of circular carbon recovery, monomer recycling vs emissions, and ocean/landfill impact",\n'
            '  "uncertainties_and_gap_analysis": "Scientific uncertainties, substrate crystallinity factors, and missing empirical data",\n'
            '  "recommended_follow_up_experiments": ["List of 3-5 specific, actionable experimental modifications or parameter sweeps"]\n'
            "}"
        )

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ],
            "temperature": 0.2,
            "response_format": {"type": "json_object"},
        }

        try:
            async with httpx.AsyncClient(timeout=40.0) as client:
                res = await client.post(base_url, headers=headers, json=payload)
                if res.status_code == 401:
                    raise PermissionError("Invalid API key or unauthorized provider credentials.")
                elif res.status_code == 429:
                    raise RuntimeError("Provider rate limit reached or insufficient account balance.")
                elif res.status_code != 200:
                    raise RuntimeError(f"Provider returned error status {res.status_code}: {res.text[:200]}")

                data = res.json()
                raw_text = data["choices"][0]["message"]["content"]
                parsed = json.loads(raw_text)

                return AIInterpretationResponse(
                    success=True,
                    executive_overview=parsed.get("executive_overview", "Analysis completed."),
                    biochemical_mechanism_analysis=parsed.get("biochemical_mechanism_analysis", ""),
                    environmental_and_climate_perspective=parsed.get("environmental_and_climate_perspective", ""),
                    uncertainties_and_gap_analysis=parsed.get("uncertainties_and_gap_analysis", ""),
                    recommended_follow_up_experiments=parsed.get("recommended_follow_up_experiments", []),
                    provider=provider,
                    model=model,
                )
        except json.JSONDecodeError:
            # Fallback if response wasn't strict JSON
            return AIInterpretationResponse(
                success=True,
                executive_overview=raw_text[:500] if "raw_text" in locals() else "Assessment completed.",
                biochemical_mechanism_analysis="See detailed text report.",
                environmental_and_climate_perspective="Monomer circularity supported.",
                uncertainties_and_gap_analysis="Empirical kinetics depend on substrate crystallinity.",
                recommended_follow_up_experiments=["Validate against literature benchmarks."],
                provider=provider,
                model=model,
            )
        except Exception as e:
            raise RuntimeError(f"AI Interpretation failed: {str(e)}")

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
        if request.context_experiment and request.context_assessment:
            system_msg += f"\n\nCURRENT EXPERIMENT CONTEXT:\nExperiment Name: {request.context_experiment.name}\n"
            system_msg += f"Status: {request.context_assessment.overall_status} (Score: {request.context_assessment.overall_score}/100)\n"
            system_msg += f"Summary: {request.context_assessment.executive_summary}\n"
            system_msg += f"Assumptions & Limitations: {request.context_assessment.assumptions_and_limitations}\n"

        msgs = [{"role": "system", "content": system_msg}]
        for m in request.messages:
            msgs.append({"role": m.role, "content": m.content})

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": model,
            "messages": msgs,
            "temperature": 0.3,
            "max_tokens": 1200,
        }

        try:
            async with httpx.AsyncClient(timeout=35.0) as client:
                res = await client.post(base_url, headers=headers, json=payload)
                if res.status_code == 401:
                    raise PermissionError("Invalid API key or unauthorized provider credentials.")
                elif res.status_code == 429:
                    raise RuntimeError("Provider rate limit reached or insufficient quota.")
                elif res.status_code != 200:
                    raise RuntimeError(f"Provider error ({res.status_code}): {res.text[:200]}")

                data = res.json()
                reply = data["choices"][0]["message"]["content"]
                return AIChatResponse(
                    reply=reply,
                    provider=provider,
                    model=model,
                )
        except Exception as e:
            raise RuntimeError(f"AI Chat error: {str(e)}")

ai_service = AIService()

