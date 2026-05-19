/**
 * Gold Quest 逐帧调试 - 截图分析每一步
 */
const {chromium}=require('playwright-extra');
const StealthPlugin=require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

(async()=>{
const b=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const ctx=await b.newContext({viewport:{width:1400,height:1000}});
await ctx.addInitScript(()=>{
Object.defineProperty(navigator,'webdriver',{get:()=>false});
// Auto-accept cookies
setInterval(()=>{document.querySelectorAll('button, [role=button]').forEach(b=>{if((b.textContent||'').includes('Accept'))b.click()})},3000);
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
await pHost.goto('https://play.blooket.com/host?id=685d405f64022b0fbe8ac753',{waitUntil:'domcontentloaded',timeout:30000});
await pHost.waitForTimeout(4000);
for(const img of await pHost.$$('img')){
const alt=await img.getAttribute('alt').catch(()=>'');
if(alt&&alt.toLowerCase().includes('gold')){await img.click();console.log('Mode:',alt);break}
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

// Join 2 bots (WITH auto-answer)
const bots=[];
for(const name of ['QA','BB']){
const pBot=await ctx.newPage();
await pBot.goto('https://play.blooket.com/play',{waitUntil:'domcontentloaded',timeout:30000});
await pBot.waitForTimeout(3000);
await pBot.fill('input[name="join-code"]',PIN);await pBot.keyboard.press('Enter');
await pBot.waitForTimeout(6000);
const nameEl=await pBot.$('input:not([type="hidden"]):not([name="join-code"])');
if(nameEl&&await nameEl.isVisible({timeout:3000}).catch(()=>false)){
await nameEl.fill(name);await pBot.keyboard.press('Enter');
}
await pBot.waitForTimeout(4000);
console.log(name,'joined:',pBot.url());
bots.push(pBot);
}

await pHost.waitForTimeout(3000);

// ====== STEP-BY-STEP WITH SCREENSHOTS ======
let step=0;
async function snap(label){
step++;
await pHost.screenshot({path:'/tmp/gq-'+String(step).padStart(2,'0')+'-'+label+'.png'});
console.log('📸 Step '+step+': '+label);
// Also dump page info
const info=await pHost.evaluate(()=>{
const btns=[];
document.querySelectorAll('button, [role=button]').forEach(b=>{
if(b.offsetHeight>0)btns.push({t:(b.textContent||'').trim().slice(0,30),w:b.offsetWidth,h:b.offsetHeight});
});
return JSON.stringify({url:location.href.split('/').pop(),body:(document.body.textContent||'').trim().slice(0,300),btns:btns.slice(0,10)});
}).catch(()=>'?');
console.log('   ',info);
}

await snap('lobby-ready');

// Find and click "Start" button on lobby page
console.log('\n▶️  Looking for Start button...');
const startBtns=await pHost.$$('button, [role=button]');
for(const btn of startBtns){
const t=(await btn.textContent()||'').trim().toLowerCase();
const vis=await btn.isVisible().catch(()=>false);
console.log('   Button: "'+t+'" visible:'+vis);
if(t==='start'&&vis){
await btn.click();
console.log('   ✅ Clicked Start!');
break;
}
}
await pHost.waitForTimeout(3000);
await snap('after-start');

// Now try clicking skip on instructions
const skipBtns=await pHost.$$('button, [role=button]');
for(const btn of skipBtns){
const t=(await btn.textContent()||'').trim().toLowerCase();
const vis=await btn.isVisible().catch(()=>false);
if(t==='skip'&&vis){
await btn.click();
console.log('   Clicked Skip instructions');
break;
}
}
await pHost.waitForTimeout(3000);
await snap('after-skip');

// Now we should be on the actual game page. Look for round controls.
// In Gold Quest, host might need to click to start rounds.
console.log('\n🔍 Looking for game controls...');
for(let t=0;t<30;t++){
await pHost.waitForTimeout(3000);
await snap('t'+String(t*3).padStart(3,'0')+'s');

// Inject AA into bots (first time only)
if(t===0){
for(const pBot of bots){
for(const f of pBot.frames()){try{await f.evaluate(`(function(){
if(window.__aaId)clearInterval(window.__aaId);
window.__aaLastQ='';window.__aaChecks=0;
window.__aaId=setInterval(function(){
try{
function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
for(var el of document.querySelectorAll('*')){
var k=Object.keys(el).filter(function(x){return x.indexOf('__react')===0});if(!k.length)continue;
var s=wF(el[k[0]],0);if(!s)continue;
var hasGame=Object.keys(s).some(function(k){return k==='question'||k==='stage'||k==='gold'||k==='choices'});
if(!hasGame)continue;
var qt=s.question&&(s.question.question||s.question.text);

if(qt&&s.question.correctAnswers&&qt!==window.__aaLastQ){
var ca=Array.isArray(s.question.correctAnswers)?s.question.correctAnswers:[s.question.correctAnswers];
document.querySelectorAll('[class*="answerContainer"]').forEach(function(c){
var txt=(c.textContent||'').trim();
if(ca.some(function(a){return(a||'').toString().trim()===txt})&&c.offsetHeight>0){
c.click();window.__aaLastQ=qt;window.__aaChecks++;
console.log('[BOT] answered: '+txt);
}
});
}

// Chest - pick worst
if(s.stage==='prize'&&s.choices&&s.choices.length>=2){
console.log('[CHEST] state keys:',Object.keys(s).filter(k=>typeof s[k]!=='function').join(','));
console.log('[CHEST] choices:',s.choices.map(function(c){return JSON.stringify({keys:Object.keys(c).filter(k=>typeof c[k]!=='function'),text:c.text||c.question})}));

var minIdx=0,minVal=99999;
s.choices.forEach(function(c,i){
var txt=c.text||c.question||'';
var m=txt.match(/\\+?(\\d+)/);var v=m?parseInt(m[1]):0;
if(v<minVal){minVal=v;minIdx=i}
});
var ce=document.querySelectorAll('[class*="chest"],[class*="Chest"],[class*="prize"]');
if(ce.length>minIdx&&ce[minIdx].offsetHeight>0){ce[minIdx].click()}
break;
}
break;
}
window.__aaChecks++;
}catch(e){}
},600)})()`)}catch(e){}}
try{await pBot.evaluate(`(function(){...as above...})()`).catch(()=>{})}catch(e){}
}
}

// Try clicking visible buttons carefully
await pHost.evaluate(()=>{
document.querySelectorAll('button:not([disabled])').forEach(b=>{
var t=(b.textContent||'').trim().toLowerCase();
// Only click specific texts
if(t==='next'||t==='continue'||t==='go'){
console.log('[HOST] clicking: '+t);
b.click();
}
});
});

// Check bot states
for(const [i,pBot] of bots.entries()){
try{
const s=await pBot.evaluate(()=>{
try{
function wF(n,d){if(!n||d>50)return null;try{var st=n.stateNode?.state;if(st)return st}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
for(var el of document.querySelectorAll('*')){
var k=Object.keys(el).filter(x=>x.indexOf('__react')===0);if(!k.length)continue;
var st=wF(el[k[0]],0);if(!st)continue;
if(st.stage||st.question)return st.stage+' q='+(st.question?(st.question.question||st.question.text):'?')+' g='+st.gold;
}
}catch(e){}
return 'no-state';
}).catch(()=>'err');
console.log('   Bot'+i+':',s);
}catch(e){}
}
}

await b.close().catch(()=>{});
console.log('✅ Done - check /tmp/gq-*.png');
})();
