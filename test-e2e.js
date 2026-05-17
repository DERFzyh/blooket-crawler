const {chromium} = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

(async()=>{
  const b=await chromium.launch({headless:true,args:['--no-sandbox']});
  const ctx=await b.newContext({viewport:{width:1400,height:1000}});
  await ctx.addInitScript(()=>{
    Object.defineProperty(navigator,'webdriver',{get:()=>false});
    setInterval(()=>{document.querySelectorAll('button').forEach(b=>{if(b.textContent.includes('Accept'))b.click()})},500);
  });
  
  // Helper: click element by text
  async function clickText(pg,text){await pg.evaluate((t)=>{
    const els=document.querySelectorAll('[role=button], button');
    for(const el of els){if(el.textContent.trim().includes(t)){el.click();return;}}
  },text);}
  
  const pHost=await ctx.newPage();
  
  // LOGIN + HOST
  console.log('=== LOGIN & HOST ===');
  await pHost.goto('https://id.blooket.com/login',{waitUntil:'domcontentloaded',timeout:20000});
  await pHost.waitForTimeout(3000);
  await pHost.fill('input[name=username]','fred11zyh@outlook.com');
  await pHost.fill('input[name=password]','ZYH11fred@blooket');
  await pHost.click('button[type=submit]');
  await pHost.waitForTimeout(6000);
  
  await pHost.goto('https://play.blooket.com/host?id=685d405f64022b0fbe8ac753',{waitUntil:'domcontentloaded',timeout:20000});
  await pHost.waitForTimeout(4000);
  await pHost.click('img[alt="Select Fishing Frenzy"]');await pHost.waitForTimeout(500);
  await pHost.click('button:has-text("Host")');await pHost.waitForTimeout(5000);
  await pHost.waitForTimeout(3000);
  await pHost.click('#hostNow');await pHost.waitForTimeout(5000);
  
  const PIN=await pHost.evaluate(()=>document.querySelector('._idNumberText_1gorp_59')?.textContent.trim());
  console.log('PIN:',PIN);
  
  // JOIN 2 BOTS
  console.log('\n=== JOIN BOTS ===');
  async function joinBot(name){
    const p=await ctx.newPage();
    await p.goto('https://play.blooket.com/play',{waitUntil:'domcontentloaded',timeout:20000});
    await p.waitForTimeout(3000);
    await p.fill('input[placeholder*="Game ID" i]',PIN);
    await p.keyboard.press('Enter');
    await p.waitForTimeout(3000);
    const ni=await p.$('input[placeholder*="name" i]');
    if(ni){await ni.fill(name);await p.keyboard.press('Enter');}
    await p.waitForTimeout(2000);
    console.log(`${name} joined`);
    return p;
  }
  const pBot1=await joinBot('Bot1');
  const pBot2=await joinBot('Bot2');
  await pHost.waitForTimeout(2000);
  
  // START GAME
  console.log('\n=== START GAME ===');
  await clickText(pHost,'Start');  
  await pHost.waitForTimeout(3000);
  console.log('After Start:',pHost.url());
  
  // Click Skip on instructions  
  await clickText(pHost,'Skip');
  await pHost.waitForTimeout(5000);
  console.log('After Skip:',pHost.url());
  console.log('Bot URL:',pBot1.url());
  
  // Check game state
  const gs=await pBot1.evaluate(()=>{
    try{
      for(const el of document.querySelectorAll('*')){
        const k=Object.keys(el).find(k=>k.startsWith('__reactFiber$'));
        if(!k)continue;let n=el[k];
        for(let i=0;i<40&&n;i++){
          const s=n.stateNode?.state;
          if(s?.question?.correctAnswers){
            return JSON.stringify({stage:s.stage,q:s.question.text||s.question.question,correct:Array.isArray(s.question.correctAnswers)?s.question.correctAnswers.join(','):s.question.correctAnswers,answers:s.question.answers?.join(',')});
          }
          if(s?.stage)return JSON.stringify({stage:s.stage});
          n=n.return||n.child;
        }
      }
      return JSON.stringify({stage:'none',path:location.pathname});
    }catch(e){return JSON.stringify({error:e.message});}
  });
  console.log('Game state:',gs);
  
  // AUTO ANSWER
  console.log('\n=== AUTO ANSWER ===');
  await pBot1.evaluate(()=>{
    window.__aaId=setInterval(()=>{
      try{
        const clickables=document.querySelectorAll('[role=button], button');
        for(const el of clickables){
          const t=el.textContent||'';
          if(t.includes('Next')||t.includes('OK')){el.click();}
        }
        for(const el of document.querySelectorAll('*')){
          const k=Object.keys(el).find(k=>k.startsWith('__reactFiber$'));
          if(!k)continue;let n=el[k];
          for(let i=0;i<40&&n;i++){
            const s=n.stateNode?.state;
            if(s?.question?.correctAnswers&&s.stage==='question'){
              const correct=Array.isArray(s.question.correctAnswers)?s.question.correctAnswers:[s.question.correctAnswers];
              const containers=document.querySelectorAll('[class*=answerContainer]');
              for(const c of containers){
                const t=c.textContent?.trim();
                if(correct.some(a=>a?.toString().trim()===t)&&c.offsetHeight>0){c.click();return;}
              }
            }
            n=n.return||n.child;
          }
        }
      }catch(e){}
    },400);
  });
  console.log('Auto-answer ACTIVE!');
  
  // MONITOR 25s
  for(let i=0;i<25;i++){
    await pBot1.waitForTimeout(1000);
    const gs2=await pBot1.evaluate(()=>{
      for(const el of document.querySelectorAll('*')){
        const k=Object.keys(el).find(k=>k.startsWith('__reactFiber$'));
        if(!k)continue;let n=el[k];
        for(let j=0;j<40&&n;j++){
          const s=n.stateNode?.state;
          if(s?.question?.text)return JSON.stringify({s:s.stage,q:s.question.text.slice(0,50),w:s.weight});
          n=n.return||n.child;
        }
      }
      return JSON.stringify({s:'idle'});
    });
    console.log(`[${i+1}s]`,gs2);
  }
  
  await pBot1.screenshot({path:'/tmp/bot-final.png'});
  console.log('\nScreenshots saved! DONE!');
  
  await pBot1.evaluate(()=>{if(window.__aaId)clearInterval(window.__aaId)});
  await b.close();
})().catch(e=>{console.error(e.message);process.exit(1);});
