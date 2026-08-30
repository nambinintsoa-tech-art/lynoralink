from community_ai_agent_new import CommunityManagerSimple


def main():
    agent = CommunityManagerSimple()
    # Force mock mode for local example runs (no API keys needed)
    try:
        agent.llm.mock = True
    except Exception:
        pass

    print("\n=== SCENARIO 1 : Répondre à un message privé ===")
    response = agent.handle_incoming_message(
        message_id="msg_123",
        incoming_text="Bonjour, j'aimerais savoir si vous proposez des fonctionnalités de publication automatique pour une page entreprise ?",
        page_context="Page entreprise dédiée à des conseils marketing et publications B2B.",
    )
    print(response)

    print("\n=== SCENARIO 2 : Rédiger et créer un post ===")
    response = agent.create_post(
        sujet="Nouveau guide sur l'engagement client",
        style="LinkedIn professionnel",
    )
    print(response)

    print("\n=== SCENARIO 3 : Mode Copilote - Améliorer un brouillon ===")
    response = agent.improve_draft(
        brouillon="J'ai écrit un post sur notre nouvelle offre d'abonnement. Peut-être un peu trop simple. Besoin de hashtags et d'un ton plus impactant.",
        style="engageant",
    )
    print(response)


if __name__ == "__main__":
    main()
