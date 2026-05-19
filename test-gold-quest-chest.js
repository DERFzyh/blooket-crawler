/**
 * Gold Quest 完整测试 - 自主持 + 2个Bot玩家 + 宝箱深度探索
 * 目标：走通抽奖操控的技术路径
 */
const {chromium}=require('playwright-extra');
const StealthPlugin=require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

const GOLD_QUEST_SET_ID = '685d405f64022b0fbe8ac753'; // same as fishing/crypto test

// 自动答题脚本 - 包含详细宝箱日志
const AUTO_ANSWER_JS = `(function(){
if(window.__aaId)clearInterval(window.__aaId);
window.__aaLastQ='';window.__aaStats={q:0,chest:0};window.__chestLog=[];
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

// 1. Answer question
if(qt&&s.question.correctAnswers&&qt!==window.__aaLastQ){
var ca=Array.isArray(s.question.correctAnswers)?s.question.correctAnswers:[s.question.correctAnswers];
var clicked=false;
document.querySelectorAll('[class*="answerContainer"]').forEach(function(c){
if(clicked)return;
var t=(c.textContent||'').trim();
if(ca.some(function(a){return(a||'').toString().trim()===t})&&c.offsetHeight>0){
c.click();clicked=true;window.__aaLastQ=qt;window.__aaStats.q++;
console.log('[BOT] answered: '+t);
}
});
}

// 2. CHEST PHASE - detailed logging + pick worst (stay <10000 gold)
if(stage==='prize'&&s.choices&&s.choices.length>=2){
var chestInfo={
ts:Date.now(),
gold:s.gold,
gold2:s.gold2,
choices:s.choices.map(function(c,i){
var raw={};for(var ck in c){if(c.hasOwnProperty(ck))try{raw[ck]=c[ck]}catch(e){}}
return {index:i,text:c.text||c.question||null,type:c.type||null,amount:c.amount||null,allKeys:Object.keys(c),raw:raw};
}),
stateKeys:Object.keys(s).filter(function(k){return k!=='question'&&typeof s[k]!=='function'})
};

var last=window.__chestLog[window.__chestLog.length-1];
if(!last||Date.now()-last.ts>1500){
window.__chestLog.push(chestInfo);
console.log('[CHEST] '+JSON.stringify(chestInfo));
}

// Pick worst chest to keep gold low
var minVal=99999,minIdx=0;
s.choices.forEach(function(c,i){
var txt=c.text||c.question||'';
var m=txt.match(/\\+?\\s*(\\d+)/);var v=m?parseInt(m[1]):0;
if(txt.indexOf('Swap')>=0||txt.indexOf('swp')>=0)v=0;
if(txt.indexOf('Steal')>=0||txt.indexOf('stl')>=0)v=0;
if(txt.indexOf('Lose')>=0||txt.indexOf('los')>=0)v=-999;
if(v<minVal){minVal=v;minIdx=i}
});

var ce=document.querySelectorAll('[class*="chest"],[class*="Chest"],[class*="prize"],[class*="chestImage"]');
if(ce.length>minIdx&&ce[minIdx].offsetHeight>0){
ce[minIdx].click();window.__aaStats.chest++;
console.log('[BOT] chest #'+minIdx+' picked (val='+minVal+')');
}
break;
}

// 3. Advance buttons
document.querySelectorAll('button:not([disabled])').forEach(function(c){if(c.offsetHeight>0&&c.offsetHeight<200)c.click()});
document.querySelectorAll('[role=button]').forEach(function(c){if(c.offsetHeight>0&&c.offsetHeight<200)c.click()});
break;
}
}catch(e){}
},600)})()`;

// 主持人点击 "Next" / "Continue" 推进回合
const HOST_ADVANCE_JS = `(function(){
document.querySelectorAll('button, [role=button], [class*="button"]').forEach(function(b){
var t=(b.textContent||'').trim().toLowerCase();
if(t==='next'||t==='continue'||t==='ok'||t==='skip'||t==='start'){
b.click();console.log('[HOST] clicked: '+t);
}
});
})()`;

async function run() {
const b=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const ctx=await b.newContext({viewport:{width:1400,height:1000}});
await ctx.addInitScript(()=>{
Object.defineProperty(navigator,'webdriver',{get:()=>false});
setInterval(()=>{document.querySelectorAll('button').forEach(b=>{var t=b.textContent||'';if(t.includes('Accept'))b.click()})},500);
});

// ====== Step 1: Login ======
console.log('=== 🔐 LOGIN ===');
const pLogin=await ctx.newPage();
pLogin.on('console',msg=>{if(msg.text().includes('[BOT]')||msg.text().includes('[HOST]'))console.log(msg.text())});
await pLogin.goto('https://id.blooket.com/login',{waitUntil:'domcontentloaded',timeout:30000});
await pLogin.waitForTimeout(4000);
await pLogin.fill('input[name=username]','fred11zyh@outlook.com');
await pLogin.fill('input[name=password]','ZYH11fred@blooket');
await pLogin.click('button[type=submit]');
await pLogin.waitForTimeout(8000);
console.log('   Login URL:',pLogin.url());
await pLogin.close();

// ====== Step 2: Host Gold Quest ======
console.log('\n=== 🎮 HOSTING GOLD QUEST ===');
const pHost=await ctx.newPage();
pHost.on('console',msg=>{if(msg.text().includes('[HOST]')||msg.text().includes('[BOT]'))console.log('🌐',msg.text())});
await pHost.goto('https://play.blooket.com/host?id='+GOLD_QUEST_SET_ID,{waitUntil:'domcontentloaded',timeout:30000});
await pHost.waitForTimeout(4000);

console.log('   Page:',pHost.url());

// Find and click Gold Quest
try{
const gameModes=await pHost.$$('img');
let clicked=false;
for(const img of gameModes){
const alt=await img.getAttribute('alt').catch(()=>'');
console.log('   Found game: alt="'+alt+'"');
if(alt&&alt.toLowerCase().includes('gold')){
await img.click();
clicked=true;
console.log('   ✅ Clicked Gold Quest');
break;
}
}
if(!clicked){
// Try buttons with text
const btns=await pHost.$$('button, [role=button]');
for(const btn of btns){
const t=(await btn.textContent()||'').trim();
console.log('   Button: "'+t+'"');
if(t.toLowerCase().includes('gold')){
await btn.click();
clicked=true;
console.log('   ✅ Clicked Gold Quest button');
break;
}
}
}
}catch(e){console.log('   Game select err:',e.message)}

await pHost.waitForTimeout(2000);

// Click Host
try{await pHost.click('button:has-text("Host")',{timeout:5000});console.log('   Clicked Host');}catch(e){}
await pHost.waitForTimeout(5000);

// Try hostNow
try{await pHost.click('#hostNow',{timeout:3000});console.log('   Clicked hostNow');}catch(e){}
await pHost.waitForTimeout(5000);

// Get PIN
let PIN=await pHost.evaluate(()=>{
const el=document.querySelector('._idNumberText_1gorp_59, [class*="idNumberText"], [class*="idNumber"]');
if(el)return el.textContent.trim();
const m=document.body.textContent.match(/\\b(\\d{6,7})\\b/);
return m?m[1]:null;
});
console.log('   PIN:',PIN);

if(!PIN){
// Screenshot for debugging
await pHost.screenshot({path:'/tmp/gq-host-no-pin.png'});
console.log('   ❌ No PIN found, screenshot saved');
await b.close();
return;
}

// ====== Step 3: Join 2 bot players ======
console.log('\n=== 🤖 JOINING 2 BOTS ===');

async function createBot(name){
const pBot=await ctx.newPage();
pBot.on('console',msg=>{
const t=msg.text();
if(t.includes('[BOT]')||t.includes('[CHEST]'))console.log(name,':',t);
});
await pBot.goto('https://play.blooket.com/play',{waitUntil:'domcontentloaded',timeout:30000});
await pBot.waitForTimeout(3000);

// Enter PIN
try{
const pinInput=await pBot.$('input[name="join-code"]');
if(pinInput){await pinInput.click();await pBot.keyboard.type(PIN,{delay:80});await pBot.keyboard.press('Enter');}
}catch(e){console.log(name,'PIN input err:',e.message)}
await pBot.waitForTimeout(6000);

// Enter name
try{
const nameEl=await pBot.$('input:not([type="hidden"]):not([name="join-code"])');
if(nameEl&&await nameEl.isVisible({timeout:5000}).catch(()=>false)){
await nameEl.fill(name);
await pBot.keyboard.press('Enter');
await pBot.waitForTimeout(4000);
}
}catch(e){console.log(name,'name err:',e.message)}

console.log(name,'joined:',pBot.url());

// Inject auto-answer
for(const f of pBot.frames()){try{await f.evaluate(AUTO_ANSWER_JS)}catch(e){}}
try{await pBot.evaluate(AUTO_ANSWER_JS)}catch(e){}

return pBot;
}

const pBot1=await createBot('BotA');
const pBot2=await createBot('BotB');

// ====== Step 4: Start the game ======
console.log('\n=== ▶️  STARTING GAME ===');
// Click Start on host page
await pHost.evaluate(()=>{
document.querySelectorAll('button,[role=button]').forEach(b=>{
var t=(b.textContent||'').trim().toLowerCase();
if(t==='start'||t.includes('start')){b.click();console.log('[HOST] Start clicked')}
});
});
await pHost.waitForTimeout(2000);
// Click Skip if there's intro
await pHost.evaluate(()=>{
document.querySelectorAll('button,[role=button]').forEach(b=>{
var t=(b.textContent||'').trim().toLowerCase();
if(t==='skip'||t.includes('skip')){b.click();console.log('[HOST] Skip clicked')}
});
});
await pHost.waitForTimeout(3000);

// ====== Step 5: Monitor and advance ======
console.log('\n=== 👁️  MONITORING (90s) ===');
const startTime=Date.now();
let lastState='';

while(Date.now()-startTime<90000){
await pHost.waitForTimeout(2000);

// Check and advance host side
try{await pHost.evaluate(HOST_ADVANCE_JS);}catch(e){}

// Get state from bot1
try{
let state=null;
for(const f of pBot1.frames()){try{state=await f.evaluate(`(function(){function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}for(var el of document.querySelectorAll('*')){var k=Object.keys(el).filter(function(x){return x.indexOf('__react')===0});if(!k.length)continue;var s=wF(el[k[0]],0);if(!s)continue;if(s.stage||s.question||s.gold!==undefined)return JSON.stringify({stage:s.stage,gold:s.gold,q:(s.question?(s.question.question||s.question.text):null)});}return JSON.stringify({stage:'none'})})()`);if(state)break}catch(e){}}
if(!state)try{state=await pBot1.evaluate(`(function(){function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}for(var el of document.querySelectorAll('*')){var k=Object.keys(el).filter(function(x){return x.indexOf('__react')===0});if(!k.length)continue;var s=wF(el[k[0]],0);if(!s)continue;if(s.stage||s.question||s.gold!==undefined)return JSON.stringify({stage:s.stage,gold:s.gold,q:(s.question?(s.question.question||s.question.text):null)});}return JSON.stringify({stage:'none'})})()`)}catch(e){}

if(state){
const d=JSON.parse(state);
const s=d.stage+' q='+d.q+' gold='+d.gold;
if(s!==lastState){console.log('[STATE]',s);lastState=s;}
if(d.stage==='none'){console.log('   Game seems ended');break;}
}
}catch(e){}

// Periodically log chests
if(Math.floor((Date.now()-startTime)/1000)%10===0){
try{
const log1=await pBot1.evaluate(()=>JSON.stringify(window.__chestLog?.slice(-3)||[]));
const log2=await pBot2.evaluate(()=>JSON.stringify(window.__chestLog?.slice(-3)||[]));
const chests1=JSON.parse(log1);const chests2=JSON.parse(log2);
console.log('BotA chests:',chests1.length,'| BotB chests:',chests2.length);
}catch(e){}
}
}

// ====== Step 6: Final Summary ======
console.log('\n=== 📊 FINAL SUMMARY ===');
try{
const stats1=await pBot1.evaluate(()=>JSON.stringify(window.__aaStats));
const stats2=await pBot2.evaluate(()=>JSON.stringify(window.__aaStats));
console.log('BotA stats:',stats1);
console.log('BotB stats:',stats2);
}catch(e){}

try{
const log1=await pBot1.evaluate(()=>JSON.stringify(window.__chestLog,null,2));
console.log('\nBotA chest log:');
console.log(log1);
}catch(e){console.log('err:',e.message)}

try{
const log2=await pBot2.evaluate(()=>JSON.stringify(window.__chestLog,null,2));
console.log('\nBotB chest log:');
console.log(log2);
}catch(e){console.log('err:',e.message)}

// Screenshots
await pBot1.screenshot({path:'/tmp/gq-bot1-final.png'});
await pBot2.screenshot({path:'/tmp/gq-bot2-final.png'});
await pHost.screenshot({path:'/tmp/gq-host-final.png'});

await b.close();
console.log('\n✅ Done');
}

run().catch(e=>{console.error('FATAL:',e.message);process.exit(1);});
