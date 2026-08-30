from pathlib import Path
import sys

p = Path('community_ai_agent.py')
print('cwd', Path.cwd())
print('exists', p.exists())
print('size', p.stat().st_size)
b = p.read_bytes()
print('null_count', b.count(b'\x00'))
print('first200', b[:200])
try:
    import langchain
    print('langchain', langchain.__version__)
    from langchain.agents.factory import create_agent
    print('create_agent ok')
    from langchain.chat_models import init_chat_model
    print('init_chat_model ok')
    from langchain.tools import tool
    print('tool ok')
except Exception as e:
    print('langchain error', type(e).__name__, e)
