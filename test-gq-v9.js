/**
 * Gold Quest v9 - 2 Bots + 深入分析 feedback 卡住的原因
 */
const {chromium}=require('playwright-extra');
const StealthPlugin=require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

const AA = `(function(){
if(window.__aaSet)return;window.__aaSet=1;
var __lastQ='';
setInterval(function(){
try{
function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
for(var el of document.querySelectorAll('*')){
var k=Object.keys(el).filter(function(x){return x.indexOf('__react')===0});if(!k.length)continue;
var s=wF(el[k[0]],0);if(!s)continue;
if(!s.question&&!s.stage&&s.gold===undefined&&!s.choices)continue;
var qt=s.question&&(s.question.question||s.question.text);

// ANSWER
if(qt&&s.question.correctAnswers&&qt!==__lastQ){
var ca=Array.isArray(s.question.correctAnswers)?s.question.correctAnswers:[s.question.correctAnswers];
document.querySelectorAll('[class*="answerContainer"]').forEach(function(c){
var t=(c.textContent||'').trim();
if(ca.some(function(a){return(a||'').toString().trim()===t})&&c.offsetHeight>0){c.click();__lastQ=qt;console.log('[BOT] answered:'+t)}
});
}

// CHEST - pick worst
if(s.stage==='prize'&&s.choices&&s.choices.length>=2){
var cs=s.choices.map(function(c){return c.text||c.question||'?'});
console.log('[CHEST] '+JSON.stringify({gold:s.gold,choices:cs,keys:Object.keys(s).filter(function(k){return typeof s[k]!=='function'})}));
var minI=0,minV=99999;
s.choices.forEach(function(c,i){var txt=c.text||c.question||'';var m=txt.match(/\\+?(\\d+)/);var v=m?parseInt(m[1]):0;if(v<minV){minV=v;minI=i}});
var ce=document.querySelectorAll('[class*="chest"],[class*="Chest"]');
if(ce.length>minI)ce[minI].click();
// After picking chest, click any "next/continue" button
setTimeout(function(){
document.querySelectorAll('button,[role=button]').forEach(function(b){
var t=(b.textContent||'').trim().toLowerCase();
if(t==='next'||t==='continue'||t==='ok')b.click();
});
},2000);
break;
}

// Click "Next"/"Continue"/"OK" to advance from feedback
if(s.stage==='feedback'){
document.querySelectorAll('button,[role=button]').forEach(function(b){
var t=(b.textContent||'').trim().toLowerCase();
if(t==='next'||t==='continue'||t==='ok'||t==='done')b.click();
});
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
await pLogin.evaluate(()=>{document.querySelectorAll('button').forEach(b=>{if((b.textContent||'').includes('Accept'))b.click()})});
await pLogin.waitForTimeout(2000);
await pLogin.fill('input[name=username]','fred11zyh@outlook.com');
await pLogin.fill('input[name=password]','ZYH11fred@blooket');
await pLogin.waitForTimeout(1500);
await pLogin.evaluate(()=>{document.querySelectorAll('button').forEach(b=>{if((b.textContent||'').includes("Let's go"))b.click()})});
await pLogin.waitForTimeout(8000);
console.log('Login:',pLogin.url());
await pLogin.close();

// Host
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

// Join 2 bots
const bots=[];
for(const name of ['AA','BB']){
const pBot=await ctx.newPage();
pBot.on('console',msg=>{const t=msg.text();if(t.includes('[BOT]')||t.includes('[CHEST]'))console.log(name,':',t)});
await pBot.goto('https://play.blooket.com/play',{waitUntil:'domcontentloaded',timeout:30000});
await pBot.waitForTimeout(3000);
await pBot.fill('input[name="join-code"]',PIN);await pBot.keyboard.press('Enter');
await pBot.waitForTimeout(6000);
try{
const nameEl=await pBot.$('input:not([type="hidden"]):not([name="join-code"])');
if(nameEl&&await nameEl.isVisible({timeout:3000}).catch(()=>false)){await nameEl.fill(name);await pBot.keyboard.press('Enter');}
await pBot.waitForTimeout(3000);
}catch(e){}
console.log(name,'joined:',pBot.url());
bots.push(pBot);
}

// Start
await pHost.waitForTimeout(3000);
await pHost.evaluate(()=>{
document.querySelectorAll('button,[role=button]').forEach(b=>{
if((b.textContent||'').trim().toLowerCase().includes('start'))b.click();
});
});
// Wait for instructions
console.log('Waiting for game to start...');
for(let i=0;i<10;i++){
await pHost.waitForTimeout(3000);
const u=await pHost.evaluate(()=>location.href.split('/').pop());
process.stdout.write(u[0]||'.');
if(u==='gold')break;
}
console.log('\nGame started, host:',pHost.url());

// Inject AA into both bots
for(const pBot of bots){
for(const f of pBot.frames()){try{await f.evaluate(AA)}catch(e){}}
try{await pBot.evaluate(AA)}catch(e){}
}

// Monitor with detailed bot page analysis
for(let t=0;t<40;t++){
await pHost.waitForTimeout(3000);

// Bot states + find ALL buttons on bot pages
for(const [i,pBot] of bots.entries()){
try{
const dump=await pBot.evaluate(()=>{
// Get game state
function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
var gameInfo='idle';
for(var el of document.querySelectorAll('*')){
var k=Object.keys(el).filter(function(x){return x.indexOf('__react')===0});if(!k.length)continue;
var s=wF(el[k[0]],0);if(!s)continue;
if(s.stage||s.gold!==undefined||s.question||s.choices){
gameInfo=JSON.stringify({stage:s.stage,gold:s.gold,q:s.question?(s.question.question||s.question.text):null,ch:(s.choices||[]).length});
break;
}
}
// Get ALL visible buttons on page (important)
var btns=[];
document.querySelectorAll('button,[role=button],div[class*=button],span[class*=button],div[class*=btn],span[class*=btn]').forEach(function(b){
if(b.offsetHeight>0){
var t=(b.textContent||'').trim();
btns.push({t:t.slice(0,30),tag:b.tagName,h:b.offsetHeight,w:b.offsetWidth,x:b.getBoundingClientRect().x,y:b.getBoundingClientRect().y});
}
});
return JSON.stringify({state:gameInfo,url:location.href.split('/').pop(),btns:btns.slice(0,15)});
}).catch(()=>'{"state":"err"}');
const d=JSON.parse(dump);
const btns=Array.from(new Set(d.btns.map(b=>b.t))).join('|');
process.stdout.write(`[B${i}:${d.state.slice(0,40)}`);
if(d.btns.length>0)process.stdout.write(` btns:${btns}`);
process.stdout.write('] ');
}catch(e){process.stdout.write('[?]')}
}

// Host URL
const hostUrl=await pHost.evaluate(()=>location.href.split('/').pop());
console.log(`\n[${t*3}s] HOST:${hostUrl}`);
if(hostUrl.includes('final')){console.log('Game ended');break}
}

// Final summary
console.log('\n=== FINAL ===');
for(const [i,pBot] of bots.entries()){
const st=await pBot.evaluate(()=>{
function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
for(var el of document.querySelectorAll('*')){
var k=Object.keys(el).filter(function(x){return x.indexOf('__react')===0});if(!k.length)continue;
var s=wF(el[k[0]],0);if(!s)continue;
if(!s.stage&&s.gold===undefined&&!s.question)continue;
return JSON.stringify({stage:s.stage,gold:s.gold,q:s.question?(s.question.question||s.question.text):'?',keys:Object.keys(s).filter(function(k){return typeof s[k]!=='function'&&k[0]!=='_'})});
}
return 'none';
}).catch(()=>'err');
console.log('Bot'+i+':',st);
}

await b.close();
})().catch(e=>console.error('FATAL:',e.message));
