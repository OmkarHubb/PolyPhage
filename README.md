# PolyPhage AI 🧬 ♻️

> **Virtual Biotechnology Laboratory for Plastic Degradation Research**  
> Built for the hackathon theme: **AI for Climate Change**

PolyPhage AI is an AI-assisted virtual biotechnology laboratory designed to investigate and model biological approaches to synthetic plastic depolymerization. Researchers configure substrate polyesters, biocatalytic enzymes, cellular hosts, buffers, and environmental conditions to simulate reaction viability, track degradation pathways, inspect intermediate metabolites and products, and examine supporting peer-reviewed scientific literature.

---

## 🎯 Target Demonstration Workflow

**PET Plastic + Ideonella sakaiensis PETase → Environmental Chamber Configuration → Deterministic Scientific Assessment → Pathway Inspection & Product Analysis → AI Scientific Assistant Interpretation**

The platform operates as a serious biotechnology workstation:
1. **Researcher In Control**: The researcher selects components and tunes environment parameters.
2. **Deterministic Rules & Real Evidence**: Reaction compatibility, thermal denaturation limits (e.g. wild-type IsPETase >45°C), and product outcomes are derived deterministically from verified scientific publications (Science, Nature, PNAS).
3. **No Fabricated Science**: No synthetic rates, fake DOIs, or fabricated kinetics curves are generated.
4. **Bring Your Own Key (BYOK)**: AI functionality is optional and provider-agnostic. The entire laboratory functions 100% without an API key.

---

## 🛠️ Technology Stack

- **Frontend**:
  - React 19 + TypeScript
  - Vite 8
  - Tailwind CSS 4
  - Lucide React icons
  - `@xyflow/react` (Interactive React Flow pathway visualization)
  - Browser LocalStorage for experiment persistence
- **Backend**:
  - Python 3.11+
  - FastAPI
  - Pydantic v2
  - Uvicorn
  - HTTPX
  - Structured JSON scientific datasets with verified DOIs
- **AI Integration (BYOK)**:
  - Provider-agnostic OpenAI-compatible adapter (OpenAI, Groq, OpenRouter, Local Ollama / vLLM)
  - Backend-isolated local credentials (never in browser LocalStorage, client bundles, or git)
  - Connection testing with latency metrics and error diagnostics

---

## 🔬 Scientific Foundations & Peer-Reviewed Evidence

All biochemical parameters and reaction steps in PolyPhage AI are strictly linked to verified scientific literature:

| Reference | Journal / DOI | Key Grounded Scientific Fact |
|-----------|--------------|------------------------------|
| **Yoshida et al. (2016)** | *Science*<br>`10.1126/science.aad6359` | Discovery of *Ideonella sakaiensis* 201-F6; PETase (ISF6_4831) cleaves amorphous PET into MHET, BHET, and TPA; MHETase (ISF6_0224) cleaves MHET into TPA + EG at 30°C. |
| **Austin et al. (2018)** | *PNAS*<br>`10.1073/pnas.1718804115` | High-resolution crystal structure (0.92 Å) of IsPETase (PDB: 6EQE); open hydrophobic catalytic cleft; S238F/W159H mutant improves turnover; thermal denaturation onset at 42–48°C. |
| **Tournier et al. (2020)** | *Nature*<br>`10.1038/s41586-020-2149-4` | Engineered cutinase (LCC-ICCG) operating at 72°C near the PET glass transition temperature ($T_g \sim 67^\circ\text{C}$); achieved 90% depolymerization in 10h; requires active NaOH neutralization. |
| **Lu et al. (2022)** | *Nature*<br>`10.1038/s41586-022-04599-z` | Machine-learning engineered FAST-PETase operating across 40–50°C and pH 6.5–8.0 on post-consumer PET. |
| **Palm et al. (2019)** | *Nat Commun*<br>`10.1038/s41467-019-09326-3` | Crystal structure of MHETase (PDB: 6QGA); relieves feedback product inhibition of PETase. |
| **Taniguchi et al. (2019)**| *ACS Catalysis*<br>`10.1021/acscatal.8b05171` | Amorphous vs crystalline PET degradation kinetics; bacterial cell attachment and assimilation pathways. |

---

## 🚀 Running the Project Locally

### 1. Backend Setup (FastAPI)

```bash
# Navigate to backend directory
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Run the backend server (runs on http://127.0.0.1:8000)
python run.py
```

*Backend API Documentation is available at: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)*

### 2. Frontend Setup (React + Vite)

```bash
# In a new terminal, navigate to frontend directory
cd frontend

# Install Node dependencies (if not already installed)
npm install

# Start the Vite development server (runs on http://localhost:5173)
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧪 Demonstration Walkthrough Guide

1. **Dashboard**: Click **"Load PET + PETase Hackathon Demo"**.
   - Loads Poly(ethylene terephthalate) [PET] as substrate.
   - Loads Ideonella sakaiensis PETase [IsPETase] as catalyst.
   - Loads Sodium Phosphate Buffer (50 mM, pH 7.0) as buffer.
2. **Lab Bench**: Inspect components, check the Ser160-His237-Asp206 catalytic triad, and assign roles. Add MHETase to examine dual-enzyme synergy.
3. **Environment Chamber**:
   - Set temperature to **30.0°C** and pH to **7.0** (Standard Mesophilic).
   - Test thermal denaturation: drag temperature to **70.0°C** and observe the live thermodynamic warning (IsPETase denatures above 45°C).
4. **Experiment Results**: Click **"Run Scientific Assessment"**.
   - View the **interactive React Flow pathway** tracing PET $\to$ MHET $\to$ TPA + EG.
   - Review viability index, product classifications, environmental implications, and real published literature benchmarks.
5. **AI Scientific Assistant (Optional BYOK)**:
   - Navigate to **AI Settings (BYOK)** to enter an API key (OpenAI, Groq, OpenRouter).
   - Click **"Test Connection"** to verify latency and model response.
   - Ask AI to generate a structured interpretation or ask follow-up questions in the scientific chat.

---

## 🔒 Bring Your Own Key (BYOK) Security

- AI credentials are never embedded in frontend code, client bundles, or browser LocalStorage.
- Stored locally on the backend in `.credentials_local.json` (gitignored).
- Connection testing allows researchers to verify connectivity before running interpretations.
- Zero silent fallback to other paid models.
- Researchers supply their own API keys and are responsible for provider billing.
