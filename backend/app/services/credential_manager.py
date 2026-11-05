import json
from pathlib import Path
from typing import Dict, Any, Optional
from app.core.config import settings

# Store local credentials outside version control
CREDENTIALS_FILE = Path(__file__).resolve().parent.parent.parent / ".credentials_local.json"

class LocalCredentialManager:
    """
    Manages local Bring Your Own Key (BYOK) AI credentials securely on the backend.
    Credentials are stored on the server filesystem in a restricted local JSON file (gitignored)
    and are never sent unmasked back to frontend bundles or logged.
    """
    def __init__(self):
        self._cache: Dict[str, Any] = {
            "provider": settings.AI_PROVIDER,
            "api_key": settings.AI_API_KEY,
            "base_url": settings.AI_BASE_URL,
            "model": settings.AI_MODEL,
        }
        self._load_from_disk()

    def _load_from_disk(self):
        if CREDENTIALS_FILE.exists():
            try:
                with open(CREDENTIALS_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, dict):
                        self._cache.update(data)
            except Exception:
                pass

    def _save_to_disk(self):
        try:
            with open(CREDENTIALS_FILE, "w", encoding="utf-8") as f:
                json.dump(self._cache, f, indent=2)
        except Exception:
            pass

    def mask_key(self, key: Optional[str]) -> Optional[str]:
        if not key or len(key.strip()) == 0:
            return None
        k = key.strip()
        if len(k) <= 8:
            return "****"
        return f"{k[:4]}...{k[-4:]}"

    def get_public_settings(self) -> Dict[str, Any]:
        api_key = self._cache.get("api_key", "").strip()
        is_configured = bool(api_key)
        return {
            "provider": self._cache.get("provider", "openai"),
            "api_key_configured": is_configured,
            "masked_key": self.mask_key(api_key),
            "base_url": self._cache.get("base_url", "https://api.openai.com/v1"),
            "model": self._cache.get("model", "gpt-4o-mini"),
            "is_active": is_configured,
            "status_message": "AI assistant connected and ready" if is_configured else "No API key configured (AI features idle; deterministic laboratory active)"
        }

    def get_secret_key(self) -> str:
        return self._cache.get("api_key", "")

    def get_config(self) -> Dict[str, Any]:
        return dict(self._cache)

    def set_config(self, provider: str, api_key: Optional[str], base_url: Optional[str], model: str):
        self._cache["provider"] = provider.lower()
        if api_key is not None and api_key != "":
            self._cache["api_key"] = api_key.strip()
        if base_url:
            self._cache["base_url"] = base_url.strip()
        else:
            # Set default based on provider
            if provider.lower() == "groq":
                self._cache["base_url"] = "https://api.groq.com/openai/v1"
            elif provider.lower() == "openrouter":
                self._cache["base_url"] = "https://openrouter.ai/api/v1"
            else:
                self._cache["base_url"] = "https://api.openai.com/v1"
        self._cache["model"] = model.strip()
        self._save_to_disk()

    def clear(self):
        self._cache["api_key"] = ""
        self._save_to_disk()

credential_manager = LocalCredentialManager()

