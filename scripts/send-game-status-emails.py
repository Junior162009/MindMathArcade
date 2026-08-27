import html,json,os,urllib.request
DB=os.environ['FIREBASE_DB'].rstrip('/'); TOKEN=os.environ['FIREBASE_ACCESS_TOKEN']; KEY=os.environ.get('RESEND_API_KEY',''); FROM=os.environ.get('RESEND_FROM','TecnoMath <notificaciones@tecnomath.online>')
def req(path,method='GET',data=None):
 h={'Authorization':'Bearer '+TOKEN,'Accept':'application/json'}
 if data is not None:h['Content-Type']='application/json';data=json.dumps(data).encode()
 r=urllib.request.Request(DB+'/'+path+'.json',data=data,headers=h,method=method)
 with urllib.request.urlopen(r,timeout=60) as x:return json.loads(x.read().decode() or '{}')
def send(to,sub,body):
 if not KEY or not to:return False
 p=json.dumps({'from':FROM,'to':[to],'subject':sub,'html':body}).encode();r=urllib.request.Request('https://api.resend.com/emails',data=p,headers={'Authorization':'Bearer '+KEY,'Content-Type':'application/json'},method='POST')
 with urllib.request.urlopen(r,timeout=60):pass
 return True
items=req('gameSubmissions') or {}
for i,x in items.items():
 if not isinstance(x,dict):continue
 email=str(x.get('authorEmail') or '').strip();status=str(x.get('status') or 'pending');sent=x.get('emailNotifications') or {}
 if not email:continue
 name=html.escape(str(x.get('authorName') or ''));game=html.escape(str(x.get('name') or 'tu juego'));key={'pending':'received','reviewing':'reviewing','rejected':'rejected'}.get(status)
 if not key or sent.get(key):continue
 if status=='pending':sub='🎮 Hemos recibido tu juego';msg=f'<h2>🎮 ¡Juego recibido!</h2><p>Hola {name}, hemos recibido <b>{game}</b> correctamente.</p><p>Su juego estará listo en menos de 24 horas. Esté al pendiente de la página y de su correo.</p>'
 elif status=='reviewing':sub='🔍 Estamos revisando tu juego';msg=f'<h2>🔍 Estamos verificando tu juego</h2><p>Hola {name}, el administrador ya está revisando <b>{game}</b>.</p><p>Te avisaremos cuando tengamos una decisión.</p>'
 else:
  reason=html.escape(str(x.get('reviewReason') or 'No cumple los requisitos de publicación actualmente.'));sub='❌ Actualización sobre tu juego';msg=f'<h2>❌ Tu juego no fue aprobado</h2><p>Hola {name}, después de revisar <b>{game}</b>, no fue aprobado por el momento.</p><p><b>Motivo:</b> {reason}</p>'
 try:
  if send(email,sub,msg):req('gameSubmissions/'+i,'PATCH',{'emailNotifications':{**sent,key:True}});print('EMAIL',key,email)
 except Exception as e:print('ERROR EMAIL',i,e)
