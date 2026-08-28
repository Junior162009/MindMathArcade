import base64
import html
import json
import os
import re
import shutil
import subprocess
import urllib.request
import zipfile
from datetime import datetime, timezone
from pathlib import Path

DB = os.environ['FIREBASE_DB'].rstrip('/')
ACCESS_TOKEN = os.environ.get('FIREBASE_ACCESS_TOKEN', '').strip()
RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '').strip()
RESEND_FROM = os.environ.get('RESEND_FROM', 'TecnoMath <onboarding@resend.dev>').strip()
SITE_URL = 'https://tecnomath.online'

if not ACCESS_TOKEN:
    raise RuntimeError('FIREBASE_ACCESS_TOKEN no está disponible. Configura FIREBASE_SERVICE_ACCOUNT en GitHub Actions.')

# Leer la cola completa con el token OAuth2 y filtrar en Python.
# Evitamos orderBy/equalTo para no depender de índices ni de diferencias
# de validación de la API REST de Realtime Database.
queue_url = f'{DB}/publicGameQueue.json?access_token={ACCESS_TOKEN}'
queue_request = urllib.request.Request(
    queue_url,
    headers={
        'User-Agent': 'TecnoMath-GitHub-Publisher/9.0',
        'Accept': 'application/json',
    },
)
with urllib.request.urlopen(queue_request, timeout=120) as response:
    raw_queue = response.read().decode('utf-8') or '{}'
    raw_queue = json.loads(raw_queue)

if not raw_queue:
    queue = {}
elif isinstance(raw_queue, dict):
    queue = {
        str(key): value
        for key, value in raw_queue.items()
        if isinstance(value, dict) and str(value.get('status', '')).lower() == 'approved'
    }
else:
    raise RuntimeError('La respuesta de publicGameQueue no tiene un formato JSON válido.')


def slug(value):
    value = re.sub(r'[^a-z0-9]+', '-', str(value or 'juego').lower()).strip('-')
    return value[:60] or 'juego'


def firebase_patch(path, payload):
    body = json.dumps(payload).encode('utf-8')
    url = f'{DB}/{path}.json?access_token={ACCESS_TOKEN}'
    req = urllib.request.Request(
        url,
        data=body,
        headers={
            'User-Agent': 'TecnoMath-GitHub-Publisher/9.0',
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        method='PATCH',
    )
    with urllib.request.urlopen(req, timeout=60) as response:
        return json.loads(response.read().decode('utf-8') or '{}')


def send_email(to, subject, html_body):
    if not RESEND_API_KEY or not to:
        return False
    payload = json.dumps({'from': RESEND_FROM, 'to': [to], 'subject': subject, 'html': html_body}).encode('utf-8')
    req = urllib.request.Request(
        'https://api.resend.com/emails',
        data=payload,
        headers={'Authorization': f'Bearer {RESEND_API_KEY}', 'Content-Type': 'application/json'},
        method='POST',
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            response.read()
        return True
    except Exception as exc:
        print(f'ADVERTENCIA: no se pudo enviar correo a {to}: {exc}')
        return False


def safe_extract(zf, out):
    for info in zf.infolist():
        name = info.filename.replace('\\', '/').lstrip('/')
        parts = [p for p in name.split('/') if p]
        if not parts or '..' in parts:
            continue
        target = out.joinpath(*parts)
        if info.is_dir():
            target.mkdir(parents=True, exist_ok=True)
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            with zf.open(info) as src, target.open('wb') as dst:
                shutil.copyfileobj(src, dst)


def unpack(encoded, work):
    raw = base64.b64decode(encoded, validate=True)
    package = work / 'game.zip'
    package.write_bytes(raw)
    out = work / 'extracted'
    out.mkdir(parents=True, exist_ok=True)
    try:
        with zipfile.ZipFile(package) as zf:
            safe_extract(zf, out)
    except zipfile.BadZipFile:
        subprocess.run(['7z', 'x', '-y', f'-o{out}', str(package)], check=True, stdout=subprocess.DEVNULL)
    return out


def find_index(root):
    for name in ('index.html', 'index.htm'):
        if (root / name).exists():
            return root / name
    found = list(root.rglob('index.html')) + list(root.rglob('index.htm'))
    return found[0] if found else None


def install_game(src, dest):
    index = find_index(src)
    if not index:
        raise RuntimeError('El paquete no contiene index.html ni index.htm.')
    root = index.parent
    if dest.exists():
        shutil.rmtree(dest)
    dest.mkdir(parents=True, exist_ok=True)
    for item in root.iterdir():
        if not item.name.startswith('.'):
            target = dest / item.name
            if item.is_dir():
                shutil.copytree(item, target)
            else:
                shutil.copy2(item, target)


games_dir = Path('games')
data_dir = Path('data')
games_dir.mkdir(parents=True, exist_ok=True)
data_dir.mkdir(parents=True, exist_ok=True)
catalog_file = data_dir / 'games.json'
public_file = games_dir / 'published-games.json'

try:
    catalog = json.loads(catalog_file.read_text(encoding='utf-8')) if catalog_file.exists() else []
    if not isinstance(catalog, list):
        catalog = []
except Exception:
    catalog = []

published_ids = {
    str(x.get('submissionId'))
    for x in catalog
    if isinstance(x, dict) and x.get('submissionId')
}

changed = False
published = []

for submission_id, game in queue.items():
    submission_id = str(submission_id)
    if submission_id in published_ids:
        continue
    if not isinstance(game, dict):
        continue

    name = str(game.get('name') or 'Juego').strip() or 'Juego'
    folder = f'{slug(name)}-{re.sub(r"[^A-Za-z0-9_-]", "", submission_id)[:40] or "game"}'
    destination = games_dir / folder
    source_type = str(game.get('sourceType') or 'upload')

    try:
        if source_type == 'url':
            game_url = str(game.get('gameUrl') or '').strip()
            if not re.match(r'^https?://', game_url, re.I):
                raise RuntimeError('URL del juego inválida.')
            destination.mkdir(parents=True, exist_ok=True)
            title = html.escape(name)
            page = (
                '<!doctype html><html lang="es"><head><meta charset="utf-8">'
                '<meta name="viewport" content="width=device-width,initial-scale=1">'
                f'<title>{title}</title></head><body><script>'
                f'location.replace({json.dumps(game_url)});'
                '</script><noscript><a href='
                f'{json.dumps(game_url)}>Abrir juego</a></noscript></body></html>'
            )
            (destination / 'index.html').write_text(page, encoding='utf-8')
        else:
            encoded = game.get('packageBase64')
            if not encoded:
                raise RuntimeError('El envío aprobado no contiene el paquete del juego.')
            work = Path('/tmp') / f'tecnomath-{submission_id}'
            shutil.rmtree(work, ignore_errors=True)
            work.mkdir(parents=True, exist_ok=True)
            install_game(unpack(encoded, work), destination)

        entry = {
            'name': name,
            'desc': str(game.get('description') or 'Juego educativo de TecnoMath'),
            'url': f'games/{folder}/index.html',
            'imageUrl': str(game.get('imageUrl') or ''),
            'icon': str(game.get('icon') or '🎮'),
            'category': str(game.get('category') or 'otros'),
            'deviceCompatibility': 'both',
            'evento': None,
            'submissionId': submission_id,
            'authorName': str(game.get('authorName') or 'Usuario'),
            'authorEmail': str(game.get('authorEmail') or ''),
            'sourceType': source_type,
            'publishedAt': datetime.now(timezone.utc).isoformat(),
        }
        catalog.append(entry)
        published_ids.add(submission_id)
        changed = True
        published.append((submission_id, game, entry))
        print(f'PUBLICADO: {name} -> {entry["url"]}')
    except Exception as exc:
        print(f'ERROR publicando {submission_id}: {exc}')


if changed:
    payload = json.dumps(catalog, ensure_ascii=False, indent=2) + '\n'
    catalog_file.write_text(payload, encoding='utf-8')
    public_file.write_text(payload, encoding='utf-8')

    subprocess.run(['git', 'config', 'user.name', 'github-actions[bot]'], check=True)
    subprocess.run(['git', 'config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com'], check=True)
    subprocess.run(['git', 'add', 'games', 'data/games.json'], check=True)

    if subprocess.run(['git', 'diff', '--cached', '--quiet']).returncode != 0:
        subprocess.run(['git', 'commit', '-m', 'feat: publish approved games and notify authors'], check=True)
        subprocess.run(['git', 'push'], check=True)

    for submission_id, game, entry in published:
        published_url = f'{SITE_URL}/{entry["url"]}'
        published_time = datetime.now(timezone.utc).isoformat()
        firebase_patch(
            f'gameSubmissions/{submission_id}',
            {'status': 'published', 'publishedAt': published_time, 'publishedUrl': published_url},
        )
        firebase_patch(
            f'gameUploadQueue/{submission_id}',
            {'status': 'published', 'publishedAt': published_time, 'publishedUrl': published_url},
        )

        email = str(game.get('authorEmail') or '').strip()
        if email:
            game_name = html.escape(entry['name'])
            game_url = html.escape(published_url)
            author_name = html.escape(str(game.get('authorName') or ''))
            body = (
                '<div style="font-family:Arial,sans-serif">'
                '<h2>🎉 ¡Tu juego ya está publicado!</h2>'
                f'<p>Hola {author_name},</p>'
                f'<p>Tu juego <b>{game_name}</b> fue aprobado y ya está disponible en TecnoMath.</p>'
                f'<p><a href="{game_url}">🎮 Abrir mi juego</a></p>'
                '<p>¡Gracias por crear con TecnoMath!</p></div>'
            )
            send_email(email, f'🎉 ¡Tu juego {entry["name"]} ya está publicado en TecnoMath!', body)
else:
    print('No hubo juegos nuevos para publicar.')
