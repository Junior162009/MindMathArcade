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

    # mapa-beta: wait for the Supabase account progress before reading the
    # game's local state, otherwise a fresh device can render the default
    # 0/195 state before the cloud snapshot is restored.
    if path.as_posix() == 'games/laura10°/mapa-beta/index.html':
        old_state = "let state=JSON.parse(localStorage.getItem(STORAGE)||'{\"done\":[],\"score\":0,\"streak\":0}'),selected=null,mapReady=false;"
        new_state = "let state={done:[],score:0,streak:0},selected=null,mapReady=false;"
        if old_state in text:
            text = text.replace(old_state, new_state, 1)

        old_promise = "Promise.all([fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json').then(r=>{if(!r.ok)throw new Error('map');return r.json()}),fetch(FLAG_URL).then(r=>{if(!r.ok)throw new Error('flags');return r.json()})]).then(([world,flags])=>{buildFlagIndex(flags);"
        new_promise = "Promise.all([window.TecnoMathProgress?window.TecnoMathProgress.restore('banderquiz-mundo').catch(()=>null):Promise.resolve(null),fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json').then(r=>{if(!r.ok)throw new Error('map');return r.json()}),fetch(FLAG_URL).then(r=>{if(!r.ok)throw new Error('flags');return r.json()})]).then(([,world,flags])=>{try{state=JSON.parse(localStorage.getItem(STORAGE)||'{\"done\":[],\"score\":0,\"streak\":0}')}catch(_){state={done:[],score:0,streak:0}}buildFlagIndex(flags);"
        if old_promise in text:
            text = text.replace(old_promise, new_promise, 1)

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
