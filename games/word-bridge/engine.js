import {WORDS,QUESTION_TYPES} from "./data.js";
const shuffle=a=>[...a].sort(()=>Math.random()-.5);
const norm=s=>String(s??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase();
function distractors(current,field){return shuffle(WORDS.filter(w=>w.id!==current.id)).slice(0,3).map(w=>w[field])}
function imageSvg(w){const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 220"><defs><linearGradient id="g" x1="0" x2="1"><stop stop-color="#5b4bff"/><stop offset="1" stop-color="#ff5c8a"/></linearGradient></defs><rect width="300" height="220" rx="35" fill="url(#g)"/><circle cx="150" cy="105" r="72" fill="white" opacity=".18"/><text x="150" y="125" text-anchor="middle" font-size="92">'+w.emoji+'</text></svg>';return "data:image/svg+xml;charset=UTF-8,"+encodeURIComponent(svg)}
export function createQuestion(level=1,used=new Set(),forcedType=null){let pool=WORDS.filter(w=>w.level<=level&&!used.has(w.id));if(!pool.length)pool=WORDS.filter(w=>!used.has(w.id));if(!pool.length)pool=WORDS;const w=pool[Math.floor(Math.random()*pool.length)];used.add(w.id);const type=forcedType||QUESTION_TYPES[Math.floor(Math.random()*Math.min(QUESTION_TYPES.length,2+level))];let q={id:w.id+"-"+type+"-"+Math.random().toString(36).slice(2),word:w,type,choices:[],answer:w.en,image:imageSvg(w),hint:"Piensa en la palabra y usa la pista si la necesitas."};
if(type==="imageToWord"||type==="esToEn"){q.answer=w.en;q.prompt=type==="esToEn"?"Traduce al inglés:":"¿Cómo se dice en inglés?";q.choices=shuffle([w.en,...distractors(w,"en")])}
else if(type==="enToEs"){q.answer=w.es;q.prompt="Traduce al español:";q.choices=shuffle([w.es,...distractors(w,"es")])}
else if(type==="wordToImage"){q.answer=w.id;q.prompt="¿Qué imagen representa esta palabra?";q.choices=shuffle([w,...shuffle(WORDS.filter(x=>x.id!==w.id)).slice(0,3)]);q.image=null}
else if(type==="write"){q.answer=w.en;q.prompt="✏️ ¿Cómo se escribe en inglés?";q.hint="Escribe la palabra y comprueba tu respuesta.";q.choices=[]}
else if(type==="letters"){q.answer=w.en;q.prompt="🔤 Ordena las letras:";q.letters=shuffle([...w.en.toUpperCase()]);q.hint="Forma la palabra inglesa correcta."}
else if(type==="listen"){q.answer=w.en;q.prompt="🔊 Escucha y elige la palabra:";q.choices=shuffle([w.en,...distractors(w,"en")]);}
else {q.answer=w.en;q.prompt="🧠 Vocabulario: ¿qué palabra completa mejor la pista?";q.choices=shuffle([w.en,...distractors(w,"en")]);}
return q}
export function isCorrect(q,value){return norm(value)===norm(q.answer)}
export {shuffle,norm};
