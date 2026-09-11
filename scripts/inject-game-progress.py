from pathlib import Path

ROOT = Path('.')
TAG = '<script src="/js/tecnomath-progress.js?v=20260911-9"></script>'
AUTH_TAG = '<script src="/js/tecnomath-auth.js"></script>'
SKIP_PARTS = {'.git', 'node_modules'}

changed = []
for path in ROOT.glob('games/**/index.html'):
    if any(part in SKIP_PARTS for part in path.parts):
        continue

    text = path.read_text(encoding='utf-8')
    original = text

    # Laura10°/Banderquiz: migrate its old Firebase progress bootstrap
    # to the single official TecnoMath Supabase system.
    if path.as_posix() == 'games/laura10°/index.html':
        old = '''    <script src="https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.22.2/firebase-auth-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.22.2/firebase-database-compat.js"></script>
    <script src="../../js/firebase-config.js"></script>
    <script src="../../js/game-progress.js" data-tecnomath-game="banderquiz"></script>'''
        if old in text:
            text = text.replace(old, AUTH_TAG + '\n' + TAG, 1)

    # Ensure every game gets the central progress loader.
    if 'tecnomath-progress.js' not in text:
        lower = text.lower()
        if '</head>' in lower:
            pos = lower.index('</head>')
            text = text[:pos] + TAG + '\n' + text[pos:]
        elif '<body' in lower:
            pos = lower.index('<body')
            text = text[:pos] + TAG + '\n' + text[pos:]
        else:
            text = TAG + '\n' + text

    if text != original:
        path.write_text(text, encoding='utf-8')
        changed.append(str(path))

print(f'Juegos conectados/migrados automáticamente: {len(changed)}')
for item in changed:
    print(item)
