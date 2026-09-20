import json,os,re,subprocess,urllib.parse,urllib.request
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
 g=dict(g or {});g['name']=str(g.get('name') or '').strip();g['desc']=str(g.get('desc') or g.get('description') or 'Juego educativo de TecnoMath').strip();g['description']=g['desc'];g['url']=str(g.get('url') or '').strip();g['imageUrl']=str(g.get('imageUrl') or '').strip();g['icon']=str(g.get('icon') or '🎮');g['category']=str(g.get('category') or 'otros');g['deviceCompatibility']=str(g.get('deviceCompatibility') or 'both');g['evento']=g.get('evento') or None;g['status']=str(g.get('status') or 'published');g['id']=str(g.get('id') or re.sub(r'[^a-z0-9._-]+','-',g['name'].lower()).strip('-'));g['allowVoting']=g.get('allowVoting') is not False;g['featured']=g.get('featured') is True
 try:g['order']=int(g.get('order') or 9999)
 except:g['order']=9999
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
  req('PATCH',f'{B}/tecnomath_catalog_jobs?id=eq.{urllib.parse.quote(jid)}',{'status':'processing'})
  c=[norm(x) for x in c];idx={str(x.get('id')):i for i,x in enumerate(c)}
  if a=='publish':
   g=norm(p)
   if not g['name'] or not g['id'] or not g['url']:raise RuntimeError('Faltan nombre, ID o URL.')
   old=idx.get(g['id'])
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
subprocess.run(['git','config','user.name','github-actions[bot]'],check=True);subprocess.run(['git','config','user.email','41898282+github-actions[bot]@users.noreply.github.com'],check=True);subprocess.run(['git','add','data/games.json','games/published-games.json'],check=True)
if subprocess.run(['git','diff','--cached','--quiet']).returncode==0:raise RuntimeError('Sin cambios de catálogo.')
subprocess.run(['git','commit','-m','feat: sync Class A game catalog'],check=True);subprocess.run(['git','push','origin','main'],check=True);sha=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
for j,gid,name in done:
 req('PATCH',f'{B}/tecnomath_catalog_jobs?id=eq.{urllib.parse.quote(j["id"])}',{'status':'done','processed_at':datetime.now(timezone.utc).isoformat(),'processed_commit':sha})
 req('POST',f'{B}/tecnomath_catalog_logs',{'user_id':j.get('user_id'),'action':j.get('action'),'game_id':gid or j.get('game_id'),'game_name':name,'changes':j.get('payload') or {}})
print('Clase A: publicado correctamente en GitHub:',sha)