import requests

url = 'http://127.0.0.1:8000/community/run'
payload = {'messages':[{'role':'user','content':'Rédige un post court pour annoncer une maintenance programmée.'}]}
try:
    r = requests.post(url, json=payload, timeout=10)
    print('status', r.status_code)
    print(r.json())
except Exception as e:
    print('error', e)
