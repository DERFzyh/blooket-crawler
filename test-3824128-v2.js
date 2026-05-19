/**
 * 加入 game 3824128 - 2 Bots + 全面宝箱状态记录
 */
const {chromium}=require('playwright-extra');
const StealthPlugin=require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

const PIN='3824128';

// 只答题，不自动选宝箱（让我们观察宝箱阶段）
const AA = `(function(){
if(window.__aaSet)return;window.__aaSet=1;
window.__chestLog=[];
var __lastQ='';
setInterval(function(){
try{
function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
for(var el of document.querySelectorAll('*')){
var k=Object.keys(el).filter(function(x){return x.indexOf('__react')===0});if(!k.length)continue;
var s=wF(el[k[0]],0);if(!s)continue;
if(!s.question&&!s.stage&&s.gold===undefined&&!s.choices)continue;
var qt=s.question&&(s.question.question||s.question.text);

// Answer
if(qt&&s.question.correctAnswers&&qt!==__lastQ){
var ca=Array.isArray(s.question.correctAnswers)?s.question.correctAnswers:[s.question.correctAnswers];
document.querySelectorAll('[class*="answerContainer"]').forEach(function(c){
var t=(c.textContent||'').trim();
if(ca.some(function(a){return(a||'').toString().trim()===t})&&c.offsetHeight>0){c.click();__lastQ=qt;}
});
}

// CHEST - FULL state dump, don't auto-pick
if(s.stage==='prize'&&s.choices&&s.choices.length>=2){
// Deep dump all choice properties
var chestEntry={ts:Date.now(),gold:s.gold,gold2:s.gold2,stage:s.stage,
stateKeys:Object.keys(s).filter(function(k){return typeof s[k]!=='function'&&k[0]!=='_'}),
choices:s.choices.map(function(c,i){
var props={};
Object.keys(c).forEach(function(ck){try{if(typeof c[ck]!=='function')props[ck]=c[ck]}catch(e){}});
return {index:i,text:c.text||null,question:c.question||null,type:c.type||null,allProps:props};
})};
console.log('[CHEST-DUMP] '+JSON.stringify(chestEntry));
window.__chestLog.push(chestEntry);

// Pick worst (lowest gold) to keep gold < 10000
var minI=0,minV=99999;
s.choices.forEach(function(c,i){
var txt=c.text||c.question||'';
var m=txt.match(/\\+?(\\d+)/);var v=m?parseInt(m[1]):0;
if(txt.indexOf('Swap')>=0||txt.indexOf('swp')>=0)v=5;
if(txt.indexOf('Steal')>=0||txt.indexOf('stl')>=0)v=5;
if(txt.indexOf('Lose')>=0||txt.indexOf('los')>=0)v=-999;
if(txt.indexOf('Triple')>=0)v=999;
if(txt.indexOf('Double')>=0)v=666;
if(v<minV){minV=v;minI=i}
});
var ce=document.querySelectorAll('[class*="chest"],[class*="Chest"]');
if(ce.length>minI){ce[minI].click();console.log('[CHEST-PICK] '+minI+'/'+s.choices.length+' val='+minV)}
// Click any Next after picking
setTimeout(function(){document.querySelectorAll('button,[role=button]').forEach(function(b){if((b.textContent||'').trim().match(/next|continue|ok/i))b.click()})},2000);
break;
}

// Feedback -> click Next
if(s.stage==='feedback'){
document.querySelectorAll('button,[role=button]').forEach(function(b){
if((b.textContent||'').trim().match(/next|continue|ok|done/i))b.click();
});
}
break;
}}catch(e){}},600)})()`;

(async()=>{
const b=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const ctx=await b.newContext({viewport:{width:1400,height:1000}});
await ctx.addInitScript(()=>{Object.defineProperty(navigator,'webdriver',{get:()=>false})});

console.log('Joining game',PIN,'with 2 bots...\n');

const bots=[];
for(const name of ['GQ-A','GQ-B']){
const pBot=await ctx.newPage();
pBot.on('console',msg=>{const t=msg.text();if(t.includes('[CHEST')||t.includes('[BOT]'))console.log('  '+name,t)});
await pBot.goto('https://play.blooket.com/play',{waitUntil:'domcontentloaded',timeout:30000});
await pBot.waitForTimeout(3000);

// Accept cookies
try{await pBot.evaluate(()=>{document.querySelectorAll('button').forEach(b=>{if((b.textContent||'').includes('Accept'))b.click()})});await pBot.waitForTimeout(1500)}catch(e){}

// Enter PIN
await pBot.fill('input[name="join-code"]',PIN);
await pBot.keyboard.press('Enter');
await pBot.waitForTimeout(8000);

// Enter name
try{
const nameEl=await pBot.$('input:not([type="hidden"]):not([name="join-code"])');
if(nameEl&&await nameEl.isVisible({timeout:5000}).catch(()=>false)){
await nameEl.fill(name);await pBot.keyboard.press('Enter');await pBot.waitForTimeout(4000);
}
}catch(e){}
console.log(name,'URL:',pBot.url());
bots.push(pBot);
}

// Wait for game to start
console.log('\nWaiting for game to start...');
for(let i=0;i<10;i++){
await ctx.pages()[1].waitForTimeout(3000);
const state=await bots[0].evaluate(()=>{
function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
for(var el of document.querySelectorAll('*')){var k=Object.keys(el).filter(x=>x.indexOf('__react')===0);if(!k.length)continue;var s=wF(el[k[0]],0);if(!s)continue;if(s.stage||s.question)return s.stage;if(s.gold!==undefined)return 'gold='+s.gold;}return'none';
}).catch(()=>'none');
process.stdout.write(state[0]||'.');
if(state!=='none')break;
}

// Inject AA
console.log('\nInjecting AA...');
for(const pBot of bots){
for(const f of pBot.frames()){try{await f.evaluate(AA)}catch(e){}}
try{await pBot.evaluate(AA)}catch(e){}
}
console.log('AA injected');

// Monitor for 3 minutes
console.log('\n=== MONITORING (180s) ===');
const start=Date.now();
let lastLog=[null,null];
while(Date.now()-start<180000){
await bots[0].waitForTimeout(3000);

for(const [i,pBot] of bots.entries()){
const s=await pBot.evaluate(()=>{
function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
for(var el of document.querySelectorAll('*')){var k=Object.keys(el).filter(x=>x.indexOf('__react')===0);if(!k.length)continue;var s=wF(el[k[0]],0);if(!s)continue;if(!s.stage&&s.gold===undefined&&!s.question&&!s.choices)continue;return JSON.stringify({stage:s.stage,gold:s.gold,q:s.question?(s.question.question||s.question.text).slice(0,40):null,ch:(s.choices||[]).length>0})}return'none';
}).catch(()=>'none');
if(s!==lastLog[i]&&s!=='none'){
console.log(`[B${i}] ${s}`);
lastLog[i]=s;
}
}

const elapsed=Math.round((Date.now()-start)/1000);
if(elapsed%15===0)console.log(`  ... ${elapsed}s`);
}

// Final chest logs
console.log('\n=== CHEST LOGS ===');
for(const [i,pBot] of bots.entries()){
try{
const log=await pBot.evaluate(()=>JSON.stringify(window.__chestLog||[]));
const parsed=JSON.parse(log);
console.log(`Bot${i} chests (${parsed.length}):`);
if(parsed.length===0)console.log('  (none)');
else parsed.forEach((e,i)=>console.log(`  #${i}: gold=${e.gold} choices=${JSON.stringify(e.choices?.map(c=>c.text||c.question))}`));
}catch(e){console.log('Bot'+i+' err:',e.message)}
}

await b.close();
console.log('\nDone');
})().catch(e=>console.error('FATAL:',e.message));
