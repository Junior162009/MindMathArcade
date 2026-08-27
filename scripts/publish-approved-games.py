import base64
import json
import os
import re
import shutil
import subprocess
import urllib.parse
import urllib.request
import zipfile
from datetime import datetime, timezone
from pathlib import Path

DB = os.environ['FIREBASE_DB'].rstrip('/')
ACCESS_TOKEN = os.environ.get('FIREBASE_ACCESS_TOKEN', '').strip()

if not ACCESS_TOKEN:
    raise RuntimeError('FIREBASE_ACCESS_TOKEN no está disponible. Configura FIREBASE_SERVICE_ACCOUNT en GitHub Actions.')

query = urllib.parse.urlencode({'orderBy': '"status"', 'equalTo': '"approved"', 'limitToFirst': '20'})
headers = {
    'User-Agent': 'TecnoMath-GitHub-Publisher/7.0',
    'Accept': 'application/json',
    'Authorization': f'Bearer {ACCESS_TOKEN}',
}
request = urllib.request.Request(f'{DB}/publicGameQueue.json?{query}', headers=headers)
with urllib.request.urlopen(request, timeout=120) as response:
    queue = json.loads(response.read().decode('utf-8') or '{}') or {}


def slug(value):
    value = re.sub(r'[^a-z0-9]+', '-', str(value or 'juego').lower()).strip('-')
    return value[:60] or 'juego'


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
        if item.name.startswith('.'):
            continue
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

published_ids = {str(x.get('submissionId')) for x in catalog if isinstance(x, dict) and x.get('submissionId')}
changed = False

for submission_id, game in queue.items():
    if not isinstance(game, dict):
        continue
    submission_id = str(submission_id)
    if submission_id in published_ids:
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
            title = (name.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;'))
            html = f'<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{title}</title></head><body><script>location.replace({json.dumps(game_url)});</script><noscript><a href={json.dumps(game_url)}>Abrir juego</a></noscript></body></html>'
            (destination / 'index.html').write_text(html, encoding='utf-8')
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
        subprocess.run(['git', 'commit', '-m', 'feat: publish approved games without Cloud Functions'], check=True)
        subprocess.run(['git', 'push'], check=True)
else:
    print('No hubo juegos nuevos para publicar.')
