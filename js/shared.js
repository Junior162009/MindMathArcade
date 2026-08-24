// Tecnomath Shared API v2.3
(function() {
    const STORAGE_KEY='tecnomath_users', SESSION_KEY='tecnomath_session', ADMIN_SESSION_KEY='tecnomath_admin_session';
    const COINS_PREFIX='tecnomath_coins_', GAME_COINS_PREFIX='tecnomath_gamecoins_', PROGRESS_PREFIX='tecnomath_progress_';
    const ADMIN_USERS=['Junior','Nicole','Mateo','Jaider'];
    const APPROVED_ADMIN_EMAILS=['delahozbarcelojunior@gmail.com'];
    function getUsers(){const d=localStorage.getItem(STORAGE_KEY);if(!d)return[];try{const u=JSON.parse(d);return Array.isArray(u)?u:[]}catch(e){localStorage.removeItem(STORAGE_KEY);return[]}}
    function saveUsers(u){localStorage.setItem(STORAGE_KEY,JSON.stringify(u))}
    function findUser(n){return getUsers().find(u=>u.username.toLowerCase()===n.toLowerCase())}
    function createUser(username,password){const users=getUsers();if(findUser(username))return null;const user={username,password,isAdmin:false,role:'user',created:new Date().toISOString()};users.push(user);saveUsers(users);return user}
    window.Tecnomath={
        login:function(username,password){username=(username||'').trim();password=(password||'').trim();if(!username||!password)return{success:false,message:'Usuario y contraseña requeridos'};const u=findUser(username);if(!u||u.password!==password)return{success:false,message:'Usuario o contraseña incorrectos'};localStorage.setItem(SESSION_KEY,JSON.stringify({username:u.username}));localStorage.removeItem(ADMIN_SESSION_KEY);return{success:true,username:u.username}},
        register:function(username,password){username=(username||'').trim();password=(password||'').trim();if(username.length<3)return{success:false,message:'El usuario debe tener al menos 3 caracteres'};if(password.length<4)return{success:false,message:'La contraseña debe tener al menos 4 caracteres'};if(findUser(username))return{success:false,message:'Ese usuario ya existe. Usa ENTRAR.'};const u=createUser(username,password);if(!u)return{success:false,message:'No se pudo crear el usuario'};localStorage.setItem(SESSION_KEY,JSON.stringify({username:u.username}));localStorage.removeItem(ADMIN_SESSION_KEY);return{success:true,username:u.username}},
        logout:function(){localStorage.removeItem(SESSION_KEY);localStorage.removeItem(ADMIN_SESSION_KEY)},
        setSession:function(username){username=(username||'').trim();if(!username)return;localStorage.setItem(SESSION_KEY,JSON.stringify({username}));localStorage.removeItem(ADMIN_SESSION_KEY)},
        getCurrentUser:function(){const s=localStorage.getItem(SESSION_KEY);if(!s)return null;try{const d=JSON.parse(s);return d.username?{username:d.username}:null}catch(e){localStorage.removeItem(SESSION_KEY);return null}},
        isAdmin:function(){const u=this.getCurrentUser();if(!u)return false;const ok=ADMIN_USERS.some(a=>a.toLowerCase()===u.username.trim().toLowerCase());if(!ok){if(localStorage.getItem(ADMIN_SESSION_KEY)===u.username)localStorage.removeItem(ADMIN_SESSION_KEY);return false}return localStorage.getItem(ADMIN_SESSION_KEY)===u.username},
        setAdmin:function(username){if(!username)return false;const a=ADMIN_USERS.find(x=>x.toLowerCase()===username.trim().toLowerCase());if(!a){localStorage.removeItem(ADMIN_SESSION_KEY);return false}localStorage.setItem(ADMIN_SESSION_KEY,a);return true},
        unsetAdmin:function(username){const a=localStorage.getItem(ADMIN_SESSION_KEY);if(a&&username&&a.toLowerCase()===username.toLowerCase())localStorage.removeItem(ADMIN_SESSION_KEY)},
        getCoins:function(){if(this.isAdmin())return Infinity;const u=this.getCurrentUser();if(!u)return 0;const c=localStorage.getItem(COINS_PREFIX+u.username);return c?parseInt(c,10):0},
        addCoins:function(n){if(this.isAdmin())return true;const u=this.getCurrentUser();if(!u)return false;localStorage.setItem(COINS_PREFIX+u.username,this.getCoins()+n);return true},
        spendCoins:function(n){if(this.isAdmin())return true;const u=this.getCurrentUser();if(!u)return false;const c=this.getCoins();if(c<n)return false;localStorage.setItem(COINS_PREFIX+u.username,c-n);return true},
        getGameCoins:function(id){if(this.isAdmin())return Infinity;const u=this.getCurrentUser();if(!u)return 0;const d=localStorage.getItem(GAME_COINS_PREFIX+u.username+'_'+id);return d?parseInt(d,10):0},
        setGameCoins:function(id,n){if(this.isAdmin())return;const u=this.getCurrentUser();if(u)localStorage.setItem(GAME_COINS_PREFIX+u.username+'_'+id,n)},
        exchangeGlobalToLocal:function(id,n){if(this.isAdmin())return true;const local=Math.floor(n*.9);if(this.getCoins()<n||!this.spendCoins(n))return false;this.setGameCoins(id,this.getGameCoins(id)+local);return true},
        exchangeLocalToGlobal:function(id,n){if(this.isAdmin())return true;const global=Math.floor(n*.9);if(this.getGameCoins(id)<n)return false;this.setGameCoins(id,this.getGameCoins(id)-n);this.addCoins(global);return true},
        getProgress:function(id){const u=this.getCurrentUser();if(!u)return{};const d=localStorage.getItem(PROGRESS_PREFIX+u.username+'_'+id);if(!d)return{};try{return JSON.parse(d)}catch(e){return{}}},
        setProgress:function(id,data){const u=this.getCurrentUser();if(u)localStorage.setItem(PROGRESS_PREFIX+u.username+'_'+id,JSON.stringify(data))},
        updateHighScore:function(id,score){const p=this.getProgress(id);if(!p.highScore||score>p.highScore){p.highScore=score;this.setProgress(id,p)}}
    };

    // Firebase: los administradores aprobados por correo entran directamente al nuevo Dashboard.
    // No se muestra ni se solicita el código antiguo para estos correos.
    function setupFirebaseAdminButton(){
        if(!window.firebase||!firebase.auth||!firebase.database)return;
        const dashboardUrl='pages/admin/index.html';
        let isFirebaseAdmin=false;
        const buttonSelector='#admin-cloud';

        firebase.auth().onAuthStateChanged(async function(user){
            isFirebaseAdmin=false;
            const button=document.querySelector(buttonSelector);
            if(button){button.style.display='none';button.removeAttribute('title');}
            if(!user)return;

            const email=String(user.email||'').trim().toLowerCase();
            try{
                const snap=await firebase.database().ref('users/'+user.uid).once('value');
                const profile=snap.val()||{};
                const role=String(profile.role||(profile.isAdmin===true?'admin':'user')).toLowerCase();
                isFirebaseAdmin=role==='admin'||APPROVED_ADMIN_EMAILS.includes(email);

                // Si Junior entra con Google o correo/contraseña, sincronizamos su perfil como admin.
                if(APPROVED_ADMIN_EMAILS.includes(email) && role!=='admin'){
                    await firebase.database().ref('users/'+user.uid).update({
                        email:user.email,
                        role:'admin',
                        isAdmin:true,
                        updatedAt:firebase.database.ServerValue.TIMESTAMP
                    });
                }

                if(button&&isFirebaseAdmin){
                    button.style.display='block';
                    button.title='Panel de Control';
                    button.setAttribute('aria-label','Abrir Panel de Control');
                    button.innerHTML='👑';
                }
            }catch(error){
                console.error('TecnoMath: error comprobando rol admin',error);
            }
        });

        // Capturamos el clic antes que el código antiguo del index.
        document.addEventListener('click',function(event){
            const button=event.target.closest&&event.target.closest(buttonSelector);
            if(!button||!isFirebaseAdmin)return;
            event.preventDefault();
            event.stopImmediatePropagation();
            window.location.assign(dashboardUrl);
        },true);
    }
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setupFirebaseAdminButton,{once:true});else setupFirebaseAdminButton();
})();
