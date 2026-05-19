/**
 * Quick debug: host page DOM analysis during Gold Quest
 */
const {chromium}=require('playwright-extra');
const StealthPlugin=require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

(async()=>{
const b=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const ctx=await b.newContext({viewport:{width:1400,height:1000}});
await ctx.addInitScript(()=>{
Object.defineProperty(navigator,'webdriver',{get:()=>false});
setInterval(()=>{document.querySelectorAll('button').forEach(b=>{if((b.textContent||'').includes('Accept'))b.click()})},500);
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

// Host Gold Quest
const pHost=await ctx.newPage();
pHost.on('console',msg=>console.log('[CONSOLE]',(msg.text()||'').slice(0,200)));
await pHost.goto('https://play.blooket.com/host?id=685d405f64022b0fbe8ac753',{waitUntil:'domcontentloaded',timeout:30000});
await pHost.waitForTimeout(4000);

// Click Gold Quest
const gameModes=await pHost.$$('img');
for(const img of gameModes){
const alt=await img.getAttribute('alt').catch(()=>'');
if(alt&&alt.toLowerCase().includes('gold')){await img.click();console.log('Clicked:',alt);break}
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

// Join 2 bots (no AA, just join)
for(const name of ['BotA','BotB']){
const pBot=await ctx.newPage();
await pBot.goto('https://play.blooket.com/play',{waitUntil:'domcontentloaded',timeout:30000});
await pBot.waitForTimeout(3000);
try{await pBot.fill('input[name="join-code"]',PIN);await pBot.keyboard.press('Enter')}catch(e){}
await pBot.waitForTimeout(6000);
try{await pBot.fill('input:not([type="hidden"]):not([name="join-code"])',name);await pBot.keyboard.press('Enter')}catch(e){}
await pBot.waitForTimeout(4000);
console.log(name,'joined:',pBot.url());
}

// Start
await pHost.evaluate(()=>{
document.querySelectorAll('button,[role=button]').forEach(b=>{
if((b.textContent||'').trim().toLowerCase().includes('start'))b.click()
});
});
await pHost.waitForTimeout(2000);

// Skip intro
await pHost.evaluate(()=>{
document.querySelectorAll('button,[role=button]').forEach(b=>{
if((b.textContent||'').trim().toLowerCase().includes('skip'))b.click()
});
});
await pHost.waitForTimeout(3000);

// ====== DUMP HOST PAGE EVERY 3s ======
for(let t=0;t<20;t++){
await pHost.waitForTimeout(3000);

// Take screenshot
await pHost.screenshot({path:'/tmp/gq-host-'+t+'.png'});

// Dump all visible text + button texts + classes
const hostDump=await pHost.evaluate(()=>{
// All buttons
const btns=document.querySelectorAll('button, [role=button], div[class*="button"]');
const btnInfo=[];
btns.forEach(b=>{
if(b.offsetHeight>0){
btnInfo.push({
text:(b.textContent||'').trim().slice(0,50),
tag:b.tagName,
className:(b.className||'').slice(0,100),
id:b.id||'',
rect:b.getBoundingClientRect()
});
}
});

// Full body text for context
const bodyText=(document.body.textContent||'').trim().slice(0,500);

// Stage-specific info
const stageIndicator=document.querySelector('[class*="stage"],[class*="phase"]');
const stageText=stageIndicator?(stageIndicator.textContent||'').trim():'none';

return JSON.stringify({
stage:stageText,
bodyText:bodyText,
visibleButtons:btnInfo,
url:location.href
},null,2);
});

console.log(`\n=== t=${t*3}s HOST STATE ===`);
console.log(hostDump);

// Try clicking ALL clickable things on host
await pHost.evaluate(()=>{
document.querySelectorAll('button, [role=button], div[class*="button"], div[class*="btn"], span[class*="button"], span[class*="btn"], a').forEach(b=>{
if(b.offsetHeight>0&&b.offsetHeight<200){
const t=(b.textContent||'').trim().toLowerCase().slice(0,20);
console.log('[TRYCKICK] '+b.tagName+':'+b.className+':"'+t+'"');
// Click everything!
b.click();
}
});
});

// Try specific Blooket host buttons
await pHost.evaluate(()=>{
// Try finding buttons inside game container
document.querySelectorAll('[class*="game"], [class*="host"], [class*="Host"], [class*="main"]').forEach(outer=>{
const inner=outer.querySelectorAll('button, [role=button]');
inner.forEach(b=>{
if(b.offsetHeight>0){
console.log('[HOST-CONTAINER] '+b.tagName+':"'+b.textContent+'"');
b.click();
}
});
});
});
}

await b.close();
})().catch(e=>console.error('FATAL:',e.message));
