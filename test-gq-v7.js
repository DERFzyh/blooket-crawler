/**
 * Gold Quest v7 - 健壮登录 + Host React State 深度分析
 */
const {chromium}=require('playwright-extra');
const StealthPlugin=require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

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
if(ca.some(function(a){return(a||'').toString().trim()===t})&&c.offsetHeight>0){c.click();__lastQ=qt}
});
}
if(s.stage==='prize'&&s.choices&&s.choices.length>=2){
var cs=s.choices.map(function(c){return c.text||c.question||'?'});
console.log('[CHEST] STATE: '+JSON.stringify({gold:s.gold,choices:cs,keys:Object.keys(s).filter(function(k){return typeof s[k]!=='function'})}));
}
break;
}
}catch(e){}
},600);
})()`;

async function login(ctx){
const p=await ctx.newPage();
await p.goto('https://id.blooket.com/login',{waitUntil:'domcontentloaded',timeout:30000});
await p.waitForTimeout(3000);

// Fill form
await p.fill('input[name=username]','fred11zyh@outlook.com');
await p.fill('input[name=password]','ZYH11fred@blooket');
await p.waitForTimeout(1000);

// Wait for submit button to become enabled
try{
await p.waitForSelector('button[type=submit]:not([disabled])',{timeout:15000});
await p.click('button[type=submit]');
console.log('Submit clicked');
}catch(e){
// Fallback: try pressing Enter
console.log('Submit btn wait failed, trying Enter');
await p.keyboard.press('Enter');
}
await p.waitForTimeout(8000);
console.log('Login result:',p.url());
await p.close();
return p.url().includes('dashboard');
}

(async()=>{
const b=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const ctx=await b.newContext({viewport:{width:1400,height:1000}});
await ctx.addInitScript(()=>{Object.defineProperty(navigator,'webdriver',{get:()=>false})});

const ok=await login(ctx);
if(!ok){console.log('Login failed');await b.close();return;}

// Host
const pHost=await ctx.newPage();
pHost.on('console',msg=>{const t=msg.text();if(t.includes('[BOT]')||t.includes('[CHEST]')||t.includes('[HOST]'))console.log(t)});
await pHost.goto('https://play.blooket.com/host?id=685d405f64022b0fbe8ac753',{waitUntil:'domcontentloaded',timeout:30000});
await pHost.waitForTimeout(4000);

const imgs=await pHost.$$('img');
for(const img of imgs){
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
if(!PIN){await b.close();return;}

// Join bot
const pBot=await ctx.newPage();
pBot.on('console',msg=>{const t=msg.text();if(t.includes('[BOT]')||t.includes('[CHEST]'))console.log('🌐',t)});
await pBot.goto('https://play.blooket.com/play',{waitUntil:'domcontentloaded',timeout:30000});
await pBot.waitForTimeout(3000);
await pBot.fill('input[name="join-code"]',PIN);await pBot.keyboard.press('Enter');
await pBot.waitForTimeout(6000);
try{
const nameEl=await pBot.$('input:not([type="hidden"]):not([name="join-code"])');
if(nameEl&&await nameEl.isVisible({timeout:3000}).catch(()=>false)){await nameEl.fill('Bot');await pBot.keyboard.press('Enter');}
await pBot.waitForTimeout(3000);
}catch(e){}
console.log('Bot:',pBot.url());

// Start game
await pHost.waitForTimeout(3000);
await pHost.evaluate(()=>{
document.querySelectorAll('button,[role=button]').forEach(b=>{
if((b.textContent||'').trim().toLowerCase().includes('start'))b.click();
});
});
// Wait for instructions to pass
console.log('Waiting for instructions...');
await pHost.waitForTimeout(18000); // 18s for instructions to auto-pass
console.log('Host URL:',pHost.url());

// Inject AA
for(const f of pBot.frames()){try{await f.evaluate(BOT_AA)}catch(e){}}
try{await pBot.evaluate(BOT_AA)}catch(e){}

// Monitor
for(let t=0;t<30;t++){
await pHost.waitForTimeout(3000);

// ====== HOST full game state ======
const hostFullState=await pHost.evaluate(()=>{
function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
// Find ALL game state nodes with more context
var states=[];
for(var el of document.querySelectorAll('*')){
var k=Object.keys(el).filter(function(x){return x.indexOf('__react')===0});if(!k.length)continue;
var s=wF(el[k[0]],0);if(!s)continue;
// Look for game-related state
var keys=Object.keys(s).filter(function(k){return typeof s[k]!=='function'&&k[0]!=='_'});
if(keys.length>5){
// Check for game-specific keys
var hasGame=keys.some(function(k){
return k==='stage'||k==='question'||k==='questions'||k==='host'||k==='game'||
k==='players'||k==='gold'||k==='standings'||k==='currentScreen'||
k==='screen'||k==='phase'||k==='round'||k==='timer'||k==='gameMode'||
k==='answers'||k==='choices'||k==='correct'||k==='correctAnswers';
});
if(hasGame){
var dump={};
// Dump non-function, non-prefixed state values
keys.forEach(function(k){dump[k]=typeof s[k]==='object'?(Array.isArray(s[k])?'Array['+s[k].length+']':'Object{'+(Object.keys(s[k]||{}).slice(0,5).join(','))+'}') :String(s[k]).slice(0,80)});
states.push(dump);
}
}
}
return JSON.stringify(states.slice(0,3),null,2);
});
const hostUrl=await pHost.evaluate(()=>location.href.split('/').pop());
console.log(`\n[${t*3}s] HOST: ${hostUrl}`);
console.log('HOST STATES:');
try{console.log(hostFullState.slice(0,1000))}catch(e){}

// Bot state
const botState=await pBot.evaluate(()=>{
function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
for(var el of document.querySelectorAll('*')){
var k=Object.keys(el).filter(function(x){return x.indexOf('__react')===0});if(!k.length)continue;
var s=wF(el[k[0]],0);if(!s)continue;
if(s.stage||s.gold!==undefined||s.question||s.choices){
var dump={stage:s.stage,gold:s.gold};
if(s.question)dump.q=(s.question.question||s.question.text);
if(s.choices&&s.choices.length)dump.cc=s.choices.map(function(c){return c.text||c.question||'?'});
// Also dump key state keys for host
var stateKeys=Object.keys(s).filter(function(k){return typeof s[k]!=='function'&&k[0]!=='_'});
dump.keys=stateKeys;
return JSON.stringify(dump,null,2);
}
}
return 'idle';
}).catch(()=>'err');
console.log('BOT STATE:',botState.slice(0,500));

// Try clicking ALL buttons on host that look like game controls
await pHost.evaluate(()=>{
var allButtons=document.querySelectorAll('button,[role=button],div[class*=button],span[class*=button],[class*=btn]');
allButtons.forEach(function(b){
var t=(b.textContent||'').trim().toLowerCase();
// Gold Quest specific controls
if(t==='next'||t==='continue'||t==='ok'||t==='done'||t==='play again'||
t==='ready'||t==='go'||t==='skip'){
b.click();console.log('[HOST-CLICK] '+b.tagName+':"'+t+'" class:'+(b.className||'prop').slice(0,30));
}
});
// Also try clicking center area if no buttons found
});

if(hostUrl.includes('final')){console.log('Game ended');break}
}

await b.close();
})().catch(e=>console.error('FATAL:',e.message));
