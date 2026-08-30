"""Simple Community Manager agent using direct Groq/Gemini HTTP API calls.

This module avoids depending on LangChain agent APIs and instead implements a
lightweight function-calling pattern: the LLM is prompted to return a JSON
object describing the action to take (tool name + args). The module executes
the corresponding Python function (tool) and returns the result.

Replace the mock functions `envoyer_reponse_page` and `publier_nouveau_post`
with real integrations to your platform.
"""
from __future__ import annotations

import json
import os
import re
from typing import Any, Dict, Optional

import requests
from dotenv import load_dotenv
import uuid

load_dotenv()


def envoyer_reponse_page(message_id: str, texte: str) -> Dict[str, Any]:
    """Mock: send a reply to a private message on a page.

    Replace this with your real backend call (database update or API request).
    """
    print(f"[MOCK] envoyer_reponse_page: message_id={message_id}, texte={texte}")
    return {"status": "ok", "message_id": message_id, "response_text": texte}


def publier_nouveau_post(contenu: str) -> Dict[str, Any]:
    """Mock: publish a new post to the feed.

    Replace this with your real publish logic.
    """
    print(f"[MOCK] publier_nouveau_post: contenu={contenu}")
    return {"status": "ok", "post_content": contenu}


class LLMClient:
    """Minimal LLM client for Groq or Gemini via HTTP.

    It sends messages in an OpenAI-like `messages` format and returns the
    model's textual reply. Only a tiny subset of features is implemented to
    keep the client dependency-free and predictable.
    """

    def __init__(self):
        self.provider = os.getenv("LLM_PROVIDER", "groq").lower()
        self.api_key = os.getenv("GROQ_API_KEY") if self.provider == "groq" else os.getenv("GEMINI_API_KEY")
        # Allow forcing mock mode via env var FORCE_AGENT_MOCK (1/true yes)
        force = os.getenv("FORCE_AGENT_MOCK")
        self.force_mock = str(force).lower() in ("1", "true", "yes") if force is not None else False
        # If no API key is present and mock isn't forced off, run in mock mode to allow local testing
        self.mock = self.force_mock or (not bool(self.api_key))
        if not self.api_key:
            self.api_key = None
        self.model = os.getenv("LLM_MODEL", "llama-3")
        self.api_url = os.getenv("LLM_API_URL") or None

    def call(self, messages: list[Dict[str, str]], temperature: float = 0.6, max_tokens: int = 800) -> str:
        # Mock mode: return canned responses so examples run without API keys
        if self.mock:
            combined = "\n".join(str(m.get("content", "")) for m in messages)
            # If the system prompt asks for JSON action (CommunityManagerSimple), return an action
            if "Gestionnaire de Communauté" in combined or "RESPONSE FORMAT" in combined:
                # Heuristics to choose action based on user prompt
                # Inspect only the user message (last message) to avoid matching tool names in system prompt
                last_content = messages[-1].get("content", "") or ""
                if isinstance(last_content, list):
                    last_content = " ".join(
                        str(item.get("content", item.get("text", ""))) if isinstance(item, dict) else str(item)
                        for item in last_content
                    )
                user_text = str(last_content).lower()
                # Prefer reply detection when the user asks for a response to a message
                if "réponse" in user_text or "répondre" in user_text or "repondre" in user_text:
                    return json.dumps({"action": "repondre_message", "args": {"message_id": "msg_123", "texte": "Bonjour ! Merci pour votre question — oui, nous proposons des publications automatiques."}})
                # Otherwise, detect post creation requests
                if "rédige un post" in user_text or ("rédige" in user_text and "post" in user_text) or "post" in user_text:
                    return json.dumps({"action": "creer_post", "args": {"contenu": "Nouveau guide pour améliorer l'engagement client. Découvrez nos conseils pratiques. #engagement #B2B"}})
                if any(word in user_text for word in ("bonjour", "salut", "hello")):
                    result = "Bonjour ! Je suis là pour vous accompagner dans LynoraLink. Vous pouvez me demander de vous expliquer une fonctionnalité, de consulter vos notifications ou de rechercher une personne dans votre réseau."
                elif "notification" in user_text:
                    result = "Je peux consulter vos notifications et vous aider à comprendre ce qui s'est passé. Voulez-vous voir les plus récentes ou uniquement celles qui ne sont pas encore lues ?"
                elif any(word in user_text for word in ("profil", "titre", "présentation")):
                    result = "Je peux vous guider dans votre profil pour vérifier votre présentation ou votre titre professionnel. Souhaitez-vous le consulter ou le modifier ?"
                elif any(word in user_text for word in ("réseau", "connexion", "contact", "personne")):
                    result = "Je peux rechercher une personne par nom, poste ou entreprise dans votre réseau. Quel profil ou quelle compétence recherchez-vous ?"
                else:
                    result = f"Je comprends votre demande : « {last_content} ». Je peux vous expliquer les fonctionnalités de LynoraLink, consulter votre activité ou vous guider dans une action. Que souhaitez-vous faire précisément ?"
                return json.dumps({"action": None, "result": result})

            # If the system prompt is for rewriting, return an improved draft
            if "assistant professionnel de réécriture" in combined or "Améliore ce brouillon" in combined:
                m = re.search(r"Brouillon:\s*(.*)", combined, flags=re.S)
                draft = m.group(1).strip() if m else combined.strip()
                return draft + " [AMÉLIORÉ]"

            return "MOCK RESPONSE"

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        # Provider-specific HTTP call
        if self.provider == "groq":
            groq_payload = {
                "model": self.model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
            }
            url = self.api_url or "https://api.groq.com/openai/v1/chat/completions"
            headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
            try:
                r = requests.post(url, headers=headers, json=groq_payload, timeout=30)
                r.raise_for_status()
                data = r.json()
            except requests.RequestException as e:
                # Network/DNS issues can happen in developer environments; fall back to mock behavior
                print("[WARN] Network error contacting Groq, falling back to mock response:", e)
                prev_mock = self.mock
                try:
                    self.mock = True
                    return self.call(messages)
                finally:
                    self.mock = prev_mock
        else:
            url = self.api_url or f"https://gemini.googleapis.com/v1beta2/models/{self.model}:generateMessage"
            headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
            r = requests.post(url, headers=headers, json=payload, timeout=30)
            r.raise_for_status()
            data = r.json()

        # Robust extraction of textual content from different provider shapes
        # 1) Groq may return `output` as list of segments
        out = None
        try:
            if isinstance(data, dict):
                if "output" in data and isinstance(data["output"], list):
                    parts = []
                    for seg in data["output"]:
                        if isinstance(seg, dict):
                            # common keys
                            for key in ("content", "text", "message"):
                                if key in seg and isinstance(seg[key], str):
                                    parts.append(seg[key])
                                    break
                        else:
                            parts.append(str(seg))
                    out = "".join(parts)
                elif "choices" in data and isinstance(data["choices"], list) and data["choices"]:
                    choice = data["choices"][0]
                    # OpenAI-like response
                    message = choice.get("message") or {}
                    content = message.get("content")
                    if isinstance(content, list):
                        out = "".join([seg.get("content", "") if isinstance(seg, dict) else str(seg) for seg in content])
                    elif isinstance(content, str):
                        out = content
                    elif isinstance(choice.get("text"), str):
                        out = choice.get("text")
                elif isinstance(data.get("text"), str):
                    out = data.get("text")
        except Exception:
            out = None

        if out is not None:
            return out
        return json.dumps(data)


class CommunityManagerSimple:
    """Lightweight community manager that asks the LLM what to do and runs tools.

    Rationale: instead of depending on LangChain agent machinery (which can be
    version-dependent), we prompt the LLM to return a small JSON payload that
    indicates the action and arguments. This payload is validated and executed
    by the Python code.
    """

    SYSTEM_PROMPT = (
        "Tu es Gestionnaire de Communauté. Tu peux appeler ces outils en retour\n"
        "RESPONSE FORMAT: Strictement renvoyer un JSON seul dans ta réponse (aucun \n'"
        "texte libre) avec la forme : {\"action\": \"tool_name\", \"args\": { ... }}\n"
        "Outils disponibles :\n"
        "- repondre_message: args {message_id: str, texte: str}\n"
        "- creer_post: args {contenu: str}\n"
        "- ameliorer_brouillon: args {draft: str, style: str, instructions: str}\n"
        "Donne toujours du JSON valide même si tu choisis de ne pas appeler d'outil:"
        " {\"action\": null, \"result\": \"texte de sortie\"}"
    )

    PLATFORM_SYSTEM_PROMPT = (
        "Tu es l'assistant de LynoraLink. Comprends le contexte de la plateforme fourni par le client. "
        "Réponds uniquement avec un JSON valide : {\"action\": \"nom_outil\", \"args\": {...}} "
        "pour une action, ou {\"action\": null, \"result\": \"réponse en français\"} pour une question. "
        "Outils disponibles : get_context, get_notifications, get_connections, search_network, navigate, "
        "create_post, send_connection_request, remove_connection, follow_page, edit_profile_headline, "
        "mark_notifications_read, open_company_monetization. "
        "Arguments : search_network{query}, navigate{view}, create_post{text}, "
        "send_connection_request{name}, remove_connection{name}, follow_page{pageName}, "
        "edit_profile_headline{headline}. "
        "N'invente jamais une donnée. Si la question demande seulement une explication, réponds sans outil."
    )

    def __init__(self):
        self.llm = LLMClient()

    def _extract_json(self, text: str) -> Optional[Dict[str, Any]]:
        # Extract first JSON object from arbitrary text
        m = re.search(r"(\{[\s\S]*\})", text)
        if not m:
            return None
        s = m.group(1)
        try:
            return json.loads(s)
        except Exception:
            # Try to fix common LLM quirks (single quotes -> double quotes)
            s2 = s.replace("\'", '"')
            try:
                return json.loads(s2)
            except Exception:
                return None

    def _call_tools(self, action: str, args: Dict[str, Any]) -> Dict[str, Any]:
        if action == "repondre_message":
            return envoyer_reponse_page(message_id=args["message_id"], texte=args["texte"])
        if action == "creer_post":
            return publier_nouveau_post(contenu=args["contenu"])
        if action == "ameliorer_brouillon":
            # Use internal helper to rewrite text
            improved = self._rewrite_text(args.get("draft", ""), style=args.get("style", "professionnel"), instructions=args.get("instructions"))
            return {"status": "ok", "improved": improved}
        return {"status": "error", "error": "unknown_action"}

    def _rewrite_text(self, draft: str, style: str = "professionnel", instructions: Optional[str] = None) -> str:
        prompt = (
            "Améliore ce brouillon: corrige les fautes, clarifie le message, ajoute des hashtags pertinents"
            f" et adapte le style: {style}. {instructions or ''}\n\nBrouillon:\n{draft}"
        )
        messages = [{"role": "system", "content": "Tu es un assistant professionnel de réécriture."}, {"role": "user", "content": prompt}]
        return self.llm.call(messages)

    def run_commander(self, user_prompt: str) -> Dict[str, Any]:
        """Ask the model what to do and execute the chosen tool.

        Returns a dict with action, tool_result and raw_model_text.
        """
        messages = [{"role": "system", "content": self.SYSTEM_PROMPT}, {"role": "user", "content": user_prompt}]
        raw = self.llm.call(messages)
        parsed = self._extract_json(raw)
        if not parsed:
            return {"action": None, "tool_result": None, "raw": raw, "error": "no_json"}
        action = parsed.get("action")
        args = parsed.get("args", {})
        if action is None:
            return {"action": None, "result": parsed.get("result"), "raw": raw}
        # Validate args is dict
        if not isinstance(args, dict):
            return {"action": action, "tool_result": None, "raw": raw, "error": "args_not_object"}
        tool_result = self._call_tools(action, args)
        return {"action": action, "tool_result": tool_result, "raw": raw}

    def run_agent_blocks(self, messages: list[Dict[str, Any]], system_prompt: str = "") -> list[Dict[str, Any]]:
        """Run the agent and return a list of structured blocks including `tool_use` and `tool_result`.

        Input: `messages` is the conversation history (list of dicts or strings).
        Output: list of blocks, each block is a dict with a `type` field: 'text', 'tool_use', 'tool_result'.
        """
        # Preserve the conversation turns so the model can use the latest question
        # and the preceding answers/tool results as context.
        full_system_prompt = self.PLATFORM_SYSTEM_PROMPT
        if system_prompt.strip():
            full_system_prompt += f"\n\nCONTEXTE DE L'APPLICATION :\n{system_prompt.strip()}"
        conversation = []
        for message in messages if isinstance(messages, list) else [{"role": "user", "content": str(messages)}]:
            if not isinstance(message, dict):
                conversation.append({"role": "user", "content": str(message)})
                continue
            role = message.get("role") if message.get("role") in ("user", "assistant") else "user"
            conversation.append({"role": role, "content": message.get("content", "")})
        messages_for_llm = [{"role": "system", "content": full_system_prompt}, *conversation]
        raw = self.llm.call(messages_for_llm)
        parsed = self._extract_json(raw)

        blocks: list[Dict[str, Any]] = []
        # If no JSON, return textual block with raw output
        if not parsed:
            blocks.append({"type": "text", "text": raw})
            return blocks

        action = parsed.get("action")
        args = parsed.get("args", {}) if isinstance(parsed.get("args"), dict) else {}

        if action is None:
            # final text result
            blocks.append({"type": "text", "text": parsed.get("result") or raw})
            return blocks

        # Create a tool_use block
        tuid = str(uuid.uuid4())
        tool_use = {"type": "tool_use", "id": tuid, "name": action, "input": args}
        blocks.append(tool_use)

        # The React client owns execution because it has the live application
        # state and can request confirmation for sensitive actions.
        return blocks

    # Convenience wrappers
    def handle_incoming_message(self, message_id: str, incoming_text: str, page_context: str) -> Dict[str, Any]:
        prompt = (
            f"Contexte de la page: {page_context}\nMessage reçu: {incoming_text}\n\n"
            "Rédige une réponse adaptée et appelle l'outil repondre_message via le format JSON requis."
        )
        return self.run_commander(prompt)

    def create_post(self, sujet: str, style: str = "professionnel") -> Dict[str, Any]:
        prompt = f"Rédige un post sur: {sujet}. Style: {style}. Réponds avec le JSON d'appel de l'outil creer_post."
        return self.run_commander(prompt)

    def improve_draft(self, brouillon: str, style: str = "professionnel", instructions: Optional[str] = None) -> Dict[str, Any]:
        # For drafting we directly call _rewrite_text to get a clean textual improvement
        improved = self._rewrite_text(brouillon, style=style, instructions=instructions)
        return {"status": "ok", "improved": improved}
