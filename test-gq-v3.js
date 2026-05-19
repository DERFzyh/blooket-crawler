/**
 * Gold Quest 完整流程测试 v3
 * 不skip，让它自然走完，host端自动推进
 */
const {chromium}=require('playwright-extra');
const StealthPlugin=require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

const AUTO_ANSWER_JS = `(function(){
if(window.__aaId)clearInterval(window.__aaId);
window.__aaLastQ='';window.__aaStats={q:0,chest:0};window.__chestLog=[];window.__allLog=[];
window.__aaId=setInterval(function(){
try{
function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
for(var el of document.querySelectorAll('*')){
var k=Object.keys(el).filter(function(x){return x.indexOf('__react')===0});if(!k.length)continue;
var s=wF(el[k[0]],0);if(!s)continue;
var hasGame=Object.keys(s).some(function(k){return k==='question'||k==='stage'||k==='gold'||k==='choices'||k==='weight'||k==='lure'||k==='crypto'||k==='password'});
if(!hasGame)continue;
var qt=s.question&&(s.question.question||s.question.text);
var stage=s.stage;

// Log all state changes
var stateId=stage+':'+!!qt+':'+s.gold+':'+(s.choices?1:0);
if(window.__lastStateId!==stateId){
window.__lastStateId=stateId;
var logEntry={ts:Date.now(),stage:stage,gold:s.gold,hasQuestion:!!qt,hasChoices:!!(s.choices&&s.choices.length)};
if(qt)logEntry.question=qt.slice(0,60);
if(s.choices&&s.choices.length)logEntry.choiceTexts=s.choices.map(function(c){return c.text||c.question||'???'});
window.__allLog.push(logEntry);
console.log('[BOT] '+JSON.stringify(logEntry));
}

// 1. Answer question (only answer once per question)
if(qt&&s.question.correctAnswers&&qt!==window.__aaLastQ){
var ca=Array.isArray(s.question.correctAnswers)?s.question.correctAnswers:[s.question.correctAnswers];
var clicked=false;
document.querySelectorAll('[class*="answerContainer"]').forEach(function(c){
if(clicked)return;
var t=(c.textContent||'').trim();
if(ca.some(function(a){return(a||'').toString().trim()===t})&&c.offsetHeight>0){
c.click();clicked=true;window.__aaLastQ=qt;window.__aaStats.q++;
}
});
}

// 2. Chest selection - ALWAYS pick worst to avoid high gold
if(stage==='prize'&&s.choices&&s.choices.length>=2){
var chestInfo={
stage:stage,gold:s.gold,gold2:s.gold2,
choices:s.choices.map(function(c,i){
return {i:i,txt:c.text||c.question||'?',keys:Object.keys(c).filter(function(k){return typeof c[k]!=='function'})};
})
};
console.log('[CHEST] '+JSON.stringify(chestInfo));
window.__chestLog.push(chestInfo);

// Pick WORST to stay under 10000
var minVal=99999,minIdx=0;
s.choices.forEach(function(c,i){
var txt=c.text||c.question||'';
var m=txt.match(/\\+?\\s*(\\d+)/);var v=m?parseInt(m[1]):0;
if(txt.indexOf('Swap')>=0||txt.indexOf('swp')>=0)v=5;
if(txt.indexOf('Steal')>=0||txt.indexOf('stl')>=0)v=5;
if(txt.indexOf('Lose')>=0||txt.indexOf('los')>=0)v=-999;
if(v<minVal){minVal=v;minIdx=i}
});
var ce=document.querySelectorAll('[class*="chest"],[class*="Chest"],[class*="prize"],[class*="chestImage"]');
if(ce.length>minIdx&&ce[minIdx].offsetHeight>0){
ce[minIdx].click();window.__aaStats.chest++;
}
break;
}

// 3. Advance - click visible clickables
document.querySelectorAll('button:not([disabled]), [role=button]').forEach(function(c){
if(c.offsetHeight>0&&c.offsetHeight<200)c.click();
});
break;
}
}catch(e){}
},600)})()`;

(async()=>{
const b=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const ctx=await b.newContext({viewport:{width:1400,height:1000}});
await ctx.addInitScript(()=>{
Object.defineProperty(navigator,'webdriver',{get:()=>false});
});

// Login
const pLogin=await ctx.newPage();
await pLogin.goto('https://id.blooket.com/login',{waitUntil:'domcontentloaded',timeout:30000});
await pLogin.waitForTimeout(4000);
await pLogin.fill('input[name=username]','fred11zyh@outlook.com');
await pLogin.fill('input[name=password]','ZYH11fred@blooket');
await pLogin.click('button[type=submit]');
await pLogin.waitForTimeout(8000);
await pLogin.close();

// Host
const pHost=await ctx.newPage();
await pHost.goto('https://play.blooket.com/host?id=685d405f64022b0fbe8ac753',{waitUntil:'domcontentloaded',timeout:30000});
await pHost.waitForTimeout(4000);
const gameModes=await pHost.$$('img');
for(const img of gameModes){
const alt=await img.getAttribute('alt').catch(()=>'');
if(alt&&alt.toLowerCase().includes('gold')){await img.click();console.log('Mode:',alt);break}
}
await pHost.waitForTimeout(2000);
await pHost.click('button:has-text("Host")',{timeout:5000}).catch(()=>{});
await pHost.waitForTimeout(5000);
try{await pHost.click('#hostNow',{timeout:3000})}catch(e){}
await pHost.waitForTimeout(5000);

const PIN=await pHost.evaluate(()=>{
const el=document.querySelector('._idNumberText_1gorp_59, [class*="idNumberText"], [class*="idNumber"]');
if(el)return el.textContent.trim();
const m=document.body.textContent.match(/\b(\d{6,7})\b/);
return m?m[1]:null;
});
console.log('PIN:',PIN);

// Create 2 bots
const bots=[];
for(const name of ['QA','BB']){
const pBot=await ctx.newPage();
await pBot.goto('https://play.blooket.com/play',{waitUntil:'domcontentloaded',timeout:30000});
await pBot.waitForTimeout(3000);
await pBot.fill('input[name="join-code"]',PIN);await pBot.keyboard.press('Enter');
await pBot.waitForTimeout(6000);
const nameEl=await pBot.$('input:not([type="hidden"]):not([name="join-code"])');
if(nameEl&&await nameEl.isVisible({timeout:3000}).catch(()=>false)){
await nameEl.fill(name);await pBot.keyboard.press('Enter');
}
await pBot.waitForTimeout(4000);
console.log(name,'joined:',pBot.url());
bots.push(pBot);
}

// Wait a moment for lobby
await pHost.waitForTimeout(3000);

// Start game - DON'T skip anything
console.log('\n▶️  Starting...');
await pHost.evaluate(()=>{
document.querySelectorAll('button,[role=button]').forEach(b=>{
if((b.textContent||'').trim().toLowerCase().includes('start'))b.click();
});
});
await pHost.waitForTimeout(2000);

// Inject AA into bots
for(const pBot of bots){
for(const f of pBot.frames()){try{await f.evaluate(AUTO_ANSWER_JS)}catch(e){}}
try{await pBot.evaluate(AUTO_ANSWER_JS)}catch(e){}
}

// ====== HOST AUTO-ADVANCE (every 3s, try to click any progress button) ======
const hostAdvanceInterval=setInterval(async()=>{
try{
if(pHost.isClosed())return;
// Try all possible advance buttons
const clicked=await pHost.evaluate(()=>{
var count=0;
// Try specific button texts
document.querySelectorAll('button, [role=button], div[class*="button"], span[class*="button"]').forEach(b=>{
if(b.offsetHeight<1||b.offsetHeight>200)return;
var t=(b.textContent||'').trim().toLowerCase();
if(t==='next'||t==='continue'||t==='ok'||t==='go'||t==='proceed'||t==='play'){
b.click();count++;
} else if(!t&&b.tagName!=='BUTTON'){
// Empty div/span that might be a clickable icon/area
b.click();count++;
}
});
// Also try clicking the center of the page (some games use click-to-advance)
return count;
});
if(clicked>0)console.log('[HOST] advancing ('+clicked+' clicks)');

// Also get host page state
const hostState=await pHost.evaluate(()=>{
return JSON.stringify({
url:location.href,
body:(document.body.textContent||'').trim().slice(0,200),
buttons:Array.from(document.querySelectorAll('button:not([disabled]), [role=button]')).filter(b=>b.offsetHeight>0).map(b=>({t:(b.textContent||'').trim().slice(0,30)})).slice(0,10)
});
}).catch(()=>null);
if(hostState){
const d=JSON.parse(hostState);
console.log('[HOST-PAGE]',d.url.split('/').pop(),'|',d.body.slice(0,80),'| btns:',JSON.stringify(d.buttons));
}
}catch(e){}
},4000);

// Monitor for 120s
console.log('\n👁️  Monitoring...');
for(let t=0;t<30;t++){
await pHost.waitForTimeout(4000);

// Get bot summaries
for(const [i,pBot] of bots.entries()){
try{
const stats=await pBot.evaluate(()=>JSON.stringify({lastQ:window.__aaLastQ?.slice(0,40),chests:window.__chestLog.length,allLen:window.__allLog.length})).catch(()=>'?');
const d=JSON.parse(stats);
if(d.chests>0||d.allLen>3)process.stdout.write(`[Bot${i+1}:${d.allLen}s/${d.chests}c] `);
}catch(e){}
}
process.stdout.write('.');
}

clearInterval(hostAdvanceInterval);

// Final summary
console.log('\n\n=== 📊 RESULTS ===');
for(const [i,pBot] of bots.entries()){
try{
const stats=await pBot.evaluate(()=>JSON.stringify(window.__aaStats));
console.log('Bot'+i+':',stats);
const log=await pBot.evaluate(()=>JSON.stringify(window.__allLog,null,2));
console.log('Log:',log?log.slice(0,2000):'empty');
}catch(e){console.log('err:',e.message)}
try{
const chestLog=await pBot.evaluate(()=>JSON.stringify(window.__chestLog,null,2));
console.log('Chests:',chestLog?chestLog.slice(0,2000):'none');
}catch(e){}
}

await pHost.screenshot({path:'/tmp/gq-host-result.png'});
await b.close();
})().catch(e=>console.error('FATAL:',e.message));
