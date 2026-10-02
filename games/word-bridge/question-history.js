const TABLE="easy_lingo_question_history";
const LOCAL_KEY="easyLingoQuestionHistory";
function localKey(){return LOCAL_KEY+"_"+String(user?.id||getGuestId())}
const GUEST_KEY="easyLingoGuestId";
let remote=null,user=null,history=new Map(),ready=null;

function getGuestId(){
  let id=localStorage.getItem(GUEST_KEY);
  if(!id){id="guest-"+crypto.randomUUID();localStorage.setItem(GUEST_KEY,id)}
  return id;
}
async function init(){
  if(ready)return ready;
  ready=(async()=>{
    try{
      if(window.TecnomathAuth?.getClient){
        remote=await window.TecnomathAuth.getClient();
        user=await window.TecnomathAuth.currentUser();
      }
    }catch(_){}
    await load();
    return {user,guestId:user?.id||getGuestId()};
  })();
  return ready;
}
function localHistory(){
  try{
    const raw=JSON.parse(localStorage.getItem(localKey())||"{}");
    return raw&&typeof raw==="object"?raw:{};
  }catch{return {}}
}
function saveLocal(){
  const obj={};
  history.forEach((v,k)=>obj[k]=v);
  localStorage.setItem(localKey(),JSON.stringify(obj));
}
async function load(){
  history=new Map();
  if(user&&remote){
    const {data,error}=await remote.from(TABLE).select("question_id,result,answered_at").eq("user_id",user.id);
    if(!error) (data||[]).forEach(r=>history.set(r.question_id,{result:r.result,answeredAt:r.answered_at}));
    else throw error;
  }else{
    const local=localHistory();
    Object.entries(local).forEach(([id,v])=>history.set(id,v));
  }
  return history;
}
export async function initQuestionHistory(){await init();return history}
export function getQuestionHistory(){return new Map(history)}
export function hasAnswered(questionId){return history.has(questionId)}
export function getAnsweredIds(){return new Set(history.keys())}
export function getStats(total){
  let correct=0,wrong=0;
  history.forEach(v=>v.result==="correct"?correct++:wrong++);
  return {completed:history.size,total,remaining:Math.max(0,total-history.size),correct,wrong,accuracy:history.size?Math.round(correct/history.size*100):0};
}
export async function recordQuestion(questionId,result){
  await init();
  if(history.has(questionId))return history.get(questionId);
  const row={result,answeredAt:new Date().toISOString()};
  if(user&&remote){
    const {error}=await remote.from(TABLE).insert({user_id:user.id,question_id:questionId,result,answered_at:row.answeredAt});
    if(error && error.code!=="23505") throw error;
  }
  history.set(questionId,row);
  if(!user)saveLocal();
  return row;
}
export async function reloadQuestionHistory(){await load();return history}
export async function refreshQuestionHistoryForCurrentUser(){ready=null;remote=null;user=null;history=new Map();await init();return history}
export async function resetQuestionHistory(){
  await init();
  if(user&&remote){
    const {error}=await remote.from(TABLE).delete().eq("user_id",user.id);
    if(error)throw error;
  }
  history.clear();
  if(!user)saveLocal();
}
