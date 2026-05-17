const {chromium}=require('playwright-extra');
const StealthPlugin=require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());
(async()=>{
  const b=await chromium.launch({headless:true,args:['--no-sandbox']});
  const ctx=await b.newContext({viewport:{width:1400,height:1000}});
  await ctx.addInitScript(()=>{
    Object.defineProperty(navigator,'webdriver',{get:()=>false});
    setInterval(()=>{document.querySelectorAll('button').forEach(b=>{if(b.textContent.includes('Accept'))b.click()})},300);
  });
  const p=await ctx.newPage();
  
  await p.goto('https://play.blooket.com/play',{waitUntil:'domcontentloaded',timeout:20000});
  await p.waitForTimeout(4000);
  
  // Click the Game ID input and type PIN character by character
  await p.click('input[name="join-code"]');
  await p.waitForTimeout(500);
  await p.keyboard.type('4237282',{delay:80});
  console.log('Typed PIN');
  
  // Press Enter on the form
  await p.keyboard.press('Enter');
  await p.waitForTimeout(5000);
  console.log('URL after PIN:',p.url());
  
  // Check for name field
  const hasName=await p.$('input[name="name"], input[placeholder*="name" i]');
  if(hasName){
    console.log('Name field found');
    await hasName.click();
    await p.keyboard.type('Bot',{delay:50});
    await p.keyboard.press('Enter');
    await p.waitForTimeout(4000);
    console.log('URL after name:',p.url());
  } else {
    // Maybe the same join-code field is reused
    console.log('No name field, checking for same input...');
    const inputs=await p.$$('input');
    for(const i of inputs){
      const vis=await i.isVisible();
      const name=await i.getAttribute('name');
      const ph=await i.getAttribute('placeholder');
      if(vis&&name&&name!=='$ACTION'){
        console.log('Visible:',name,ph);
        await i.click();
        await p.keyboard.type('Bot',{delay:50});
        await p.keyboard.press('Enter');
        await p.waitForTimeout(3000);
        break;
      }
    }
    console.log('URL:',p.url());
  }
  
  // Check React state after joining
  const state=await p.evaluate(()=>{
    for(const el of document.querySelectorAll('*')){
      const keys=Object.keys(el).filter(k=>k.startsWith('__react'));
      if(!keys.length)continue;
      let n=el[keys[0]];
      for(let i=0;i<40&&n;i++){
        const s=n.stateNode?.state;
        if(s?.question)return JSON.stringify({stage:s.stage,q:s.question.text?.slice(0,60),correct:s.question.correctAnswers});
        if(s?.stage&&s.stage!=='none')return JSON.stringify({stage:s.stage});
        n=n.return||n.child||n.sibling;
      }
    }
    return JSON.stringify({stage:'none',path:location.pathname});
  });
  console.log('Game state:',state);
  
  await p.screenshot({path:'/tmp/join-typed.png'});
  
  // Start auto-answer if in game
  if(JSON.parse(state).stage==='question'){
    await p.evaluate(()=>{
      window.__aaId=setInterval(()=>{
        for(const el of document.querySelectorAll('*')){
          const keys=Object.keys(el).filter(k=>k.startsWith('__react'));
          if(!keys.length)continue;
          let n=el[keys[0]];
          for(let i=0;i<40&&n;i++){
            const s=n.stateNode?.state;
            if(s?.question?.correctAnswers&&s.stage==='question'){
              const correct=Array.isArray(s.question.correctAnswers)?s.question.correctAnswers:[s.question.correctAnswers];
              document.querySelectorAll('[class*=answerContainer]').forEach(c=>{
                if(correct.some(a=>a?.toString().trim()===c.textContent?.trim()))c.click();
              });
            }
            n=n.return||n.child||n.sibling;
          }
        }
      },400);
    });
    console.log('Auto-answer started!');
    await p.waitForTimeout(5000);
    await p.screenshot({path:'/tmp/auto-answering.png'});
  }
  
  await b.close();
  console.log('Done');
})().catch(e=>console.error(e.message));
