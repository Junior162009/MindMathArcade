import html,json,os,urllib.error,urllib.request,urllib.parse

SUPABASE_URL=os.environ['SUPABASE_URL'].rstrip('/')
SUPABASE_KEY=os.environ['SUPABASE_SERVICE_ROLE_KEY'].strip()
RESEND_API_KEY=os.environ.get('RESEND_API_KEY','').strip()
FROM=os.environ.get('RESEND_FROM','TecnoMath <notificaciones@tecnomath.online>').strip()
TABLE=f'{SUPABASE_URL}/rest/v1/tecnomath_game_submissions'
HEAD={'apikey':SUPABASE_KEY,'Authorization':'Bearer '+SUPABASE_KEY,'Content-Type':'application/json','Accept':'application/json','Prefer':'return=representation'}
def req(url,method='GET',data=None):
 h=dict(HEAD);body=json.dumps(data,ensure_ascii=False).encode('utf-8') if data is not None else None
 r=urllib.request.Request(url,data=body,headers=h,method=method)
 try:
  with urllib.request.urlopen(r,timeout=60) as x:return json.loads(x.read().decode('utf-8','replace') or 'null')
 except urllib.error.HTTPError as e:
  raise RuntimeError(f'Supabase HTTP {e.code}: {e.read().decode("utf-8","replace")}')
def send(to,subject,body):
 if not RESEND_API_KEY:raise RuntimeError('RESEND_API_KEY no está configurado')
 p={'from':FROM,'to':[to],'subject':subject,'html':body}
 # Resend solo necesita su propia autenticación; no mezclar aquí la clave de Supabase.
 h={'Authorization':'Bearer '+RESEND_API_KEY,'Content-Type':'application/json','Accept':'application/json'}
 r=urllib.request.Request('https://api.resend.com/emails',data=json.dumps(p,ensure_ascii=False).encode('utf-8'),headers=h,method='POST')
 try:
  with urllib.request.urlopen(r,timeout=60) as x:x.read()
 except urllib.error.HTTPError as e:
  detail=e.read().decode('utf-8','replace')
  raise RuntimeError(f'Resend HTTP {e.code}: {detail}')
items=req(TABLE+'?select=*&author_email=not.is.null') or []
for item in items:
 email=str(item.get('author_email') or '').strip();status=str(item.get('status') or 'pending').lower();sent=item.get('email_notifications') or {};key={'pending':'received','reviewing':'reviewing','approved':'approved','rejected':'rejected','published':'published'}.get(status)
 if not email or not key or sent.get(key):continue
 name=html.escape(str(item.get('author_name') or ''));game=html.escape(str(item.get('name') or 'tu juego'))
 if status=='pending':subject='🎮 Hemos recibido tu juego';message=f'<h2>🎮 ¡Juego recibido!</h2><p>Hola {name}, hemos recibido <b>{game}</b> correctamente.</p><p>El administrador lo revisará antes de publicarlo.</p>'
 elif status=='reviewing':subject='🔍 Estamos revisando tu juego';message=f'<h2>🔍 Estamos verificando tu juego</h2><p>Hola {name}, el administrador ya está revisando <b>{game}</b>.</p><p>Te avisaremos cuando tengamos una decisión.</p>'
 elif status=='approved':subject='✅ ¡Tu juego fue aprobado!';message=f'<h2>✅ ¡Buenas noticias!</h2><p>Hola {name}, tu juego <b>{game}</b> fue aprobado.</p><p>Ahora estamos realizando la publicación.</p>'
 elif status=='published':
  url=html.escape(str(item.get('published_url') or 'https://tecnomath.online'));subject='🎉 ¡Tu juego ya está publicado en TecnoMath!';message=f'<h2>🎉 ¡Tu juego ya está publicado!</h2><p>Hola {name}, <b>{game}</b> ya está disponible.</p><p><a href="{url}">🎮 Abrir mi juego</a></p>'
 else:
  reason=html.escape(str(item.get('rejection_reason') or 'No cumple los requisitos de publicación actualmente.'));subject='❌ Actualización sobre tu juego';message=f'<h2>❌ Tu juego no fue aprobado</h2><p>Hola {name}, después de revisar <b>{game}</b>, no fue aprobado por el momento.</p><p><b>Motivo:</b> {reason}</p>'
 try:
  send(email,subject,message);sent=dict(sent);sent[key]=True;req(TABLE+'?id=eq.'+urllib.parse.quote(str(item['id'])), 'PATCH', {'email_notifications':sent});print('EMAIL SENT',key,email)
 except Exception as e:print('ERROR EMAIL',item.get('id'),e)
