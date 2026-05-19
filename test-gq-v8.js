/**
 * Gold Quest v8 - 修复登录 + 完整 Host State 探索
 */
const {chromium}=require('playwright-extra');
const StealthPlugin=require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

const LOGIN_CSS = `
.__aaId,.__aaSet{display:none}`; // dummy

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
console.log('[CHEST] '+JSON.stringify({gold:s.gold,choices:cs,keys:Object.keys(s).filter(function(k){return typeof s[k]!=='function'})}));
}
break;
}
}catch(e){}
},600);
})()`;

async function robustLogin(ctx) {
const p=await ctx.newPage();
await p.goto('https://id.blooket.com/login',{waitUntil:'domcontentloaded',timeout:30000});
await p.waitForTimeout(3000);

// 1. Accept cookies
try{
await p.evaluate(()=>{
document.querySelectorAll('button').forEach(b=>{
if((b.textContent||'').includes('Accept'))b.click();
});
});
await p.waitForTimeout(2000);
console.log('Cookies accepted');
}catch(e){}

// 2. Fill login form
await p.fill('input[name=username]','fred11zyh@outlook.com');
await p.fill('input[name=password]','ZYH11fred@blooket');
await p.waitForTimeout(1500);

// 3. Click "Let's go!" button
await p.evaluate(()=>{
document.querySelectorAll('button').forEach(b=>{
if((b.textContent||'').trim()==="Let's go!"||b.textContent.includes("Let's go")){
b.click();
}
});
});
await p.waitForTimeout(8000);
console.log('Login URL:',p.url());
const ok=p.url().includes('dashboard');
await p.close();
return ok;
}

(async()=>{
const b=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const ctx=await b.newContext({viewport:{width:1400,height:1000}});
await ctx.addInitScript(()=>{Object.defineProperty(navigator,'webdriver',{get:()=>false})});

const ok=await robustLogin(ctx);
if(!ok){console.log('Login failed');await b.close();return;}

// Host Gold Quest
const pHost=await ctx.newPage();
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
// Wait for instructions to pass (~20s)
console.log('Waiting for instructions to pass...');
for(let i=0;i<8;i++){
await pHost.waitForTimeout(3000);
const u=await pHost.evaluate(()=>location.href.split('/').pop());
process.stdout.write(u[0]||'.');
if(u==='gold'||u==='join'||u===undefined)break;
}
console.log('\nHost URL:',pHost.url());

// Inject AA
for(const f of pBot.frames()){try{await f.evaluate(BOT_AA)}catch(e){}}
try{await pBot.evaluate(BOT_AA)}catch(e){}

// Monitor with deep host state exploration
console.log('\n=== MONITORING ===');
for(let t=0;t<25;t++){
await pHost.waitForTimeout(3000);

// === HOST: Full React state dump ===
const hostDump=await pHost.evaluate(()=>{
function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
var all=[];
for(var el of document.querySelectorAll('*')){
var k=Object.keys(el).filter(function(x){return x.indexOf('__react')===0});if(!k.length)continue;
var s=wF(el[k[0]],0);if(!s)continue;
var keys=Object.keys(s).filter(function(k){return typeof s[k]!=='function'&&k[0]!=='_'&&k!=='setState'});
var important=keys.some(function(k){return['stage','question','questions','host','game','players','gold','standings','screen','phase','round','timer','gameMode','answers','choices','correct','correctAnswers','showQuestion','currentQuestion','questionIndex','state','waiting','countdown'].indexOf(k)>=0});
if(important){
var vals={};
keys.forEach(function(k){
var v=s[k];
if(v===null||v===undefined)vals[k]=v;
else if(typeof v==='object'&&!Array.isArray(v))vals[k]='Object{'+Object.keys(v).slice(0,8).join(',')+'}';
else if(Array.isArray(v))vals[k]='Array['+v.length+']';
else vals[k]=String(v).slice(0,60);
});
all.push(vals);
}
}
return JSON.stringify(all.slice(0,5),null,2);
});
const hostUrlShort=await pHost.evaluate(()=>location.href.split('/').filter(Boolean).pop()||'root');
console.log(`\n[${t*3}s] HOST:${hostUrlShort}`);

// Show relevant host states
try{
const hs=JSON.parse(hostDump);
for(const s of hs){
if(s.stage||s.question||s.questions||s.showQuestion)console.log('  HOST STATE:',JSON.stringify(s).slice(0,300));
}
}catch(e){}

// === BOT state ===
const botDump=await pBot.evaluate(()=>{
function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
for(var el of document.querySelectorAll('*')){
var k=Object.keys(el).filter(function(x){return x.indexOf('__react')===0});if(!k.length)continue;
var s=wF(el[k[0]],0);if(!s)continue;
if(s.stage||s.gold!==undefined||s.question||s.choices){
var d={stage:s.stage,gold:s.gold};
if(s.question)d.q=(s.question.question||s.question.text);
if(s.choices)d.cc=s.choices.map(function(c){return c.text||c.question||'?'});
return JSON.stringify(d);
}
}
return 'idle';
}).catch(()=>'err');
console.log('  BOT:',botDump);

// === TRY HOST CONTROLS ===
// Click "Next" / "Continue" / "Skip" / "Start" on host
const clicked=await pHost.evaluate(()=>{
var c=[];
document.querySelectorAll('button,[role=button],div[class*=button],span[class*=button],[class*=btn]').forEach(function(b){
var t=(b.textContent||'').trim().toLowerCase();
if(!t&&b.offsetHeight>0&&b.offsetHeight<100&&b.offsetWidth>0&&b.offsetWidth<200){
// Empty but sized element - might be an icon button
t='<icon>';
}
if(t==='next'||t==='continue'||t==='ok'||t==='done'||t==='skip'||t==='go'){
b.click();c.push(b.tagName+':'+t);
}
});
return c;
});
if(clicked.length>0)console.log('  -> clicked:',clicked);

if(hostUrlShort==='final'){console.log('Game ended!');break}
}

await b.close();
})().catch(e=>console.error('FATAL:',e.message));
