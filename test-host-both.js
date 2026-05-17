const {chromium}=require('playwright-extra');
const StealthPlugin=require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

const GAME_STATE_JS = `(function(){
function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
for(var el of document.querySelectorAll('*')){
var k=Object.keys(el).filter(function(x){return x.indexOf('__react')===0});if(!k.length)continue;
var s=wF(el[k[0]],0);if(!s)continue;
var hasGame=Object.keys(s).some(function(k){return k==='question'||k==='stage'||k==='gold'||k==='choices'||k==='weight'||k==='lure'||k==='crypto'||k==='password'||k==='correctPassword'});
if(!hasGame)continue;
var qt=s.question&&(s.question.question||s.question.text);
if(qt&&s.question.correctAnswers){
return{stage:s.stage||'question',questionText:qt,correctAnswers:Array.isArray(s.question.correctAnswers)?s.question.correctAnswers:[s.question.correctAnswers],gold:s.gold,weight:s.weight,isFrenzy:s.isFrenzy,lure:s.lure,crypto:s.crypto,password:s.password,correctPassword:s.correctPassword,passwordOptions:s.passwordOptions,pathname:location.pathname}
}
if(s.stage==='prize'&&s.choices&&s.choices.length>=3){return{stage:'prize',choices:s.choices.map(function(c){return c.text||''}),gold:s.gold,pathname:location.pathname}}
if(s.weight!==undefined||s.lure!==undefined){return{stage:s.stage||'fishing',weight:s.weight,isFrenzy:s.isFrenzy,lure:s.lure,gold:s.gold,pathname:location.pathname}}
if(s.password!==undefined&&s.passwordOptions&&s.passwordOptions.length>0){return{stage:s.stage||'guessing',crypto:s.crypto,password:s.password,passwordOptions:s.passwordOptions,correctPassword:s.correctPassword,gold:s.gold,pathname:location.pathname}}
if(s.stage)return{stage:s.stage,gold:s.gold,pathname:location.pathname}
}
return{stage:'none',pathname:location.pathname}
})()`;

const AUTO_ANSWER_JS = `(function(){
if(window.__aaId)clearInterval(window.__aaId);
window.__aaId=setInterval(function(){
try{
function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
for(var el of document.querySelectorAll('*')){
var k=Object.keys(el).filter(function(x){return x.indexOf('__react')===0});if(!k.length)continue;
var s=wF(el[k[0]],0);if(!s)continue;
var hasGame=Object.keys(s).some(function(k){return k==='question'||k==='stage'||k==='gold'||k==='choices'||k==='weight'||k==='lure'||k==='crypto'||k==='password'||k==='correctPassword'});
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
var correctPw=s.correctPassword||(pwOpts[0]||'').toString().trim();
var clicked=false;
document.querySelectorAll('[class*="button"],[role=button]').forEach(function(c){
var t=(c.textContent||'').trim();
if(!clicked&&correctPw&&t===correctPw&&c.offsetHeight>0){c.click();console.log('[Bot] crypto guessed: '+t);clicked=true}
});
if(!clicked&&s&&s.password!==undefined&&s.passwordOptions){
s.password=s.correctPassword||s.passwordOptions[0];
if(s.forceUpdate)s.forceUpdate();
console.log('[Bot] crypto state override: '+(s.correctPassword||s.passwordOptions[0]))
}
}
document.querySelectorAll('button:not([disabled])').forEach(function(c){if(c.offsetHeight>0)c.click()});
document.querySelectorAll('[role=button]').forEach(function(c){if(c.offsetHeight>0)c.click()});
break;
}
}catch(e){}
},600)})()`;

async function hostGame(ctx, gameModeImgAlt) {
  const pHost=await ctx.newPage();
  await pHost.goto('https://play.blooket.com/host?id=685d405f64022b0fbe8ac753',{waitUntil:'domcontentloaded',timeout:20000});
  await pHost.waitForTimeout(4000);
  
  // Click game mode image
  await pHost.click(`img[alt="${gameModeImgAlt}"]`);
  await pHost.waitForTimeout(1000);
  
  // Click Host button
  await pHost.click('button:has-text("Host")');
  await pHost.waitForTimeout(5000);
  
  // Sometimes there's a settings page - click hostNow
  const hhn=await pHost.$('#hostNow');
  if(hhn){await pHost.click('#hostNow');await pHost.waitForTimeout(5000);}
  
  // Get PIN - try multiple approaches
  let PIN=await pHost.evaluate(()=>{
    const el=document.querySelector('._idNumberText_1gorp_59, [class*="idNumber"], [class*="idNumberText"]');
    return el?el.textContent?.trim():null;
  });
  if(!PIN){
    // Try regex on body text
    PIN=await pHost.evaluate(()=>{
      const m=document.body.textContent.match(/\b(\d{6,7})\b/);
      return m?m[1]:null;
    });
  }
  
  return {pHost, PIN};
}

async function testGame(ctx, gameModeImgAlt, label) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`=== TESTING: ${label} ===`);
  console.log(`${'='.repeat(60)}`);
  
  console.log('1. Hosting game...');
  const {pHost, PIN}=await hostGame(ctx, gameModeImgAlt);
  console.log('   PIN:',PIN||'NOT FOUND');
  if(!PIN){await pHost.close();return;}
  
  console.log('2. Joining bot...');
  const pBot=await ctx.newPage();
  await pBot.goto('https://play.blooket.com/play',{waitUntil:'domcontentloaded',timeout:20000});
  await pBot.waitForTimeout(3000);
  try{await pBot.fill('input[placeholder*="Game ID" i]',PIN);await pBot.keyboard.press('Enter');}catch(e){}
  await pBot.waitForTimeout(4000);
  const ni=await pBot.$('input[placeholder*="name" i]');
  if(ni){await ni.fill('Bot_'+label.replace(/\s/g,''));await pBot.keyboard.press('Enter');}
  await pBot.waitForTimeout(3000);
  console.log('   Bot URL:',pBot.url());
  
  console.log('3. Starting game...');
  await pHost.evaluate(()=>{document.querySelectorAll('button,[role=button]').forEach(b=>{if(b.textContent?.includes('Start'))b.click()})});
  await pHost.waitForTimeout(3000);
  await pHost.evaluate(()=>{document.querySelectorAll('button,[role=button]').forEach(b=>{if(b.textContent?.includes('Skip'))b.click()})});
  await pHost.waitForTimeout(5000);
  console.log('   Bot game URL:',pBot.url());
  
  console.log('4. Injecting auto-answer...');
  for(const f of pBot.frames()){try{await f.evaluate(AUTO_ANSWER_JS)}catch(e){}}
  try{await pBot.evaluate(AUTO_ANSWER_JS)}catch(e){}
  console.log('   ✅ Injected');
  
  console.log('5. Monitoring (60s)...');
  let qCount=0,fishCount=0,cryptoCount=0,lastGold=undefined,lastCrypto=undefined;
  for(let t=0;t<20;t++){
    await pBot.waitForTimeout(3000);
    let state=null;
    for(const f of pBot.frames()){try{state=await f.evaluate(GAME_STATE_JS);if(state)break}catch(e){}}
    if(!state)try{state=await pBot.evaluate(GAME_STATE_JS)}catch(e){}
    if(!state){console.log(`   [${(t+1)*3}s] No state`);continue;}
    
    let line=`[${(t+1)*3}s] `;
    if(state.questionText){
      line+=`Q: ${state.questionText.slice(0,35)}... A:${(state.correctAnswers||[]).join(',')}`;qCount++;
      if(state.weight!==undefined)line+=` 🐟${state.weight}f:${state.isFrenzy}`;
      if(state.crypto!==undefined)line+=` 🔐${state.crypto}cpw:${state.correctPassword}`;
    }else if(state.weight!==undefined||state.lure!==undefined){
      line+=`🎣 钓鱼 w:${state.weight} l:${state.lure} f:${state.isFrenzy} 💰${state.gold}`;fishCount++;
    }else if(state.passwordOptions&&state.passwordOptions.length>0){
      line+=`🔓 密码 c:${state.crypto} pw:${state.password} correct:${state.correctPassword} 💰${state.gold}`;cryptoCount++;
    }else if(state.stage){line+=`Stage: ${state.stage} 💰${state.gold}`;}
    else{line+='Idle';}
    if(state.gold!==undefined&&state.gold!==lastGold){lastGold=state.gold;line+=' ✨🪙'}
    if(state.crypto!==undefined&&state.crypto!==lastCrypto){lastCrypto=state.crypto;line+=' ✨🔐'}
    console.log(line);
    if(state.stage==='none'&&t>5){console.log('   Game ended');break;}
  }
  console.log(`📊 Q:${qCount} Fish:${fishCount} Crypto:${cryptoCount}`);
  
  await pBot.evaluate('clearInterval(window.__aaId)').catch(()=>{});
  const short=label.toLowerCase().replace(/\s/g,'-');
  await pBot.screenshot({path:`/tmp/bot-${short}-final.png`});
  await pHost.close();
  await pBot.close();
  console.log(`✅ ${label} test DONE`);
}

(async()=>{
  const b=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  const ctx=await b.newContext({viewport:{width:1400,height:1000}});
  await ctx.addInitScript(()=>{
    Object.defineProperty(navigator,'webdriver',{get:()=>false});
    setInterval(()=>{document.querySelectorAll('button').forEach(b=>{if(b.textContent?.includes('Accept'))b.click()})},500);
  });
  
  // Login once
  console.log('=== LOGIN ===');
  const pLogin=await ctx.newPage();
  await pLogin.goto('https://id.blooket.com/login',{waitUntil:'domcontentloaded',timeout:20000});
  await pLogin.waitForTimeout(3000);
  await pLogin.fill('input[name=username]','fred11zyh@outlook.com');
  await pLogin.fill('input[name=password]','ZYH11fred@blooket');
  await pLogin.waitForTimeout(500);
  await pLogin.click('button[type=submit]');
  await pLogin.waitForTimeout(6000);
  console.log('URL:',pLogin.url());
  await pLogin.close();
  
  // Test both games
  await testGame(ctx, 'Select Fishing Frenzy', 'Fishing Frenzy');
  await testGame(ctx, 'Select Crypto Hack', 'Crypto Hack');
  
  await b.close();
  console.log('\n🎉 All tests complete!');
})().catch(e=>{console.error('FATAL:',e.message);process.exit(1);});
