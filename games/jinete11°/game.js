const $=id=>document.getElementById(id);let running=false,score=0,lives=3,combo=0,bestCombo=0,seconds=60,distance=0,correctIndex=0,questionData=null,shield=0,powers={shield:1,hack:1,slow:1,turbo:1},timer,moveLock=false;const questions=[
 {q:'101 + 10 = ?',a:'111',o:['7','111','0x6'],phase:'FASE 1 · BINARIO'},
 {q:'110 - 11 = ?',a:'11',o:['11','101','0x4'],phase:'FASE 1 · BINARIO'},
 {q:'101 × 10 = ?',a:'1010',o:['0x5','1010','12'],phase:'FASE 1 · BINARIO'},
 {q:'0xA = ? decimal',a:'10',o:['8','10','1010'],phase:'FASE 2 · HEX'},
 {q:'101 AND 011 = ?',a:'1',o:['1','111','0x6'],phase:'FASE 2 · AND'},
 {q:'101 OR 011 = ?',a:'111',o:['101','111','0x3'],phase:'FASE 2 · OR'},
 {q:'101 XOR 011 = ?',a:'110',o:['110','111','0x1'],phase:'FASE 3 · XOR'},
 {q:'NOT 101 (3-bit) = ?',a:'010',o:['010','101','111'],phase:'FASE 3 · NOT'},
 {q:'0xF = ? binary',a:'1111',o:['1110','1111','1010'],phase:'FASE 3 · CONVERSIÓN'},
 {q:'1111 decimal = ?',a:'0xF',o:['0xF','0xE','1111'],phase:'FINAL RUSH'},
 {q:'1001 + 0110 = ?',a:'1111',o:['1101','1111','0xA'],phase:'FINAL RUSH'},
 {q:'1100 XOR 1010 = ?',a:'0110',o:['0110','1110','0010'],phase:'FINAL RUSH'}
];
function shuffle(a){return [...a].sort(()=>Math.random()-.5)}
function nextQuestion(){questionData=questions[Math.floor(Math.random()*questions.length)];let opts=shuffle(questionData.o);correctIndex=opts.indexOf(questionData.a);$('question').textContent=questionData.q;$('phase').textContent=questionData.phase;$('platforms').innerHTML=opts.map((x,i)=>`<button class="platform" data-i="${i}">${x}</button>`).join('');document.querySelectorAll('.platform').forEach(p=>p.addEventListener('click',()=>choose(+p.dataset.i)))}
function choose(i){if(!running||moveLock)return;moveLock=true;let ps=document.querySelectorAll('.platform');ps[i].classList.add(i===correctIndex?'correct':'wrong');if(i===correctIndex){combo++;bestCombo=Math.max(bestCombo,combo);score+=100+combo*25;distance+=35+combo*5}else if(shield){shield=0;score=Math.max(0,score-25)}else{lives--;combo=0;distance=Math.max(0,distance-10)}update();if(lives<=0){end();return}setTimeout(()=>{moveLock=false;nextQuestion()},260)}
function update(){$('lives').textContent=lives;$('score').textContent=score;$('combo').textContent=combo;$('time').textContent=seconds}
function start(){running=true;score=0;lives=3;combo=0;bestCombo=0;seconds=60;distance=0;shield=0;Object.keys(powers).forEach(k=>powers[k]=1);$('menu').classList.add('hidden');$('result').classList.add('hidden');$('hud').classList.remove('hidden');update();nextQuestion();clearInterval(timer);timer=setInterval(()=>{if(!running)return;seconds--;distance+=Math.max(2,Math.floor((60-seconds)/10));update();if(seconds<=0)end()},1000)}
function end(){if(!running)return;running=false;clearInterval(timer);$('hud').classList.add('hidden');$('result').classList.remove('hidden');$('finalScore').textContent=score;$('distance').textContent=distance;$('bestCombo').textContent=bestCombo}
function usePower(type){if(!running||!powers[type])return;powers[type]--;if(type==='shield')shield=1;if(type==='hack'){let ps=document.querySelectorAll('.platform');ps.forEach((p,i)=>{if(i!==correctIndex)p.disabled=true})}if(type==='slow'){document.body.style.filter='saturate(.7)';setTimeout(()=>document.body.style.filter='',5000)}if(type==='turbo'){score+=150;distance+=100;update()}document.querySelector(`[data-power="${type}"]`).disabled=true}
$('start').onclick=start;$('again').onclick=start;document.querySelectorAll('[data-power]').forEach(b=>b.onclick=()=>usePower(b.dataset.power));document.addEventListener('keydown',e=>{if(!running)return;if(e.code==='ArrowLeft'||e.key.toLowerCase()==='a')choose(Math.max(0,correctIndex-1));if(e.code==='ArrowRight'||e.key.toLowerCase()==='d')choose(Math.min(2,correctIndex+1));if(e.code==='Space')choose(correctIndex)});let touchX=0;document.addEventListener('touchstart',e=>touchX=e.touches[0].clientX,{passive:true});document.addEventListener('touchend',e=>{if(!running)return;let dx=e.changedTouches[0].clientX-touchX;if(Math.abs(dx)>40)choose(dx<0?Math.max(0,correctIndex-1):Math.min(2,correctIndex+1));},{passive:true});update();
