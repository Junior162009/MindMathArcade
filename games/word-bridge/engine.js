import {WORDS,QUESTION_BANK} from "./data.js";
const shuffle=a=>[...a].sort(()=>Math.random()-.5);
const norm=s=>String(s??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase();
function distractors(current,field){return shuffle(WORDS.filter(w=>w.id!==current.id)).slice(0,3).map(w=>w[field])}
function imageSvg(w){const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 220"><defs><linearGradient id="g" x1="0" x2="1"><stop stop-color="#5b4bff"/><stop offset="1" stop-color="#ff5c8a"/></linearGradient></defs><rect width="300" height="220" rx="35" fill="url(#g)"/><circle cx="150" cy="105" r="72" fill="white" opacity=".18"/><text x="150" y="125" text-anchor="middle" font-size="92">'+w.emoji+'</text></svg>';return "data:image/svg+xml;charset=UTF-8,"+encodeURIComponent(svg)}
export function createQuestion(level=1,used=new Set(),forcedType=null){
 let pool=QUESTION_BANK.filter(q=>!used.has(q.id));
 const available=pool.filter(q=>{const w=WORDS.find(x=>x.id===q.wordId);return w&&w.level<=level});
 if(available.length)pool=available;
 else if(!pool.length)pool=QUESTION_BANK;
 const candidates=forcedType?pool.filter(q=>q.type===forcedType):pool;
 const base=candidates.length?candidates:pool;
 const spec=base[Math.floor(Math.random()*base.length)];
 used.add(spec.id);
 const w=WORDS.find(x=>x.id===spec.wordId);
 const type=spec.type;
 let q={id:spec.id,word:w,type,choices:[],answer:w.en,image:imageSvg(w),hint:"Piensa en la palabra y usa la pista si la necesitas."};
 if(type==="imageToWord"||type==="esToEn"){q.answer=w.en;q.prompt=type==="esToEn"?"Traduce al inglés:":"¿Cómo se dice en inglés?";q.choices=shuffle([w.en,...distractors(w,"en")])}
 else if(type==="enToEs"){q.answer=w.es;q.prompt="Traduce al español:";q.choices=shuffle([w.es,...distractors(w,"es")])}
 else if(type==="write"){q.answer=w.en;q.prompt="✏️ ¿Cómo se escribe en inglés?";q.hint="Escribe la palabra y comprueba tu respuesta."}
 else if(type==="letters"){q.answer=w.en;q.prompt="🔤 Ordena las letras:";q.letters=shuffle([...w.en.toUpperCase()]);q.hint="Forma la palabra inglesa correcta."}
 return q
}
export function isCorrect(q,value){return norm(value)===norm(q.answer)}
export {shuffle,norm};