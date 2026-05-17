const {chromium}=require('playwright-extra');
const StealthPlugin=require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

// GAME_STATE_JS (same as server.js)
const GAME_STATE_JS = `(function(){
function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
for(var el of document.querySelectorAll('*')){
var k=Object.keys(el).filter(function(x){return x.indexOf('__react')===0});if(!k.length)continue;
var s=wF(el[k[0]],0);if(!s)continue;
var hasGame=Object.keys(s).some(function(k){return k==='question'||k==='stage'||k==='gold'||k==='choices'||k==='weight'||k==='lure'||k==='crypto'||k==='password'});
if(!hasGame)continue;
var qt=s.question&&(s.question.question||s.question.text);

if(qt&&s.question.correctAnswers){
var ca=Array.isArray(s.question.correctAnswers)?s.question.correctAnswers:[s.question.correctAnswers];
return{stage:s.stage||'question',questionText:qt,correctAnswers:ca,gold:s.gold,weight:s.weight,isFrenzy:s.isFrenzy,lure:s.lure,crypto:s.crypto,password:s.password,passwordOptions:s.passwordOptions,pathname:location.pathname}
}
if(s.stage==='prize'&&s.choices&&s.choices.length>=3){
var opts=s.choices.map(function(c){var t=c.text||'';return t});
return{stage:'prize',choices:opts,gold:s.gold,pathname:location.pathname}
}
if(s.weight!==undefined||s.lure!==undefined){
return{stage:s.stage||'fishing',weight:s.weight,isFrenzy:s.isFrenzy,lure:s.lure,gold:s.gold,pathname:location.pathname}
}
if(s.password!==undefined&&s.passwordOptions&&s.passwordOptions.length>0){
return{stage:s.stage||'guessing',crypto:s.crypto,password:s.password,passwordOptions:s.passwordOptions,gold:s.gold,pathname:location.pathname}
}
if(s.stage)return{stage:s.stage,gold:s.gold,weight:s.weight,crypto:s.crypto,pathname:location.pathname}
}
return{stage:'none',pathname:location.pathname}
})()`;

// AUTO_ANSWER_JS (same as server.js)
const AUTO_ANSWER_JS = `(function(){
if(window.__aaId)clearInterval(window.__aaId);
window.__aaId=setInterval(function(){
try{
function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
for(var el of document.querySelectorAll('*')){
var k=Object.keys(el).filter(function(x){return x.indexOf('__react')===0});if(!k.length)continue;
var s=wF(el[k[0]],0);if(!s)continue;
var hasGame=Object.keys(s).some(function(k){return k==='question'||k==='stage'||k==='gold'||k==='choices'||k==='weight'||k==='lure'||k==='crypto'||k==='password'});
if(!hasGame)continue;
var qt=s.question&&(s.question.question||s.question.text);
var weight=s.weight,lure=s.lure,isFrenzy=s.isFrenzy;
var cr=s.crypto,pw=s.password,pwOpts=s.passwordOptions;

if(qt&&s.question.correctAnswers){
var ca=Array.isArray(s.question.correctAnswers)?s.question.correctAnswers:[s.question.correctAnswers];
document.querySelectorAll('[class*="answerContainer"]').forEach(function(c){
var t=(c.textContent||'').trim();
if(ca.some(function(a){return(a||'').toString().trim()===t})&&c.offsetHeight>0){c.click();console.log('[Bot] answered: '+t)}
});
}
if(s.stage==='prize'&&s.choices&&s.choices.length>=3){
var bestVal=-1,bestIdx=0;
s.choices.forEach(function(c,i){
var txt=c.text||c.question||'';
var m=txt.match(/\\+?\\s*(\\d+)/);var v=m?parseInt(m[1]):0;
if(txt.indexOf('Triple')>=0)v=999;if(txt.indexOf('Double')>=0)v=666;
if(v>bestVal){bestVal=v;bestIdx=i}
});
var ce=document.querySelectorAll('[class*="chest"],[class*="Chest"],[class*="prize"]');
if(ce.length>bestIdx&&ce[bestIdx].offsetHeight>0){ce[bestIdx].click();console.log('[Bot] picked chest #'+bestIdx+' ('+bestVal+')')}
}
if((weight!==undefined||lure!==undefined)&&!qt){
document.querySelectorAll('[class*="cast"],[class*="Cast"],[class*="fish"],[class*="Fish"],[class*="reel"],[class*="Reel"]').forEach(function(c){
if(c.offsetHeight>0){c.click();console.log('[Bot] fishing click')}
});
}
if(pwOpts&&pwOpts.length>0&&!qt){
var correctPw=(pwOpts[0]||'').toString().trim();
document.querySelectorAll('button,:not([disabled])').forEach(function(c){
var t=(c.textContent||'').trim();
if(correctPw&&t===correctPw&&c.offsetHeight>0){c.click();console.log('[Bot] crypto guessed: '+t)}
});
}
document.querySelectorAll('button:not([disabled])').forEach(function(c){if(c.offsetHeight>0)c.click()});
document.querySelectorAll('[role=button]').forEach(function(c){if(c.offsetHeight>0)c.click()});
break;
}
}catch(e){}
},600)})()`;

async function joinAndTest(pin, label) {
  console.log(`\n=== ${label} (PIN:${pin}) ===`);
  const b=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  const ctx=await b.newContext({viewport:{width:1400,height:1000}});
  const p=await ctx.newPage();

  await p.goto('https://play.blooket.com/play',{waitUntil:'domcontentloaded',timeout:15000});
  await p.waitForTimeout(3000);
  await p.evaluate(()=>{document.querySelectorAll('button').forEach(b=>{if(b.textContent?.includes('Accept All'))b.click()})});
  await p.waitForTimeout(2000);
  await p.locator('input[name=join-code]').click();await p.keyboard.type(pin,{delay:80});
  console.log('PIN entered');
  await p.locator('button.FormSubmitButton_submitButton__MK2LJ').click();
  await p.waitForTimeout(8000);

  try{
    const inputs=await p.$$('input');
    for(const i of inputs){const vis=await i.isVisible();if(vis){await i.click();await p.keyboard.type('T'+Math.floor(Math.random()*9000),{delay:50});break}}
    await p.locator('[class*=joinButton]').click();await p.waitForTimeout(5000);
  }catch(e){}
  console.log('URL:',p.url());

  // Check if game is actually running
  const initial=await p.evaluate(GAME_STATE_JS);
  console.log('Initial state:',JSON.stringify(initial).slice(0,300));

  if(initial.stage==='none'&&p.url().includes('register')){
    console.log('Game not running (register page). Creating own game...');
    await b.close();
    return null;
  }

  // Inject auto-answer
  await p.evaluate(AUTO_ANSWER_JS);
  console.log('Auto-answer injected');

  // Monitor for 90+ seconds, checking state every 3s
  for(let t=0;t<30;t++){
    await p.waitForTimeout(3000);
    const state=await p.evaluate(GAME_STATE_JS);
    let line='';
    if(state.questionText){
      line=`Q: ${state.questionText.slice(0,40)}... ✅ ${(state.correctAnswers||[]).join(',')}`;
      if(state.weight!==undefined) line+=` 🐟${state.weight} frenzy:${state.isFrenzy}`;
      if(state.crypto!==undefined) line+=` 🔐${state.crypto}`;
      line+=` 💰${state.gold}`;
    } else if(state.weight!==undefined) {
      line=`🎣 FISHING weight:${state.weight} lure:${state.lure} frenzy:${state.isFrenzy} 💰${state.gold}`;
    } else if(state.passwordOptions&&state.passwordOptions.length>0) {
      line=`🔓 GUESSING crypto:${state.crypto} pw:${state.password} opts:${(state.passwordOptions||[]).slice(0,3).join(',')} 💰${state.gold}`;
    } else if(state.stage) {
      line=`Stage: ${state.stage} 💰${state.gold}`;
    } else {
      line='No game state';
    }
    console.log(`[${t}] ${line}`);
    if(state.stage==='none'&&t>3) {
      console.log('Game ended');
      break;
    }
  }

  await p.screenshot({path:`/tmp/test-${label.toLowerCase()}.png`});
  await b.close();
  return true;
}

(async()=>{
  const res1=await joinAndTest('5995773','FishingFrenzy');
  const res2=await joinAndTest('6090638','CryptoHack');
  if(!res1&&!res2) console.log('\n⚠️ Both games are on register page - need active games to test');
})();
