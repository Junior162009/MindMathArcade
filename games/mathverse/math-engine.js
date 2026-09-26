(()=>{"use strict";
function normalizeNumber(v){if(typeof v==="number")return v;let s=String(v??"").trim().replace(",",".").toLowerCase();if(!s)return NaN;const m=s.match(/(?:^|\s)x\s*=\s*(-?\d+(?:\.\d+)?)\s*$/);if(m)return Number(m[1]);const n=Number(s);return Number.isFinite(n)?n:NaN}
function solve(problem,input){const value=normalizeNumber(input);const expected=Number(problem.answer);return{value,expected,correct:Number.isFinite(value)&&Math.abs(value-expected)<0.00001,topic:problem.topic||"general"}}
function hint(problem,level){const n=Math.max(1,Math.min(3,Number(level)||1));return problem["hint"+n]||problem.hint3||""}
function nextDifficulty(profile={}){const wrong=Number(profile.wrong||0),solved=Number(profile.solved||0);if(wrong>=3&&wrong>solved)return"reinforcement";if(solved>=5)return"advanced";return"standard"}
window.MathverseMathEngine={version:1,solve,hint,nextDifficulty,normalizeNumber};
})();