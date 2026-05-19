/**
 * Gold Quest v5 - 干净的观察脚本
 */
const {chromium}=require('playwright-extra');
const StealthPlugin=require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

// Auto-answer for bot pages
const AA = `(function(){
if(document.__aaSet)return;document.__aaSet=1;
var __lastQ='';
setInterval(function(){
try{
function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
for(var el of document.querySelectorAll('*')){
var k=Object.keys(el).filter(function(x){return x.indexOf('__react')===0});if(!k.length)continue;
var s=wF(el[k[0]],0);if(!s)continue;
if(!s.question&&!s.stage&&s.gold===undefined)continue;
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
console.log('[CHEST] '+JSON.stringify({gold:s.gold,gold2:s.gold2,choices:cs,keys:Object.keys(s).filter(function(k){return typeof s[k]!=='function'})}));
// Pick worst chest
var minI=0,minV=99999;
s.choices.forEach(function(c,i){var txt=c.text||c.question||'';var m=txt.match(/\\+?(\\d+)/);var v=m?parseInt(m[1]):0;if(v<minV){minV=v;minI=i}});
var ce=document.querySelectorAll('[class*="chest"],[class*="Chest"]');
if(ce.length>minI)ce[minI].click();
break;
}
break;
}
}catch(e){}
},800);
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
console.log('Login:',pLogin.url());
await pLogin.close();

// Host
const pHost=await ctx.newPage();
await pHost.goto('https://play.blooket.com/host?id=685d405f64022b0fbe8ac753',{waitUntil:'domcontentloaded',timeout:30000});
await pHost.waitForTimeout(4000);
console.log('Host page:',pHost.url());

const imgs=await pHost.$$('img');
for(const img of imgs){
const alt=await img.getAttribute('alt').catch(()=>'');
if(alt&&alt.toLowerCase().includes('gold')){await img.click();console.log('Gold clicked:',alt);break}
}
await pHost.waitForTimeout(2000);

try{await pHost.click('button:has-text("Host")',{timeout:5000});console.log('Host btn clicked')}catch(e){console.log('no Host btn')}
await pHost.waitForTimeout(5000);
try{await pHost.click('#hostNow',{timeout:3000});console.log('hostNow clicked')}catch(e){}
await pHost.waitForTimeout(5000);

console.log('URL after hosting:',pHost.url());

const PIN=await pHost.evaluate(()=>{
const el=document.querySelector('[class*="idNumber"]');
if(el)return el.textContent.trim();
const m=document.body.textContent.match(/\b(\d{6,7})\b/);
return m?m[1]:null;
});
console.log('PIN:',PIN);
if(!PIN){
const body=await pHost.evaluate(()=>document.body.textContent);
console.log('Body:',body.slice(0,500));
await b.close();return;
}

// Join bots
const bots=[];
for(const name of ['QA','BB']){
const pBot=await ctx.newPage();
await pBot.goto('https://play.blooket.com/play',{waitUntil:'domcontentloaded',timeout:30000});
await pBot.waitForTimeout(3000);
await pBot.fill('input[name="join-code"]',PIN);
await pBot.keyboard.press('Enter');
await pBot.waitForTimeout(6000);
try{
const nameEl=await pBot.$('input:not([type="hidden"]):not([name="join-code"])');
if(nameEl&&await nameEl.isVisible({timeout:3000}).catch(()=>false)){
await nameEl.fill(name);await pBot.keyboard.press('Enter');await pBot.waitForTimeout(3000);
}
}catch(e){}
console.log(name,'joined:',pBot.url());
bots.push(pBot);
}

// Observe + inject AA
console.log('\n=== MONITOR ===');
for(let t=0;t<25;t++){
await pHost.waitForTimeout(3000);

const hostInfo=await pHost.evaluate(()=>JSON.stringify({
url:location.href.split('/').pop(),
body:(document.body.textContent||'').trim().slice(0,200),
btns:Array.from(document.querySelectorAll('button,[role=button]')).filter(x=>x.offsetHeight>0).map(x=>({t:(x.textContent||'').trim().slice(0,30)})).slice(0,8)
})).catch(()=>'{}');
const h=JSON.parse(hostInfo);
console.log(`[${t*3}s] ${h.url} | ${(h.body||'').slice(0,80)} | btns: ${h.btns?.map(x=>x.t).join(',')||'none'}`);

// Inject AA + get bot state
for(const [i,pBot] of bots.entries()){
for(const f of pBot.frames()){try{await f.evaluate(AA)}catch(e){}}
try{await pBot.evaluate(AA)}catch(e){}
try{
const bs=await pBot.evaluate(()=>{function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}for(var el of document.querySelectorAll('*')){var k=Object.keys(el).filter(x=>x.indexOf('__react')===0);if(!k.length)continue;var s=wF(el[k[0]],0);if(!s)continue;if(!s.stage&&s.gold===undefined&&!s.question)continue;return s.stage+' g='+s.gold+' q='+(s.question?(s.question.question||s.question.text):'')+' ch='+(s.choices?s.choices.length:0)}return'idle'}).catch(()=>'err');
if(bs!=='idle')console.log('  Bot'+i,bs);
}catch(e){}
}

// Try clicking Start/Next on host
if(t===0||(h.body?.includes('Waiting')&&t<3)){
await pHost.evaluate(()=>{
document.querySelectorAll('button,[role=button]').forEach(b=>{
const t=(b.textContent||'').trim().toLowerCase();
if(t==='start'||t.includes('start')){b.click()}
});
});
console.log('  -> clicked Start');
}
if(t>3){
await pHost.evaluate(()=>{
document.querySelectorAll('button,[role=button]').forEach(b=>{
const t=(b.textContent||'').trim().toLowerCase();
if(t==='next'||t==='continue'){b.click()}
});
});
}

if(h.body?.includes('Final')){console.log('Game ended');break}
}

await b.close();
console.log('✅ Done');
})().catch(e=>console.error('FATAL:',e.message));
