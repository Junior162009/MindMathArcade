import json,os,re,subprocess,urllib.parse,urllib.request,tempfile,zipfile,shutil
from datetime import datetime,timezone
from pathlib import Path
U=os.environ['SUPABASE_URL'].rstrip('/');K=os.environ['SUPABASE_SERVICE_ROLE_KEY'].strip();B=U+'/rest/v1';H={'apikey':K,'Authorization':'Bearer '+K,'Content-Type':'application/json','Accept':'application/json','Prefer':'return=representation'}
def req(m,url,p=None):
 d=json.dumps(p,ensure_ascii=False).encode() if p is not None else None
 try:
  with urllib.request.urlopen(urllib.request.Request(url,data=d,headers=H,method=m),timeout=120) as r:
   t=r.read().decode('utf-8','replace');return json.loads(t) if t else None
 except urllib.error.HTTPError as e: raise RuntimeError(f'HTTP {e.code}: {e.read().decode("utf-8","replace")}')
def norm(g):
 g=dict(g or {});g['name']=str(g.get('name') or '').strip();g['desc']=str(g.get('desc') or g.get('description') or 'Juego educativo de TecnoMath').strip();g['description']=g['desc'];g['url']=str(g.get('url') or '').strip();g['imageUrl']=str(g.get('imageUrl') or '').strip();g['icon']=str(g.get('icon') or '🎮');g['category']=str(g.get('category') or 'otros');g['deviceCompatibility']=str(g.get('deviceCompatibility') or 'both');g['evento']=g.get('evento') or None;g['status']=str(g.get('status') or 'published');g['id']=str(g.get('id') or re.sub(r'[^a-z0-9._-]+','-',g['name'].lower()).strip('-'));g['allowVoting']=g.get('allowVoting') is not False;g['featured']=g.get('featured') is True;g['folder']=str(g.get('folder') or '').strip();g['folderPath']=str(g.get('folderPath') or '').strip();g['entryFile']=str(g.get('entryFile') or 'index.html').strip();g['logoStoragePath']=str(g.get('logoStoragePath') or '').strip();g['packageStoragePath']=str(g.get('packageStoragePath') or '').strip();g['packageFileName']=str(g.get('packageFileName') or '').strip()
 try:g['order']=int(g.get('order') or 9999)
 except:g['order']=9999
 return g
def materialize_package(g):
 p=str(g.get('packageStoragePath') or '').strip().lstrip('/')
 if not p: return g
 if not p.startswith('class-a-packages/'): raise RuntimeError('Ruta de paquete no permitida.')
 if not p.lower().endswith('.zip'): raise RuntimeError('El paquete debe ser ZIP.')
 folder=re.sub(r'[^A-Za-z0-9._-]+','-',str(g.get('folder') or g.get('name') or 'juego').lower()).strip('-') or 'juego'
 target=Path('games')/folder
 tmp=None
 try:
  tmp=tempfile.NamedTemporaryFile(prefix='tecnomath-',suffix='.zip',delete=False);tmp.close()
  url=f"{U}/storage/v1/object/authenticated/game-submissions/{urllib.parse.quote(p,safe='/')}"
  req_obj=urllib.request.Request(url,headers={'apikey':K,'Authorization':'Bearer '+K})
  total=0
  with urllib.request.urlopen(req_obj,timeout=180) as r:
   with open(tmp.name,'wb') as out:
    while True:
     chunk=r.read(1024*1024)
     if not chunk: break
     total+=len(chunk)
     if total>100*1024*1024: raise RuntimeError('El ZIP supera el límite de 100 MB.')
     out.write(chunk)
  with zipfile.ZipFile(tmp.name) as z:
   infos=[i for i in z.infolist() if not i.is_dir() and not i.filename.startswith('__MACOSX/') and not i.filename.endswith('/.DS_Store')]
   if not infos: raise RuntimeError('El ZIP está vacío.')
   if len(infos)>2000: raise RuntimeError('El ZIP contiene demasiados archivos.')
   if sum(max(0,int(i.file_size)) for i in infos)>300*1024*1024: raise RuntimeError('El contenido descomprimido supera 300 MB.')
   names=[]
   for i in infos:
    if i.flag_bits & 0x1: raise RuntimeError('Los ZIP cifrados no están permitidos.')
    raw=i.filename.replace('\\','/')
    norm_path=os.path.normpath(raw).replace('\\','/')
    if norm_path in ('','.'): continue
    if norm_path.startswith('/') or re.match(r'^[A-Za-z]:',norm_path) or any(part=='..' for part in norm_path.split('/')): raise RuntimeError('El ZIP contiene una ruta insegura.')
    mode=(i.external_attr>>16)&0o170000
    if mode==0o120000: raise RuntimeError('Los enlaces simbólicos dentro del ZIP no están permitidos.')
    names.append(norm_path)
   top={n.split('/')[0] for n in names if '/' in n}
   has_root_file=any('/' not in n for n in names)
   strip_root=bool(len(top)==1 and not has_root_file)
   entries=[]
   for i in infos:
    raw=i.filename.replace('\\','/')
    norm_path=os.path.normpath(raw).replace('\\','/')
    if strip_root:
     prefix=next(iter(top))+'/'
     if norm_path.startswith(prefix): norm_path=norm_path[len(prefix):]
    if not norm_path or norm_path in ('.','..'): continue
    entries.append((i,norm_path))
   target.mkdir(parents=True,exist_ok=True)
   for i,rel in entries:
    dest=target/rel;resolved=dest.resolve();base=target.resolve()
    if base not in resolved.parents and resolved!=base: raise RuntimeError('Ruta de extracción insegura.')
    dest.parent.mkdir(parents=True,exist_ok=True)
    with z.open(i,'r') as src, open(dest,'wb') as dst: shutil.copyfileobj(src,dst,1024*1024)
   candidates=[rel for _,rel in entries if rel.lower()=='index.html'] or [rel for _,rel in entries if rel.lower().endswith('/index.html')]
   if not candidates: raise RuntimeError('No se encontró index.html dentro del ZIP.')
   g['entryFile']=candidates[0];g['url']=f"games/{folder}/{g['entryFile']}"
   image_ext={'.png','.jpg','.jpeg','.webp','.gif'}
   logos=[rel for _,rel in entries if Path(rel).suffix.lower() in image_ext and re.search(r'(^|/)(logo|icon|cover|thumbnail|portada)([-_ ]|$)',Path(rel).stem,re.I)]
   images=logos or [rel for _,rel in entries if Path(rel).suffix.lower() in image_ext]
   if images:
    src=target/images[0];ext=src.suffix.lower();safe_id=re.sub(r'[^A-Za-z0-9._-]+','-',str(g.get('id') or '')).strip('-')
    if safe_id:
     logo=Path('img/logos')/(safe_id+ext);logo.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(src,logo);g['imageUrl']=f"img/logos/{safe_id}{ext}"
   return g
 finally:
  if tmp and os.path.exists(tmp.name): os.unlink(tmp.name)

def materialize_logo(g):
 p=str(g.get('logoStoragePath') or '').strip().lstrip('/')
 if not p:
  return g
 if not p.startswith('logos/'):
  raise RuntimeError('Ruta de logo no permitida.')
 ext=Path(p).suffix.lower()
 allowed={'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif'}
 if ext not in allowed:
  raise RuntimeError('Formato de logo no permitido.')
 safe_id=re.sub(r'[^A-Za-z0-9._-]+','-',str(g.get('id') or '')).strip('-')
 if not safe_id:
  raise RuntimeError('ID inválido para el logo.')
 url=f"{U}/storage/v1/object/public/game-downloads/{urllib.parse.quote(p,safe='/')}"
 req_obj=urllib.request.Request(url,headers={'apikey':K,'Authorization':'Bearer '+K})
 with urllib.request.urlopen(req_obj,timeout=120) as r:
  content_type=r.headers.get_content_type()
  if content_type not in allowed.values():
   raise RuntimeError('El archivo almacenado no es un formato de imagen permitido.')
  data=r.read(2*1024*1024+1)
 if len(data)>2*1024*1024:
  raise RuntimeError('El logo supera el límite de 2 MB.')
 out=Path('img/logos')/(safe_id+ext)
 out.parent.mkdir(parents=True,exist_ok=True)
 out.write_bytes(data)
 g['imageUrl']=f"img/logos/{safe_id}{ext}"
 return g

def write(c):
 c=[norm(x) for x in c]
 for i,g in enumerate(c,1):
  if g['order']>=9999:g['order']=i
 c.sort(key=lambda x:(x['order'],x['name'].lower()))
 for i,g in enumerate(c,1):g['order']=i
 s=json.dumps(c,ensure_ascii=False,indent=2)+'\n';Path('data/games.json').write_text(s,encoding='utf-8');Path('games/published-games.json').write_text(s,encoding='utf-8');return c
def load(p):
 try:
  x=json.loads(Path(p).read_text(encoding='utf-8'));return x if isinstance(x,list) else []
 except:return []
jobs=req('GET',f'{B}/tecnomath_catalog_jobs?status=eq.pending&order=created_at.asc&limit=100') or []
if not jobs: print('No hay jobs Clase A.');raise SystemExit(0)
c=load('data/games.json');done=[];changed=False
for j in jobs:
 jid=j['id'];a=j.get('action');gid=str(j.get('game_id') or '');p=j.get('payload') or {}
 try:
  claimed=req('PATCH',f'{B}/tecnomath_catalog_jobs?id=eq.{urllib.parse.quote(jid)}&status=eq.pending',{'status':'processing'})
  if not claimed:
   print('Job ya reclamado por otro publicador:',jid);continue
  c=[norm(x) for x in c];idx={str(x.get('id')):i for i,x in enumerate(c)}
  if a=='publish':
   g=norm(p)
   if not g['name'] or not g['id'] or not g['url']:raise RuntimeError('Faltan nombre, ID o URL.')
   g=materialize_package(g)
   g=materialize_logo(g)
   old=idx.get(g['id'])
   if old is None:
    for i,x in enumerate(c):
     if str(x.get('name') or '').strip().lower()==g['name'].lower() or str(x.get('url') or '').strip().lower()==g['url'].lower():
      old=i;break
   if old is None:
    if any(x['name'].lower()==g['name'].lower() for x in c):raise RuntimeError('Nombre duplicado.')
    if any(x['url'].lower()==g['url'].lower() for x in c):raise RuntimeError('URL duplicada.')
    c.append(g)
   else:c[old]={**c[old],**g}
   changed=True;done.append((j,g['id'],g['name']))
  elif a=='hide':
   if gid not in idx:raise RuntimeError('Juego no encontrado.')
   c[idx[gid]]['status']='hidden';changed=True;done.append((j,gid,c[idx[gid]]['name']))
  elif a=='delete':
   old=len(c);c=[x for x in c if str(x.get('id'))!=gid]
   if len(c)==old:raise RuntimeError('Juego no encontrado.')
   changed=True;done.append((j,gid,'Eliminado'))
  elif a=='reorder':
   rank={str(x.get('id')):int(x.get('order')) for x in p.get('orders',[]) if x.get('id') is not None}
   for i,g in enumerate(c,1):g['order']=rank.get(str(g.get('id')),i)
   changed=True;done.append((j,'','Orden actualizado'))
  elif a=='draft':
   req('PATCH',f'{B}/tecnomath_catalog_jobs?id=eq.{urllib.parse.quote(jid)}',{'status':'done','processed_at':datetime.now(timezone.utc).isoformat()});continue
  else:raise RuntimeError('Acción no soportada: '+str(a))
  c=write(c)
 except Exception as e:
  print('ERROR',jid,e);req('PATCH',f'{B}/tecnomath_catalog_jobs?id=eq.{urllib.parse.quote(jid)}',{'status':'error','error_message':str(e)})
if not changed:raise SystemExit(0)
subprocess.run(['git','config','user.name','github-actions[bot]'],check=True);subprocess.run(['git','config','user.email','41898282+github-actions[bot]@users.noreply.github.com'],check=True);subprocess.run(['git','add','data/games.json','games/published-games.json','img/logos'],check=True)
if subprocess.run(['git','diff','--cached','--quiet']).returncode==0:raise RuntimeError('Sin cambios de catálogo.')
subprocess.run(['git','commit','-m','feat: sync Class A game catalog'],check=True);subprocess.run(['git','push','origin','main'],check=True);sha=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
for j,gid,name in done:
 req('PATCH',f'{B}/tecnomath_catalog_jobs?id=eq.{urllib.parse.quote(j["id"])}',{'status':'done','processed_at':datetime.now(timezone.utc).isoformat(),'processed_commit':sha})
 req('POST',f'{B}/tecnomath_catalog_logs',{'user_id':j.get('user_id'),'action':j.get('action'),'game_id':gid or j.get('game_id'),'game_name':name,'changes':j.get('payload') or {}})
print('Clase A: publicado correctamente en GitHub:',sha)