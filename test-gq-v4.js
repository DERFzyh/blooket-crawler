/**
 * Gold Quest - 纯观察 v2, 先确认 hosting 成功再继续
 */
const {chromium}=require('playwright-extra');
const StealthPlugin=require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

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

// Host Gold Quest
const pHost=await ctx.newPage();
await pHost.goto('https://play.blooket.com/host?id=685d405f64022b0fbe8ac753',{waitUntil:'domcontentloaded',timeout:30000});
await pHost.waitForTimeout(4000);
console.log('\nHost page:',pHost.url());

// Dump all images and buttons on game selector page
const pageInfo=await pHost.evaluate(()=>{
const imgs=Array.from(document.querySelectorAll('img')).map(i=>({alt:i.alt,src:i.src.slice(-40)}));
const btns=Array.from(document.querySelectorAll('button,[role=button]')).map(b=>({t:(b.textContent||'').trim()}));
return JSON.stringify({imgs,btns});
});
console.log('Page:',pageInfo);

// Click Gold Quest
for(const img of await pHost.$$('img')){
const alt=await img.getAttribute('alt').catch(()=>'');
if(alt&&alt.toLowerCase().includes('gold')){
await img.click();
console.log('Clicked:',alt);
break;
}
}
await pHost.waitForTimeout(2000);

// Click Host
const hostBtns=await pHost.$$('button:has-text("Host")');
console.log('Host buttons found:',hostBtns.length);
if(hostBtns.length>0){
try{await hostBtns[0].click({timeout:5000});console.log('Host clicked')}catch(e){console.log('Host click err:',e.message)}
}
await pHost.waitForTimeout(5000);

console.log('After Host:',pHost.url());

// Try hostNow
try{
await pHost.click('#hostNow',{timeout:3000});
console.log('hostNow clicked');
await pHost.waitForTimeout(5000);
}catch(e){console.log('hostNow not found:',e.message)}

console.log('After hostNow:',pHost.url());

// Get PIN - try harder
let PIN=await pHost.evaluate(()=>{
// Look for specific ID number elements
const selectors=[
'._idNumberText_1gorp_59',
'[class*="idNumberText"]',
'[class*="idNumber"]',
'[class*="IdNumber"]',
'[class*="gamePin"]',
'[class*="GamePin"]',
'[class*="game-pin"]',
'[class*="gameCode"]',
'[class*="GameCode"]',
];
for(const sel of selectors){
const el=document.querySelector(sel);
if(el)return el.textContent.trim();
}
// Body text regex
const m=document.body.textContent.match(/\\b(\\d{6,7})\\b/);
return m?m[1]:null;
});
console.log('PIN:',PIN,'| URL:',pHost.url());

if(!PIN){
await pHost.screenshot({path:'/tmp/gq-no-pin.png'});
console.log('No PIN, screenshot saved');
// Dump full body text
const body=await pHost.evaluate(()=>document.body.textContent);
console.log('Body text:',body.slice(0,500));
await b.close();
return;
}

// Join 2 bots
const bots=[];
for(const name of ['QA','BB']){
const pBot=await ctx.newPage();
try{
await pBot.goto('https://play.blooket.com/play',{waitUntil:'domcontentloaded',timeout:30000});
await pBot.waitForTimeout(3000);
await pBot.fill('input[name="join-code"]',PIN);
await pBot.keyboard.press('Enter');
await pBot.waitForTimeout(6000);
const nameEl=await pBot.$('input:not([type="hidden"]):not([name="join-code"])');
if(nameEl&&await nameEl.isVisible({timeout:3000}).catch(()=>false)){
await nameEl.fill(name);
await pBot.keyboard.press('Enter');
}
await pBot.waitForTimeout(4000);
console.log(name,'joined:',pBot.url());
bots.push(pBot);
}catch(e){console.log(name,'error:',e.message)}
}

// Now observe step by step
console.log('\n=== STEP 0: Lobby ===');
await pHost.waitForTimeout(3000);
const dump0=await pHost.evaluate(()=>JSON.stringify({
url:location.href,
body:(document.body.textContent||'').trim().slice(0,400),
allBtns:Array.from(document.querySelectorAll('button,[role=button],div[class*=button],span[class*=button]')).filter(x=>x.offsetHeight>0).map(x=>({t:(x.textContent||'').trim().slice(0,40)}))
}));
console.log(JSON.parse(dump0));

// Step 1: Find and click "Start"
console.log('\n=== STEP 1: Click Start ===');
await pHost.evaluate(()=>{
const all=document.querySelectorAll('button,[role=button],div[class*=button],span[class*=button]');
all.forEach(x=>{
const t=(x.textContent||'').trim().toLowerCase();
if(t==='start'||t.includes('start')||t===('start game')){x.click();console.log('[CLICK] Start:'+x.tagName+':'+(x.className||'').slice(0,40))}
});
});
await pHost.waitForTimeout(4000);
const dump1=await pHost.evaluate(()=>JSON.stringify({
url:location.href,
body:(document.body.textContent||'').trim().slice(0,400),
allBtns:Array.from(document.querySelectorAll('button,[role=button],div[class*=button],span[class*=button]')).filter(x=>x.offsetHeight>0).map(x=>({t:(x.textContent||'').trim().slice(0,40)}))
}));
console.log(JSON.parse(dump1));

// Monitor for changes
console.log('\n=== MONITORING ===');
for(let t=0;t<20;t++){
await pHost.waitForTimeout(3000);

const info=await pHost.evaluate(()=>JSON.stringify({
ts:Date.now(),
url:location.href.split('/').pop(),
body:(document.body.textContent||'').trim().slice(0,200),
btns:Array.from(document.querySelectorAll('button,[role=button]')).filter(x=>x.offsetHeight>0).map(x=>({t:(x.textContent||'').trim().slice(0,30)})).slice(0,8)
}));
const d=JSON.parse(info);
const shortUrl=d.url?.split('/').pop()||'?';
console.log(`[${t*3}s] ${shortUrl} | ${d.body.slice(0,80)}`);

// Inject AA into bots
for(const [i,pb]of bots.entries()){
try{
const s=await pb.evaluate(()=>{
// One-line AA inject
if(document.__aaSet)return;
document.__aaSet=1;
var __aaI=setInterval(()=>{try{function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}for(var el of document.querySelectorAll('*')){var k=Object.keys(el).filter(x=>x.indexOf('__react')===0);if(!k.length)continue;var s=wF(el[k[0]],0);if(!s)continue;if(!s.question&&!s.stage&&s.gold===undefined)continue;var qt=s.question&&(s.question.question||s.question.text);if(qt&&s.question.correctAnswers&&qt!==document.__aaLastQ){var ca=Array.isArray(s.question.correctAnswers)?s.question.correctAnswers:[s.question.correctAnswers];document.querySelectorAll('[class*="answerContainer"]').forEach(c=>{var t=(c.textContent||'').trim();if(ca.some(a=>(a||'').toString().trim()===t)&&c.offsetHeight>0){c.click();document.__aaLastQ=qt}})}if(s.stage==='prize'&&s.choices&&s.choices.length>=2){console.log('[CHEST]'+JSON.stringify({g:s.gold,cc:s.choices.map(c=>c.text||c.question||'?'))}));var minI=0,minV=99999;s.choices.forEach((c,i)=>{var txt=c.text||c.question||'';var m=txt.match(/\\+?(\\d+)/);var v=m?parseInt(m[1]):0;if(v<minV){minV=v;minI=i}});var ce=document.querySelectorAll('[class*="chest"],[class*="Chest"]');if(ce.length>minI)ce[minI].click();break}break}}catch(e){}},800);
return 'ok';
}).catch(()=>'err');
}catch(e){}
// Show bot state 
try{
const bs=await pb.evaluate(()=>{function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}for(var el of document.querySelectorAll('*')){var k=Object.keys(el).filter(x=>x.indexOf('__react')===0);if(!k.length)continue;var s=wF(el[k[0]],0);if(!s)continue;if(!s.stage&&s.gold===undefined&&!s.question)continue;return s.stage+' g='+s.gold+' q='+(s.question?(s.question.question||s.question.text):'')+' choices='+(s.choices?s.choices.length:0)}return 'idle'}).catch(()=>'err');
if(bs!=='idle')console.log('  Bot'+i+':',bs);
}catch(e){}
}

if(d.body.includes('Final')){console.log('Game ended!');break}
}

await b.close();
console.log('\n✅ Done');
})().catch(e=>console.error('FATAL:',e.message));
