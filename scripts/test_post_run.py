import requests

payload = {
    "messages": [
        {"role": "user", "content": "Rédige un post court annonçant une nouvelle fonctionnalité produit et renvoie le JSON d'appel de l'outil creer_post."}
    ]
}

resp = requests.post("http://127.0.0.1:8000/community/run", json=payload, timeout=15)
print(resp.status_code)
print(resp.text)
