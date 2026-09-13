import html, json, os, re, shutil, subprocess, tempfile, urllib.error, urllib.request, urllib.parse, zipfile
from datetime import datetime, timezone
from pathlib import Path

SUPABASE_URL=os.environ['SUPABASE_URL'].rstrip('/')
SUPABASE_KEY=os.environ['SUPABASE_SERVICE_ROLE_KEY']
RESEND_API_KEY=os.environ.get('RESEND_API_KEY','').strip()
RESEND_FROM=os.environ.get('RESEND_FROM','TecnoMath <notificaciones@tecnomath.online>').strip()
SITE_URL='https://tecnomath.online'
TABLE=f'{SUPABASE_URL}/rest/v1/tecnomath_game_submissions'
HEADERS={'apikey':SUPABASE_KEY,'Authorization':f'Bearer {SUPABASE_KEY}','Content-Type':'application/json','Accept':'application/json','Prefer':'return=representation'}

def request(method,url,payload=None,headers=None):
 h=dict(HEADERS);h.update(headers or {});data=json.dumps(payload,ensure_ascii=False).encode() if payload is not None else None
 req=urllib.request.Request(url,data=data,headers=h,method=method)
 try:
  with urllib.request.urlopen(req,timeout=120) as r:return json.loads(r.read().decode() or 'null')
 except urllib.error.HTTPError as e:raise RuntimeError(f'Supabase HTTP {e.code}: {e.read().decode("utf-8","replace")}')

def slug(v):return re.sub(r'[^a-z0-9]+','-',str(v or 'juego').lower()).strip('-')[:60] or 'juego'
def safe_extract(zf,out):
 for info in zf.infolist():
  name=info.filename.replace('\\','/').lstrip('/');parts=[p for p in name.split('/') if p]
  if not parts or '..' in parts:continue
  target=out.joinpath(*parts)
  if info.is_dir():target.mkdir(parents=True,exist_ok=True)
  else:
   target.parent.mkdir(parents=True,exist_ok=True)
   with zf.open(info) as src,target.open('wb') as dst:shutil.copyfileobj(src,dst)
def find_index(root):
 for n in ('index.html','index.htm'):
  if (root/n).exists():return root/n
 found=list(root.rglob('index.html'))+list(root.rglob('index.htm'));return found[0] if found else None
def install_zip(raw,dest):
 work=Path(tempfile.mkdtemp(prefix='tm-game-'));zip_path=work/'game.zip';zip_path.write_bytes(raw);out=work/'extracted';out.mkdir()
 try:
  with zipfile.ZipFile(zip_path) as z:safe_extract(z,out)
 except zipfile.BadZipFile:raise RuntimeError('El archivo guardado en Storage no es un ZIP válido.')
 index=find_index(out)
 if not index:raise RuntimeError('El paquete no contiene index.html ni index.htm.')
 root=index.parent
 if dest.exists():shutil.rmtree(dest)
 dest.mkdir(parents=True,exist_ok=True)
 for item in root.iterdir():
  if not item.name.startswith('.'):
   target=dest/item.name
   shutil.copytree(item,target) if item.is_dir() else shutil.copy2(item,target)
 shutil.rmtree(work,ignore_errors=True)
def download_storage(path):
 url=f'{SUPABASE_URL}/storage/v1/object/game-submissions/{urllib.parse.quote(path,safe="/")}'
 return request('GET',url)
def patch_submission(id,payload):return request('PATCH',f'{TABLE}?id=eq.{urllib.parse.quote(id)}',payload)
def send_email(to,subject,body):
 if not RESEND_API_KEY or not to:return
 payload={'from':RESEND_FROM,'to':[to],'subject':subject,'html':body}
 try:request('POST','https://api.resend.com/emails',payload,{'Authorization':f'Bearer {RESEND_API_KEY}'})
 except Exception as e:print('ADVERTENCIA: correo no enviado:',e)

rows=request('GET',f'{TABLE}?status=eq.approved&select=*') or []
print(f'Supabase: {len(rows)} juego(s) aprobado(s) pendientes de publicación.')
if not rows:raise SystemExit(0)

games_dir=Path('games');data_dir=Path('data');games_dir.mkdir(exist_ok=True);data_dir.mkdir(exist_ok=True);catalog_file=data_dir/'games.json';public_file=games_dir/'published-games.json'
try:catalog=json.loads(catalog_file.read_text(encoding='utf-8')) if catalog_file.exists() else []
except Exception:catalog=[]
if not isinstance(catalog,list):catalog=[]
published_ids={str(x.get('submissionId')) for x in catalog if isinstance(x,dict) and x.get('submissionId')}
changed=False
for g in rows:
 id=str(g['id'])
 if id in published_ids:continue
 name=str(g.get('name') or 'Juego').strip() or 'Juego';folder=f'{slug(name)}-{re.sub(r"[^A-Za-z0-9_-]", "", id)[:12]}';dest=games_dir/folder
 try:
  if g.get('source_type')=='url':
   game_url=str(g.get('game_url') or '').strip()
   if not re.match(r'^https?://',game_url,re.I):raise RuntimeError('URL del juego inválida.')
   dest.mkdir(parents=True,exist_ok=True);title=html.escape(name)
   (dest/'index.html').write_text(f'<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{title}</title></head><body><script>location.replace({json.dumps(game_url)});</script><noscript><a href={json.dumps(game_url)}>Abrir juego</a></noscript></body></html>',encoding='utf-8')
  else:
   path=str(g.get('package_path') or '')
   if not path:raise RuntimeError('El envío aprobado no tiene package_path.')
   raw=download_storage(path);install_zip(raw,dest)
  published_at=datetime.now(timezone.utc).isoformat();published_url=f'{SITE_URL}/games/{folder}/index.html'
  entry={'name':name,'desc':str(g.get('description') or 'Juego educativo de TecnoMath'),'url':f'games/{folder}/index.html','imageUrl':str(g.get('image_url') or ''),'icon':str(g.get('icon') or '🎮'),'category':str(g.get('category') or 'otros'),'deviceCompatibility':'both','evento':None,'submissionId':id,'authorName':str(g.get('author_name') or 'Usuario'),'authorEmail':str(g.get('author_email') or ''),'sourceType':str(g.get('source_type') or 'upload'),'publishedAt':published_at}
  catalog.append(entry);published_ids.add(id);changed=True;print(f'PUBLICADO: {name} -> {entry["url"]}')
  patch_submission(id,{'status':'published','published_at':published_at,'published_url':published_url,'published_path':entry['url']})
  email=str(g.get('author_email') or '').strip()
  if email:send_email(email,f'🎉 ¡Tu juego {name} ya está publicado en TecnoMath!',f'<div style="font-family:Arial,sans-serif"><h2>🎉 ¡Tu juego ya está publicado!</h2><p>Hola {html.escape(str(g.get("author_name") or ""))},</p><p>Tu juego <b>{html.escape(name)}</b> fue aprobado y ya está disponible.</p><p><a href="{published_url}">🎮 Abrir mi juego</a></p><p>¡Gracias por crear con TecnoMath!</p></div>')
 except Exception as e:
  print(f'ERROR publicando {id}: {e}')
  patch_submission(id,{'admin_notes':f'Error de publicación: {e}'})
if changed:
 payload=json.dumps(catalog,ensure_ascii=False,indent=2)+'\n';catalog_file.write_text(payload,encoding='utf-8');public_file.write_text(payload,encoding='utf-8')
 subprocess.run(['git','config','user.name','github-actions[bot]'],check=True);subprocess.run(['git','config','user.email','41898282+github-actions[bot]@users.noreply.github.com'],check=True);subprocess.run(['git','add','games','data/games.json'],check=True)
 if subprocess.run(['git','diff','--cached','--quiet']).returncode!=0:
  subprocess.run(['git','commit','-m','feat: publish approved games from Supabase'],check=True);subprocess.run(['git','push','--rebase','origin','main'],check=True)
