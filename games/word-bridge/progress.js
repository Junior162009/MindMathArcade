import { EASY_LINGO_VERSION } from "./data.js";
const KEY="easyLingoProgress";
const defaults={version:EASY_LINGO_VERSION,xp:0,unlockedLevel:1,completedLevels:[],bestStreak:0,sound:true,music:false,animations:true,achievements:[],games:0,correct:0,wrong:0};
export function loadProgress(){try{return {...defaults,...JSON.parse(localStorage.getItem(KEY)||"{}")}}catch{return {...defaults}}}
let state=loadProgress();
export function getProgress(){return {...state}}
export function saveProgress(patch={}){state={...state,...patch};localStorage.setItem(KEY,JSON.stringify(state));window.dispatchEvent(new CustomEvent("easyl:progress",{detail:getProgress()}));return getProgress()}
export function resetProgress(){state={...defaults};localStorage.setItem(KEY,JSON.stringify(state));return getProgress()}
export function addXP(n){return saveProgress({xp:state.xp+Math.max(0,n)})}
export function recordAnswer(correct,streak){const p=loadProgress();return saveProgress({games:p.games+1,correct:p.correct+(correct?1:0),wrong:p.wrong+(correct?0:1),bestStreak:Math.max(p.bestStreak,streak)})}
export { KEY };
