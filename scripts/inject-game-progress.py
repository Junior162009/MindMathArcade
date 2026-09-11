from pathlib import Path

ROOT = Path('.')
TAG = '<script src="/js/tecnomath-progress.js?v=20260911-8"></script>'
SKIP_PARTS = {'.git', 'node_modules'}

changed = []
for path in ROOT.glob('games/**/index.html'):
    if any(part in SKIP_PARTS for part in path.parts):
        continue
    text = path.read_text(encoding='utf-8')
    if 'tecnomath-progress.js' in text:
        continue
    lower = text.lower()
    if '</head>' in lower:
        pos = lower.index('</head>')
        text = text[:pos] + TAG + '\n' + text[pos:]
    elif '<body' in lower:
        pos = lower.index('<body')
        text = text[:pos] + TAG + '\n' + text[pos:]
    else:
        text = TAG + '\n' + text
    path.write_text(text, encoding='utf-8')
    changed.append(str(path))

print(f'Juegos conectados automáticamente: {len(changed)}')
for item in changed:
    print(item)
