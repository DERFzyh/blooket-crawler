/**
 * Gold Quest - 纯观察，不自动点击
 * 截图每一步 + 详细状态 dump
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
await pLogin.close();

// Host
const pHost=await ctx.newPage();
await pHost.goto('https://play.blooket.com/host?id=685d405f64022b0fbe8ac753',{waitUntil:'domcontentloaded',timeout:30000});
await pHost.waitForTimeout(4000);
for(const img of await pHost.$$('img')){const alt=await img.getAttribute('alt').catch(()=>'');if(alt?.toLowerCase().includes('gold')){await img.click();break}}
await pHost.waitForTimeout(2000);
await pHost.click('button:has-text("Host")',{timeout:5000}).catch(()=>{});
await pHost.waitForTimeout(5000);
try{await pHost.click('#hostNow',{timeout:3000})}catch(e){}
await pHost.waitForTimeout(5000);
const PIN=await pHost.evaluate(()=>{const el=document.querySelector('[class*="idNumber"]');if(el)return el.textContent.trim();const m=document.body.textContent.match(/\b(\d{6,7})\b/);return m?m[1]:null});
console.log('PIN:',PIN);

// Join 2 bots
const bots=[];
for(const name of ['QA','BB']){
const pBot=await ctx.newPage();
await pBot.goto('https://play.blooket.com/play',{waitUntil:'domcontentloaded',timeout:30000});
await pBot.waitForTimeout(3000);
await pBot.fill('input[name="join-code"]',PIN);await pBot.keyboard.press('Enter');
await pBot.waitForTimeout(6000);
const nameEl=await pBot.$('input:not([type="hidden"]):not([name="join-code"])');
if(nameEl&&await nameEl.isVisible({timeout:3000}).catch(()=>false)){await nameEl.fill(name);await pBot.keyboard.press('Enter')}
await pBot.waitForTimeout(4000);
console.log(name,'joined:',pBot.url());
bots.push(pBot);
}

// Dump function
async function dump(){
const s=await pHost.screenshot({path:'/tmp/gq-host-'+Date.now()+'.png'});
const info=await pHost.evaluate(()=>{
const btns=Array.from(document.querySelectorAll('button,[role=button],div[class*=button],span[class*=button]')).filter(x=>x.offsetHeight>0).map(x=>({t:(x.textContent||'').trim().slice(0,40),h:x.offsetHeight,w:x.offsetWidth})).slice(0,15);
return{url:location.href.split('/').pop(),body:(document.body.textContent||'').trim().slice(0,400),btns};
}).catch(()=>({url:'err'}));
console.log('\n[HOST]',info.url);
console.log(' Body:',info.body.slice(0,200));
console.log(' Btns:',JSON.stringify(info.btns));
// Bot states
for(const[i,pb]of bots.entries()){
try{
const bs=await pb.evaluate(()=>{function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}for(var el of document.querySelectorAll('*')){var k=Object.keys(el).filter(x=>x.indexOf('__react')===0);if(!k.length)continue;var s=wF(el[k[0]],0);if(!s)continue;if(s.stage||s.question||s.gold!==undefined)return JSON.stringify({stage:s.stage,q:s.question?(s.question.question||s.question.text):null,g:s.gold,c:s.choices?s.choices.length:0});}return'null'}).catch(()=>'err');
console.log('[Bot'+i+']',bs);
}catch(e){console.log('[Bot'+i+'] err:',e.message)}
}
return info;
}

// Step 1: Lobby
await pHost.waitForTimeout(3000);
await dump();

// Step 2: Click Start
console.log('\n=== CLICK START ===');
await pHost.evaluate(()=>{document.querySelectorAll('button,[role=button]').forEach(b=>{if((b.textContent||'').trim().toLowerCase().includes('start'))b.click()})});
await pHost.waitForTimeout(4000);
await dump();

// Step 3: Wait (game should auto-start)
for(let t=0;t<15;t++){
await pHost.waitForTimeout(3000);
const info=await dump();
if(info.body?.includes('Final Standings')){console.log('🏁 Game ended!');break}
if(info.body?.includes('Waiting')){console.log('⏳ Still waiting...')}
// Inject AA into bots (for questions)
for(const pb of bots){
for(const f of pb.frames()){try{await f.evaluate(`(function(){if(document.__aaSet)return;document.__aaSet=1;var __aaI=setInterval(()=>{try{function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}for(var el of document.querySelectorAll('*')){var k=Object.keys(el).filter(x=>x.indexOf('__react')===0);if(!k.length)continue;var s=wF(el[k[0]],0);if(!s)continue;if(!s.question&&!s.stage&&s.gold===undefined)continue;var qt=s.question&&(s.question.question||s.question.text);if(qt&&s.question.correctAnswers&&qt!==document.__aaLastQ){var ca=Array.isArray(s.question.correctAnswers)?s.question.correctAnswers:[s.question.correctAnswers];document.querySelectorAll('[class*="answerContainer"]').forEach(c=>{var t=(c.textContent||'').trim();if(ca.some(a=>(a||'').toString().trim()===t)&&c.offsetHeight>0){c.click();document.__aaLastQ=qt;console.log('[AA] answered:'+t)}})}if(s.stage==='prize'&&s.choices&&s.choices.length>=2){console.log('[AA] CHEST state:'+JSON.stringify({g:s.gold,cc:s.choices.map(c=>({t:c.text||c.question,k:Object.keys(c).filter(k=>typeof c[k]!=='function')}))}));var minI=0,minV=99999;s.choices.forEach((c,i)=>{var txt=c.text||c.question||'';var m=txt.match(/\\+?(\\d+)/);var v=m?parseInt(m[1]):0;if(v<minV){minV=v;minI=i}});var ce=document.querySelectorAll('[class*="chest"],[class*="Chest"]');if(ce.length>minI)ce[minI].click();break}break}}catch(e){}},800)})()`)}catch(e){}}
try{await pb.evaluate(`if(!document.__aaSet){document.__aaSet=1;var __aaI=setInterval(()=>{try{function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}for(var el of document.querySelectorAll('*')){var k=Object.keys(el).filter(x=>x.indexOf('__react')===0);if(!k.length)continue;var s=wF(el[k[0]],0);if(!s)continue;if(!s.question&&!s.stage&&s.gold===undefined)continue;var qt=s.question&&(s.question.question||s.question.text);if(qt&&s.question.correctAnswers&&qt!==document.__aaLastQ){var ca=Array.isArray(s.question.correctAnswers)?s.question.correctAnswers:[s.question.correctAnswers];document.querySelectorAll('[class*="answerContainer"]').forEach(c=>{var t=(c.textContent||'').trim();if(ca.some(a=>(a||'').toString().trim()===t)&&c.offsetHeight>0){c.click();document.__aaLastQ=qt;console.log('[AA] answered:'+t)}})}if(s.stage==='prize'&&s.choices&&s.choices.length>=2){console.log('[AA] CHEST state:'+JSON.stringify({g:s.gold,cc:s.choices.map(c=>({t:c.text||c.question,k:Object.keys(c).filter(k=>typeof c[k]!=='function')}))}));var minI=0,minV=99999;s.choices.forEach((c,i)=>{var txt=c.text||c.question||'';var m=txt.match(/\\+?(\\d+)/);var v=m?parseInt(m[1]):0;if(v<minV){minV=v;minI=i}});var ce=document.querySelectorAll('[class*="chest"],[class*="Chest"]');if(ce.length>minI)ce[minI].click();break}break}}catch(e){}},800)}`).catch(()=>{})}catch(e){}
}
}

await b.close();
console.log('\n✅ Done');
})().catch(e=>console.error('FATAL:',e.message));
