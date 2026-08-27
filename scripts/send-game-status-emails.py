import html, json, os, urllib.request

DB = os.environ['FIREBASE_DB'].rstrip('/')
TOKEN = os.environ['FIREBASE_ACCESS_TOKEN']
KEY = os.environ.get('RESEND_API_KEY', '')
FROM = os.environ.get('RESEND_FROM', 'TecnoMath <notificaciones@tecnomath.online>')

if not KEY:
    raise RuntimeError('RESEND_API_KEY no está configurado en GitHub Secrets')

def req(path, method='GET', data=None):
    headers = {'Authorization': 'Bearer ' + TOKEN, 'Accept': 'application/json'}
    encoded = None
    if data is not None:
        headers['Content-Type'] = 'application/json'
        encoded = json.dumps(data).encode()
    request = urllib.request.Request(DB + '/' + path + '.json', data=encoded, headers=headers, method=method)
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.loads(response.read().decode() or '{}')

def send(to, subject, body):
    payload = json.dumps({'from': FROM, 'to': [to], 'subject': subject, 'html': body}).encode()
    request = urllib.request.Request(
        'https://api.resend.com/emails', data=payload,
        headers={'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json'}, method='POST'
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        response.read()
    return True

items = req('gameSubmissions') or {}
for submission_id, item in items.items():
    if not isinstance(item, dict):
        continue

    email = str(item.get('authorEmail') or '').strip()
    status = str(item.get('status') or 'pending').lower()
    sent = item.get('emailNotifications') or {}
    if not email:
        print('SKIP sin authorEmail:', submission_id)
        continue

    name = html.escape(str(item.get('authorName') or ''))
    game = html.escape(str(item.get('name') or 'tu juego'))
    notification_key = {
        'pending': 'received',
        'reviewing': 'reviewing',
        'approved': 'approved',
        'rejected': 'rejected',
        'published': 'published'
    }.get(status)

    if not notification_key or sent.get(notification_key):
        continue

    if status == 'pending':
        subject = '🎮 Hemos recibido tu juego'
        message = f'<h2>🎮 ¡Juego recibido!</h2><p>Hola {name}, hemos recibido <b>{game}</b> correctamente.</p><p>Tu juego estará listo en menos de 24 horas. Estate pendiente de la página y de tu correo.</p>'
    elif status == 'reviewing':
        subject = '🔍 Estamos revisando tu juego'
        message = f'<h2>🔍 Estamos verificando tu juego</h2><p>Hola {name}, el administrador ya está revisando <b>{game}</b>.</p><p>Te avisaremos cuando tengamos una decisión.</p>'
    elif status == 'approved':
        subject = '✅ ¡Tu juego fue aprobado!'
        message = f'<h2>✅ ¡Buenas noticias!</h2><p>Hola {name}, tu juego <b>{game}</b> fue aprobado por el administrador.</p><p>Ahora estamos realizando la publicación. Te enviaremos otro correo cuando ya esté disponible para jugar.</p>'
    elif status == 'published':
        url = html.escape(str(item.get('publishedUrl') or 'https://tecnomath.online'))
        subject = '🎉 ¡Tu juego ya está publicado en TecnoMath!'
        message = f'<h2>🎉 ¡Tu juego ya está publicado!</h2><p>Hola {name}, <b>{game}</b> ya está disponible en TecnoMath.</p><p><a href="{url}">🎮 Abrir mi juego</a></p>'
    else:
        reason = html.escape(str(item.get('reviewReason') or 'No cumple los requisitos de publicación actualmente.'))
        subject = '❌ Actualización sobre tu juego'
        message = f'<h2>❌ Tu juego no fue aprobado</h2><p>Hola {name}, después de revisar <b>{game}</b>, no fue aprobado por el momento.</p><p><b>Motivo:</b> {reason}</p>'

    try:
        if send(email, subject, message):
            req('gameSubmissions/' + submission_id, 'PATCH', {
                'emailNotifications': {**sent, notification_key: True}
            })
            print('EMAIL SENT', notification_key, email)
    except Exception as error:
        print('ERROR EMAIL', submission_id, error)
