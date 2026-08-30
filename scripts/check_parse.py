import ast
import traceback
import sys

def main():
    path = "community_ai_agent_new.py"
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        s = f.read()
    try:
        ast.parse(s)
        print("PARSE_OK")
    except Exception:
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
