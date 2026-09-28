const WORDS=[
{en:'apple',es:'manzana',img:'1F34E'},{en:'book',es:'libro',img:'1F4D6'},{en:'house',es:'casa',img:'1F3E0'},
{en:'dog',es:'perro',img:'1F415'},{en:'cat',es:'gato',img:'1F408'},{en:'car',es:'carro',img:'1F697'},
{en:'sun',es:'sol',img:'2600'},{en:'school',es:'escuela',img:'1F3EB'},{en:'water',es:'agua',img:'1F4A7'},
{en:'tree',es:'árbol',img:'1F333'},{en:'fish',es:'pez',img:'1F41F'}];
const $=id=>document.getElementById(id);let mode='english',score=0,streak=0,round=0,current=null,locked=false;const TOTAL=10;
const imgBase='https://cdn.jsdelivr.net/gh/hfg-gmuend/openmoji@latest/color/svg/';
function shuffle(a){return [...a].sort(()=>Math.random()-.5)}
function nextRound(){if(round>=TOTAL){finish();return}round++;locked=false;current=WORDS[Math.floor(Math.random()*WORDS.length)];
$('roundLabel').textContent='Ronda '+round+' de '+TOTAL;$('progressBar').style.width=(round/TOTAL*100)+'%';$('score').textContent=score;$('streak').textContent='🔥 '+streak+' racha';
$('clueImage').src=imgBase+current.img+'.svg';$('clueImage').alt='Imagen de '+(mode==='english'?current.en:current.es);
$('direction').textContent=mode==='english'?'TRADUCE AL ESPAÑOL':'TRADUCE AL INGLÉS';
$('prompt').textContent=mode==='english'?'¿Cómo se dice “'+current.en+'”?':'¿Cómo se dice “'+current.es+'”?';
$('hint').textContent=mode==='english'?'Mira la imagen y elige la palabra en español.':'Mira la imagen y elige la palabra en inglés.';
$('feedback').textContent='';$('feedback').className='feedback';renderAnswers()}
function renderAnswers(){$('answers').innerHTML='';const correct=mode==='english'?current.es:current.en;const others=shuffle(WORDS.filter(x=>x.en!==current.en)).slice(0,3).map(x=>mode==='english'?x.es:x.en);
shuffle([correct,...others]).forEach(value=>{const b=document.createElement('button');b.className='answer';b.textContent=value;b.onclick=()=>answer(b,value,correct);$('answers').appendChild(b)})}
function answer(button,value,correct){if(locked)return;locked=true;document.querySelectorAll('.answer').forEach(b=>b.disabled=true);
if(value===correct){const gained=10+Math.min(streak,5)*2;score+=gained;streak++;button.classList.add('correct');$('feedback').textContent='✓ ¡Correcto! +'+gained+' puntos';$('feedback').className='feedback ok'}
else{streak=0;button.classList.add('wrong');document.querySelectorAll('.answer').forEach(b=>{if(b.textContent===correct)b.classList.add('correct')});$('feedback').textContent='La respuesta era: '+correct;$('feedback').className='feedback no'}
$('score').textContent=score;$('streak').textContent='🔥 '+streak+' racha';setTimeout(nextRound,850)}
function finish(){locked=true;$('roundLabel').textContent='Partida terminada';$('prompt').textContent='¡Terminaste con '+score+' puntos!';$('hint').textContent='Cambia el idioma o reinicia para practicar otra vez.';$('answers').innerHTML='';$('feedback').textContent=score>=100?'🏆 ¡Excelente trabajo!':'🏆 ¡Buen intento! Sigue practicando.';$('feedback').className='feedback ok'}
function restart(){score=0;streak=0;round=0;current=null;nextRound()}
document.querySelectorAll('.mode').forEach(btn=>btn.onclick=()=>{document.querySelectorAll('.mode').forEach(b=>b.classList.remove('active'));btn.classList.add('active');mode=btn.dataset.mode;if(current&&!locked){$('direction').textContent=mode==='english'?'TRADUCE AL ESPAÑOL':'TRADUCE AL INGLÉS';$('prompt').textContent=mode==='english'?'¿Cómo se dice “'+current.en+'”?':'¿Cómo se dice “'+current.es+'”?';$('hint').textContent=mode==='english'?'Mira la imagen y elige la palabra en español.':'Mira la imagen y elige la palabra en inglés.';$('clueImage').alt='Imagen de '+(mode==='english'?current.en:current.es);$('feedback').textContent='';$('feedback').className='feedback';renderAnswers()}});
$('restart').onclick=restart;nextRound();