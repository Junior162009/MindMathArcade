import {loadProgress,saveProgress } from "./progress.js";
export const ACHIEVEMENTS=[
{id:"first",icon:"🏅",title:"Primera partida",desc:"Juega tu primera partida."},
{id:"streak5",icon:"🔥",title:"Racha de 5",desc:"Consigue una racha de 5."},
{id:"points50",icon:"⭐",title:"50 puntos",desc:"Consigue 50 puntos."},
{id:"perfect",icon:"💯",title:"100% de precisión",desc:"Completa una partida perfecta."},
{id:"perfectScore",icon:"👑",title:"Perfect Score",desc:"Responde correctamente todas las preguntas."},
{id:"level1",icon:"📚",title:"Nivel 1 completo",desc:"Completa BEGINNER."},
{id:"level5",icon:"🚀",title:"Nivel 5 completo",desc:"Completa MASTER."}
];
export function checkAchievements({score=0,total=10,bestStreak=0,level=1}={}){const p=loadProgress(),ids=new Set(p.achievements);const unlock=[];const add=(id)=>{if(!ids.has(id)){ids.add(id);unlock.push(ACHIEVEMENTS.find(a=>a.id===id))}};
if(p.games>=1)add("first");if(bestStreak>=5||p.bestStreak>=5)add("streak5");if(score>=50)add("points50");if(total&&score===total){add("perfect");add("perfectScore")}if(p.completedLevels.includes(1)||level>1)add("level1");if(p.completedLevels.includes(5))add("level5");
if(unlock.length)saveProgress({achievements:[...ids]});return unlock}
