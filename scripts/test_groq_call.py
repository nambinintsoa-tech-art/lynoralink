import json
import os
import sys
from dotenv import load_dotenv

load_dotenv()

# Ensure we can import the module from the repository root when running from scripts/
root = os.path.dirname(os.path.dirname(__file__))
if root not in sys.path:
    sys.path.insert(0, root)

# Ensure FORCE_AGENT_MOCK is not set to true
if os.getenv("FORCE_AGENT_MOCK"):
    os.environ["FORCE_AGENT_MOCK"] = os.environ.get("FORCE_AGENT_MOCK")

from community_ai_agent_new import CommunityManagerSimple

def main():
    agent = CommunityManagerSimple()
    prompt = "Rédige un post court annonçant une nouvelle fonctionnalité produit et renvoie le JSON d'appel de l'outil creer_post."
    blocks = agent.run_agent_blocks([{"role": "user", "content": prompt}])
    print(json.dumps(blocks, ensure_ascii=False, indent=2))

if __name__ == '__main__':
    main()
