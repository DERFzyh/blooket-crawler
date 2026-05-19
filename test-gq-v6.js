/**
 * Gold Quest v6 - 检查 HOST 页面的 React state 结构
 */
const {chromium}=require('playwright-extra');
const StealthPlugin=require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

// Bot AA (only answer, no chest auto-pick)
const BOT_AA = `(function(){
if(document.__aaSet)return;document.__aaSet=1;
var __lastQ='';
setInterval(function(){
try{
function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
for(var el of document.querySelectorAll('*')){
var k=Object.keys(el).filter(function(x){return x.indexOf('__react')===0});if(!k.length)continue;
var s=wF(el[k[0]],0);if(!s)continue;
if(!s.question&&!s.stage&&s.gold===undefined&&!s.choices)continue;
var qt=s.question&&(s.question.question||s.question.text);
if(qt&&s.question.correctAnswers&&qt!==__lastQ){
var ca=Array.isArray(s.question.correctAnswers)?s.question.correctAnswers:[s.question.correctAnswers];
document.querySelectorAll('[class*="answerContainer"]').forEach(function(c){
var t=(c.textContent||'').trim();
if(ca.some(function(a){return(a||'').toString().trim()===t})&&c.offsetHeight>0){c.click();__lastQ=qt;console.log('[BOT] answered: '+t)}
});
}
// CHEST: just log, don't auto-pick (let us control later)
if(s.stage==='prize'&&s.choices&&s.choices.length>=2){
var cs=s.choices.map(function(c){return c.text||c.question||'?'});
console.log('[CHEST] STATE: '+JSON.stringify({gold:s.gold,choices:cs,keys:Object.keys(s).filter(function(k){return typeof s[k]!=='function'})}));
}
break;
}
}catch(e){}
},600);
})()`;

(async()=>{
const b=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const ctx=await b.newContext({viewport:{width:1400,height:1000}});
await ctx.addInitScript(()=>{Object.defineProperty(navigator,'webdriver',{get:()=>false})});

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
pHost.on('console',msg=>{const t=msg.text();if(t.includes('[BOT]')||t.includes('[CHEST]')||t.includes('[HOST]'))console.log(t)});
await pHost.goto('https://play.blooket.com/host?id=685d405f64022b0fbe8ac753',{waitUntil:'domcontentloaded',timeout:30000});
await pHost.waitForTimeout(4000);
for(const img of await pHost.$$('img')){
const alt=await img.getAttribute('alt').catch(()=>'');
if(alt&&alt.toLowerCase().includes('gold')){await img.click();break}
}
await pHost.waitForTimeout(2000);
await pHost.click('button:has-text("Host")').catch(()=>{});
await pHost.waitForTimeout(5000);
try{await pHost.click('#hostNow',{timeout:3000})}catch(e){}
await pHost.waitForTimeout(5000);
const PIN=await pHost.evaluate(()=>{
const el=document.querySelector('[class*="idNumber"]');
if(el)return el.textContent.trim();
const m=document.body.textContent.match(/\b(\d{6,7})\b/);
return m?m[1]:null;
});
console.log('PIN:',PIN);

// Join 1 bot
const pBot=await ctx.newPage();
pBot.on('console',msg=>{const t=msg.text();if(t.includes('[BOT]')||t.includes('[CHEST]'))console.log('🌐',t)});
await pBot.goto('https://play.blooket.com/play',{waitUntil:'domcontentloaded',timeout:30000});
await pBot.waitForTimeout(3000);
await pBot.fill('input[name="join-code"]',PIN);await pBot.keyboard.press('Enter');
await pBot.waitForTimeout(6000);
try{
const nameEl=await pBot.$('input:not([type="hidden"]):not([name="join-code"])');
if(nameEl&&await nameEl.isVisible({timeout:3000}).catch(()=>false)){await nameEl.fill('Bot');await pBot.keyboard.press('Enter');await pBot.waitForTimeout(3000)}
}catch(e){}
console.log('Bot joined:',pBot.url());

// Click Start on host
await pHost.waitForTimeout(3000);
await pHost.evaluate(()=>{
document.querySelectorAll('button,[role=button]').forEach(b=>{
if((b.textContent||'').trim().toLowerCase().includes('start'))b.click();
});
});
await pHost.waitForTimeout(6000);
console.log('Host URL after start:',pHost.url());

// Inject AA into bot
for(const f of pBot.frames()){try{await f.evaluate(BOT_AA)}catch(e){}}
try{await pBot.evaluate(BOT_AA)}catch(e){}

// Wait for game to reach question phase
for(let t=0;t<20;t++){
await pHost.waitForTimeout(3000);

// ====== DEEP DUMP HOST REACT STATE ======
const hostState=await pHost.evaluate(()=>{
var results=[];
function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
for(var el of document.querySelectorAll('*')){
var k=Object.keys(el).filter(function(x){return x.indexOf('__react')===0});if(!k.length)continue;
var s=wF(el[k[0]],0);if(!s)continue;
var stateKeys=Object.keys(s).filter(function(k){return typeof s[k]!=='function'&&k[0]!=='_'});
results.push({keys:stateKeys.slice(0,20)});
}
return JSON.stringify(results.slice(0,5));
});
console.log(`[${t*3}s] HOST REACT STATES:`,hostState.slice(0,500));

// Bot state
const botState=await pBot.evaluate(()=>{
function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
for(var el of document.querySelectorAll('*')){
var k=Object.keys(el).filter(x=>x.indexOf('__react')===0);if(!k.length)continue;
var s=wF(el[k[0]],0);if(!s)continue;
if(!s.stage&&s.gold===undefined&&!s.question&&!s.choices)continue;
var dump={stage:s.stage};
if(s.question)dump.q=(s.question.question||s.question.text);
if(s.gold!==undefined)dump.g=s.gold;
if(s.choices&&s.choices.length)dump.choices=s.choices.map(function(c){return c.text||c.question||'?'});
return JSON.stringify(dump);
}
return 'idle';
}).catch(()=>'err');
console.log('  Bot:',botState);

// Try clicking on host
const hostUrl=await pHost.evaluate(()=>location.href);
if(hostUrl.includes('/gold')&&!hostUrl.includes('/final')){
// Try finding buttons in the game
const found=await pHost.evaluate(()=>{
var clicked=[];
document.querySelectorAll('button,[role=button],div[class*=button]').forEach(function(b){
if(b.offsetHeight<1||b.offsetHeight>300)return;
var t=(b.textContent||'').trim().toLowerCase().slice(0,20);
// Be conservative - only click if it looks like a game control
if(t==='next'||t==='continue'||t==='ok'||t==='play'||t==='ready'){
b.click();clicked.push({t:t,class:(b.className||'').slice(0,30)});
}
});
return clicked;
});
if(found.length>0)console.log('  -> clicked:',JSON.stringify(found));
}

// Dump ALL text on host page
if(t%3===0){
const hostText=await pHost.evaluate(()=>{
var texts=[];
document.querySelectorAll('div,p,span,h1,h2,h3').forEach(function(el){
var t=(el.textContent||'').trim();
if(t.length>2&&t.length<100&&el.offsetHeight>0&&el.offsetHeight<200){
texts.push(t.slice(0,60));
}
});
return JSON.stringify(texts.slice(0,20));
});
console.log('  Host texts:',hostText.slice(0,300));
}
}

await b.close();
})().catch(e=>console.error('FATAL:',e.message));
