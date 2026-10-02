import {WORDS,QUESTION_BANK} from "./data.js";
const shuffle=a=>[...a].sort(()=>Math.random()-.5);
const norm=s=>String(s??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase();
const byId=id=>WORDS.find(w=>w.id===id);
function distractors(current,field,count=3){return shuffle(WORDS.filter(w=>w.id!==current.id)).slice(0,count).map(w=>w[field])}
function imageSvg(w){
  const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 220"><defs><linearGradient id="g" x1="0" x2="1"><stop stop-color="#5b4bff"/><stop offset="1" stop-color="#ff5c8a"/></linearGradient></defs><rect width="300" height="220" rx="35" fill="url(#g)"/><circle cx="150" cy="105" r="72" fill="white" opacity=".18"/><text x="150" y="125" text-anchor="middle" font-size="92">'+w.emoji+'</text></svg>';
  return "data:image/svg+xml;charset=UTF-8,"+encodeURIComponent(svg);
}
function chooseSpec(level,used,answered,forcedType=null){
  const blocked=new Set([...used,...answered]);
  let pool=QUESTION_BANK.filter(q=>!blocked.has(q.id)&&q.level<=level);
  if(forcedType)pool=pool.filter(q=>q.type===forcedType);
  if(!pool.length){pool=QUESTION_BANK.filter(q=>!blocked.has(q.id));if(forcedType)pool=pool.filter(q=>q.type===forcedType)}
  if(!pool.length)return null;
  return pool[Math.floor(Math.random()*pool.length)];
}
export function availableCount(level=5,answered=new Set()){return QUESTION_BANK.filter(q=>!answered.has(q.id)&&q.level<=level).length}
export function createQuestion(level=1,used=new Set(),answered=new Set(),forcedType=null){
  const spec=chooseSpec(level,used,answered,forcedType); if(!spec)return null;
  used.add(spec.id); const w=byId(spec.wordId);
  const q={id:spec.id,word:w,type:spec.type,level:spec.level,category:spec.category,choices:[],answer:w.en,image:imageSvg(w),hint:"Piensa en la palabra y usa la pista si la necesitas."};
  if(spec.type==="imageToWord"){q.answer=w.en;q.prompt="🖼️ ¿Cómo se dice en inglés?";q.choices=shuffle([w.en,...distractors(w,"en")])}
  else if(spec.type==="esToEn"){q.answer=w.en;q.prompt="🇪🇸 → 🇬🇧 Traduce al inglés:";q.choices=shuffle([w.en,...distractors(w,"en")])}
  else if(spec.type==="enToEs"){q.answer=w.es;q.prompt="🇬🇧 → 🇪🇸 Traduce al español:";q.choices=shuffle([w.es,...distractors(w,"es")])}
  else if(spec.type==="write"){q.answer=w.en;q.prompt="✏️ Escribe la palabra en inglés:";q.hint="Escribe la palabra y comprueba tu respuesta."}
  else if(spec.type==="letters"){q.answer=w.en;q.prompt="🔤 Ordena las letras:";q.letters=shuffle([...w.en.toUpperCase()]);q.hint="Forma la palabra inglesa correcta."}
  else if(spec.type==="wordToImage"){q.answer=w.id;q.prompt="🔎 Elige la imagen que corresponde a:";q.hint="Busca el significado de “"+w.en+"”.";q.choices=shuffle([w,...shuffle(WORDS.filter(x=>x.id!==w.id)).slice(0,3)])}
  else if(spec.type==="listen"){q.answer=w.en;q.prompt="🔊 Escucha y elige la palabra:";q.hint="Escucha y selecciona la palabra correcta.";q.choices=shuffle([w.en,...distractors(w,"en")])}
  else if(spec.type==="vocabulary"){q.answer=w.en;q.prompt="📚 ¿Qué palabra en inglés significa “"+w.es+"”?";q.hint="Usa el vocabulario que has aprendido.";q.choices=shuffle([w.en,...distractors(w,"en")])}
  return q;
}
export function isCorrect(q,value){return norm(value)===norm(q.answer)}
export {shuffle,norm};
