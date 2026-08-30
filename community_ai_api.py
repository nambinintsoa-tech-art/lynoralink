import os
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from community_ai_agent_new import CommunityManagerSimple

load_dotenv()


class RespondMessageRequest(BaseModel):
    message_id: str = Field(..., description="ID interne du message privé")
    incoming_text: str = Field(..., description="Texte du message reçu")
    page_context: str = Field(..., description="Contexte de la page ou de la marque")


class CreatePostRequest(BaseModel):
    sujet: str = Field(..., description="Sujet principal du post")
    style: Optional[str] = Field("professionnel", description="Style souhaité du post")


class ImproveDraftRequest(BaseModel):
    brouillon: str = Field(..., description="Texte à améliorer")
    style: Optional[str] = Field("professionnel", description="Style de réécriture souhaité")
    instructions: Optional[str] = Field(None, description="Instructions supplémentaires pour l'amélioration")


class RunRequest(BaseModel):
    messages: list[dict] = Field(..., description="Historique de messages (role/content)")
    system: str = Field("", description="Contexte et règles de l'assistant")


app = FastAPI(
    title="LynoraLink Community AI Agent",
    description="API backend pour piloter l'agent IA de gestion communautaire.",
    version="0.1.0",
)

agent: Optional[CommunityManagerSimple] = None


@app.on_event("startup")
def startup_event() -> None:
    global agent
    try:
        agent = CommunityManagerSimple()
        # Use the configured provider when available; mock mode remains the fallback without a key.
        force_mock = os.getenv("FORCE_AGENT_MOCK", "0")
        try:
            agent.llm.mock = (force_mock != "0")
        except Exception:
            pass
    except Exception as exc:
        raise RuntimeError(f"Impossible d'initialiser l'agent IA: {exc}") from exc


@app.get("/health")
def health_check() -> dict:
    return {"status": "ok", "provider": os.getenv("LLM_PROVIDER", "groq")}


@app.post("/community/respond")
def respond_message(request: RespondMessageRequest) -> dict:
    if agent is None:
        raise HTTPException(status_code=503, detail="Agent IA non initialisé")
    result = agent.handle_incoming_message(
        message_id=request.message_id,
        incoming_text=request.incoming_text,
        page_context=request.page_context,
    )
    return {"status": "ok", "result": result}


@app.post("/community/post")
def create_post(request: CreatePostRequest) -> dict:
    if agent is None:
        raise HTTPException(status_code=503, detail="Agent IA non initialisé")
    result = agent.create_post(sujet=request.sujet, style=request.style)
    return {"status": "ok", "result": result}


@app.post("/community/copilote")
def improve_draft(request: ImproveDraftRequest) -> dict:
    if agent is None:
        raise HTTPException(status_code=503, detail="Agent IA non initialisé")
    result = agent.improve_draft(brouillon=request.brouillon, style=request.style)
    return {"status": "ok", "result": result}


@app.post("/community/run")
def run_agent(request: RunRequest) -> dict:
    if agent is None:
        raise HTTPException(status_code=503, detail="Agent IA non initialisé")
    try:
        blocks = agent.run_agent_blocks(request.messages, request.system)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    return {"status": "ok", "blocks": blocks}


@app.get("/community/config")
def config_info() -> dict:
    return {
        "provider": os.getenv("LLM_PROVIDER", "groq"),
        "model": os.getenv("GROQ_MODEL") or os.getenv("GEMINI_MODEL"),
        "api_url": os.getenv("LLM_API_URL"),
    }
