/* TecnoMath Tournament v2
 * A game only needs to call:
 *   window.TecnomathTournament.submit(score, durationMs, metadata)
 * It can also dispatch:
 *   window.postMessage({type:'tecnomath:tournament-score',score:123}, '*')
 */
(function(){'use strict';
 const q=new URLSearchParams(location.search), id=q.get('tournament');
 if(!id||!window.TecnomathAuth)return;
 let sent=false,started=Date.now();
 async function submit(score,durationMs,metadata){
   if(sent)return {ok:false,alreadySent:true};
   const n=Math.floor(Number(score));
   if(!Number.isFinite(n)||n<0)throw Error('Puntuación inválida.');
   const db=await TecnomathAuth.getClient();
   const {data,error}=await db.rpc('tecnomath_tournament_submit_score',{p_tournament_id:id,p_score:n,p_duration_ms:Math.max(0,Math.floor(Number(durationMs)||(Date.now()-started))),p_metadata:metadata&&typeof metadata==='object'?metadata:{}});
   if(error)throw error; sent=true; window.postMessage({type:'tecnomath:tournament-submitted',score:n},'*'); return {ok:true,data};
 }
 window.TecnomathTournament={id,submit,isActive:()=>!sent};
 window.addEventListener('message',e=>{if(e.data?.type==='tecnomath:tournament-score'&&e.data.score!=null)submit(e.data.score,e.data.durationMs,e.data.metadata).catch(console.error)});
})();
