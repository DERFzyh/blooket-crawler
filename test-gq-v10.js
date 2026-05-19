/**
 * Gold Quest v10 - 健壮主持 + fallback
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
if(qt&&s.question.correctAnswers&&qt!==__lastQ){
var ca=Array.isArray(s.question.correctAnswers)?s.question.correctAnswers:[s.question.correctAnswers];
document.querySelectorAll('[class*="answerContainer"]').forEach(function(c){
var t=(c.textContent||'').trim();
if(ca.some(function(a){return(a||'').toString().trim()===t})&&c.offsetHeight>0){c.click();__lastQ=qt;}
});
}
if(s.stage==='prize'&&s.choices&&s.choices.length>=2){
console.log('[CHEST] '+JSON.stringify({gold:s.gold,choices:s.choices.map(function(c){return c.text||c.question||'?'}),keys:Object.keys(s).filter(function(k){return typeof s[k]!=='function'})}));
var minI=0,minV=99999;s.choices.forEach(function(c,i){var txt=c.text||c.question||'';var m=txt.match(/\\+?(\\d+)/);var v=m?parseInt(m[1]):0;if(v<minV){minV=v;minI=i}});
var ce=document.querySelectorAll('[class*="chest"],[class*="Chest"]');if(ce.length>minI)ce[minI].click();
setTimeout(function(){document.querySelectorAll('button,[role=button]').forEach(function(b){var t=(b.textContent||'').trim().toLowerCase();if(t==='next'||t==='continue'||t==='ok')b.click();})},2000);
break;
}
if(s.stage==='feedback'){document.querySelectorAll('button,[role=button]').forEach(function(b){var t=(b.textContent||'').trim().toLowerCase();if(t==='next'||t==='continue'||t==='ok'||t==='done')b.click();});}
break;
}}catch(e){}},600);
})()`;

async function hostGame(ctx) {
const pHost=await ctx.newPage();
await pHost.goto('https://play.blooket.com/host?id=685d405f64022b0fbe8ac753',{waitUntil:'domcontentloaded',timeout:30000});
await pHost.waitForTimeout(5000);

// Click Gold Quest
const imgs=await pHost.$$('img');
let clicked=false;
for(const img of imgs){
const alt=await img.getAttribute('alt').catch(()=>'');
if(alt&&alt.toLowerCase().includes('gold')){await img.click();clicked=true;console.log('  Selected:',alt);break}
}
if(!clicked){console.log('  Gold not found, trying buttons');await pHost.evaluate(()=>{document.querySelectorAll('button,[role=button]').forEach(b=>{if((b.textContent||'').toLowerCase().includes('gold'))b.click()})});}
await pHost.waitForTimeout(2000);

// Click Host button
let hostClicked=false;
const hostBtns=await pHost.$$('button');
for(const btn of hostBtns){
const t=(await btn.textContent()||'').trim();
if(t==='Host'||t==='Host Game'){
await btn.click();hostClicked=true;console.log('  Host clicked');break;
}
}
if(!hostClicked){console.log('  Host button not found');await pHost.screenshot({path:'/tmp/gq-host-err.png'});return null;}
await pHost.waitForTimeout(5000);

// Check if on hostNow page
try{const hhn=await pHost.$('#hostNow');if(hhn){await pHost.click('#hostNow');console.log('  hostNow clicked');await pHost.waitForTimeout(5000);}}catch(e){}

console.log('  URL:',pHost.url());

// Get PIN
const PIN=await pHost.evaluate(()=>{
const el=document.querySelector('[class*="idNumber"]');
if(el)return el.textContent.trim();
// Try to find any 6-7 digit number in text
const m=document.body.textContent.match(/\b(\d{6,7})\b/);
return m?m[1]:null;
});

if(!PIN){
console.log('  No PIN! Page body:',(await pHost.evaluate(()=>document.body.textContent)).slice(0,300));
await pHost.screenshot({path:'/tmp/gq-no-pin2.png'});
await pHost.close();
return null;
}

console.log('  PIN:',PIN);
return {pHost,PIN};
}

async function joinBot(ctx, PIN, name) {
const pBot=await ctx.newPage();
pBot.on('console',msg=>{const t=msg.text();if(t.includes('[BOT]')||t.includes('[CHEST]'))console.log('    '+name+':',t)});
await pBot.goto('https://play.blooket.com/play',{waitUntil:'domcontentloaded',timeout:30000});
await pBot.waitForTimeout(3000);
await pBot.fill('input[name="join-code"]',PIN);
await pBot.keyboard.press('Enter');
await pBot.waitForTimeout(8000);
try{
const nameEl=await pBot.$('input:not([type="hidden"]):not([name="join-code"])');
if(nameEl&&await nameEl.isVisible({timeout:5000}).catch(()=>false)){
await nameEl.fill(name);await pBot.keyboard.press('Enter');await pBot.waitForTimeout(4000);
}
}catch(e){}
console.log('  '+name+' joined:',pBot.url());
return pBot;
}

(async()=>{
const b=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const ctx=await b.newContext({viewport:{width:1400,height:1000}});
await ctx.addInitScript(()=>{Object.defineProperty(navigator,'webdriver',{get:()=>false})});

// Login
console.log('=== LOGIN ===');
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
console.log('  Login:',pLogin.url().includes('dashboard')?'OK':'FAILED');
await pLogin.close();

// Host
console.log('\n=== HOST ===');
const hostResult=await hostGame(ctx);
if(!hostResult){console.log('Host failed');await b.close();return;}
const {pHost,PIN}=hostResult;

// Join 2 bots
console.log('\n=== JOIN BOTS ===');
const bots=[];
bots.push(await joinBot(ctx, PIN, 'BotA'));
bots.push(await joinBot(ctx, PIN, 'BotB'));

// Start game
console.log('\n=== START ===');
await pHost.waitForTimeout(3000);
await pHost.evaluate(()=>{
document.querySelectorAll('button,[role=button]').forEach(b=>{
const t=(b.textContent||'').trim().toLowerCase();
if(t==='start'||t.includes('start game'))b.click();
});
});

// Wait for instructions to pass
await pHost.waitForTimeout(20000);
console.log('  Host URL:',pHost.url());

// Inject AA
for(const pBot of bots){
for(const f of pBot.frames()){try{await f.evaluate(AA)}catch(e){}}
try{await pBot.evaluate(AA)}catch(e){}
}

// Monitor
console.log('\n=== MONITOR (showing buttons on bot pages) ===');
let prevStates=['',''];
for(let t=0;t<40;t++){
await pHost.waitForTimeout(3000);

for(const [i,pBot] of bots.entries()){
try{
const d=JSON.parse(await pBot.evaluate(()=>{
function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
var gs='idle';
for(var el of document.querySelectorAll('*')){var k=Object.keys(el).filter(function(x){return x.indexOf('__react')===0});if(!k.length)continue;var s=wF(el[k[0]],0);if(!s)continue;if(!s.stage&&s.gold===undefined&&!s.question&&!s.choices)continue;gs=JSON.stringify({stage:s.stage,gold:s.gold,q:s.question?(s.question.question||s.question.text):null});break}
var btns=[];document.querySelectorAll('button,[role=button]').forEach(function(b){if(b.offsetHeight>0)btns.push((b.textContent||'').trim().slice(0,20))});
return JSON.stringify({state:gs,btns:btns.filter(function(x){return x!==''}).slice(0,5)});
}).catch(()=>'{"state":"err"}'));
const s=d.state;
if(s!==prevStates[i]){
console.log(`  [B${i}]`,s,'| btns:',d.btns.join(','));
prevStates[i]=s;
}
}catch(e){}
}

const hostUrl=await pHost.evaluate(()=>location.href.split('/').pop()).catch(()=>'?');
if(hostUrl.includes('final')){console.log('  Game ended!');break}
}

// Final
for(const [i,pBot] of bots.entries()){
const f=await pBot.evaluate(()=>{
function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
for(var el of document.querySelectorAll('*')){var k=Object.keys(el).filter(function(x){return x.indexOf('__react')===0});if(!k.length)continue;var s=wF(el[k[0]],0);if(!s)continue;var keys=Object.keys(s).filter(function(k){return typeof s[k]!=='function'&&k[0]!=='_'&&k!=='setState'});if(keys.length>3)return JSON.stringify({stage:s.stage,gold:s.gold,question:s.question?(s.question.question||s.question.text):null,choices:s.choices?s.choices.map(function(c){return c.text||c.question||'?'}):null,keys:keys});}return'none';
}).catch(()=>'?');
console.log('Bot'+i+' final:',f?f.slice(0,500):'?');
}

await b.close();
})().catch(e=>console.error('FATAL:',e.message));
