from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.scientific_data.loader import init_scientific_data
from app.api.components import router as components_router, evidence_router
from app.api.assessment import router as assessment_router
from app.api.settings import router as settings_router
from app.api.ai import router as ai_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Virtual biotechnology laboratory for plastic biodegradation research (AI for Climate Change).",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Open for development across local ports
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    init_scientific_data()

@app.get("/", tags=["System"])
@app.get("/api", tags=["System"])
@app.get("/health", tags=["System"])
@app.get("/api/health", tags=["System"])
def health_check():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "mode": "deterministic_laboratory",
    }

# Mount modular routers under /api
app.include_router(components_router, prefix=settings.API_PREFIX)
app.include_router(evidence_router, prefix=settings.API_PREFIX)
app.include_router(assessment_router, prefix=settings.API_PREFIX)
app.include_router(settings_router, prefix=settings.API_PREFIX)
app.include_router(ai_router, prefix=settings.API_PREFIX)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)

