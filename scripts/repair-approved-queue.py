import json
import os
import urllib.request

DB = os.environ['FIREBASE_DB'].rstrip('/')
TOKEN = os.environ.get('FIREBASE_ACCESS_TOKEN', '').strip()

if not TOKEN:
    raise RuntimeError('FIREBASE_ACCESS_TOKEN no disponible.')

def firebase(method, path, payload=None):
    url = f'{DB}/{path}.json'
    headers = {
        'Authorization': f'Bearer {TOKEN}',
        'Accept': 'application/json',
        'User-Agent': 'TecnoMath-Queue-Repair/1.0',
    }
    data = None
    if payload is not None:
        data = json.dumps(payload, ensure_ascii=False).encode('utf-8')
        headers['Content-Type'] = 'application/json'
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=120) as response:
            raw = response.read().decode('utf-8') or 'null'
            return json.loads(raw)
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode('utf-8', 'replace')
        raise RuntimeError(f'Firebase {method} {path}: HTTP {exc.code}: {detail}') from exc

submissions = firebase('GET', 'gameSubmissions') or {}
queue = firebase('GET', 'publicGameQueue') or {}
if not isinstance(submissions, dict):
    submissions = {}
if not isinstance(queue, dict):
    queue = {}

repaired = 0
for submission_id, game in submissions.items():
    if not isinstance(game, dict):
        continue
    if str(game.get('status', '')).lower() != 'approved':
        continue
    if game.get('publishedAt'):
        continue
    current = queue.get(submission_id)
    if isinstance(current, dict) and str(current.get('status', '')).lower() == 'approved':
        continue
    queue_data = dict(game)
    queue_data['status'] = 'approved'
    queue_data['submissionId'] = str(submission_id)
    firebase('PUT', f'publicGameQueue/{submission_id}', queue_data)
    repaired += 1
    print(f'COLA REPARADA: {game.get("name", "Juego")} ({submission_id})')

print(f'Reparación terminada. Juegos añadidos a la cola: {repaired}')
