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

    # Laura10°/mapa-beta: remove its legacy Firebase bootstrap and use
    # the same official Supabase auth + automatic progress layer.
    if path.as_posix() == 'games/laura10°/mapa-beta/index.html':
        old_inline_firebase = '<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script><script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js"></script><script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js"></script><script src="../../../js/firebase-config.js?v=5"></script>'
        if old_inline_firebase in text:
            text = text.replace(old_inline_firebase, AUTH_TAG + '\n' + TAG, 1)
        else:
            if AUTH_TAG not in text:
                text = AUTH_TAG + '\n' + text

        # This beta previously called the legacy cloud synchronizer itself.
        # The central progress helper now watches localStorage and handles
        # Supabase synchronization automatically, so remove the duplicate hook.
        text = text.replace("function save(){localStorage.setItem(STORAGE,JSON.stringify(state));update();if(window.TecnomathCloudSync?.sync)window.TecnomathCloudSync.sync()}", "function save(){localStorage.setItem(STORAGE,JSON.stringify(state));update()}")
        legacy_listener = "window.addEventListener('tecnomath:cloud-status',e=>{if(e.detail?.state!=='saved'||e.detail?.gameId!=='laura10°')return;try{const remote=JSON.parse(localStorage.getItem(STORAGE)||'{}');if(Array.isArray(remote.done)){state=remote;update();if(mapReady)g.selectAll('.country').classed('done',d=>state.done.includes(d.properties?.name))}}catch(_){} });"
        text = text.replace(legacy_listener, '')

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
