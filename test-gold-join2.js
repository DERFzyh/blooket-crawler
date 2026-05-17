const {chromium}=require('playwright-extra');
const StealthPlugin=require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());
(async()=>{
  const b=await chromium.launch({headless:true,args:['--no-sandbox']});
  const ctx=await b.newContext({viewport:{width:1400,height:1000}});
  await ctx.addInitScript(()=>{Object.defineProperty(navigator,'webdriver',{get:()=>false})});
  const p=await ctx.newPage();

  await p.goto('https://play.blooket.com/play',{waitUntil:'domcontentloaded',timeout:20000});
  await p.waitForTimeout(4000);
  await p.evaluate(()=>{
    document.querySelectorAll('button').forEach(b=>{if(b.textContent.includes('Accept All'))b.click()});
  });
  await p.waitForTimeout(2000);
  await p.locator('input[name="join-code"]').click();
  await p.keyboard.type('4237282',{delay:80});
  await p.locator('button.FormSubmitButton_submitButton__MK2LJ').click();
  await p.waitForTimeout(6000);
  console.log('URL1:',p.url());

  // Enter name
  try{
    const ni=p.locator('input[name="name"]');
    await ni.waitFor({timeout:5000});
    await ni.click();await p.keyboard.type('Bot',{delay:50});
    await p.keyboard.press('Enter');
    await p.waitForTimeout(4000);
  }catch(e){console.log('No name input');}
  console.log('URL2:',p.url());

  // Click the join button (class _joinButton)
  if(p.url().includes('register')){
    console.log('Clicking join button...');
    await p.locator('._joinButton_1lycq_109').click();
    await p.waitForTimeout(5000);
    console.log('URL3:',p.url());
    
    await p.screenshot({path:'/tmp/gold-after-join.png'});
    
    // Check game state
    const gs=await p.evaluate(()=>{
      for(const el of document.querySelectorAll('*')){
        const keys=Object.keys(el).filter(k=>k.startsWith('__react'));
        if(!keys.length)continue;
        let n=el[keys[0]];
        for(let i=0;i<40&&n;i++){
          const s=n.stateNode?.state;
          if(s?.question?.correctAnswers){
            return JSON.stringify({stage:s.stage,q:s.question.text?.slice(0,60),correct:Array.isArray(s.question.correctAnswers)?s.question.correctAnswers.join(','):s.question.correctAnswers,gold:s.gold});
          }
          if(s?.stage&&s.stage!=='none')return JSON.stringify({stage:s.stage});
          n=n.return||n.child||n.sibling;
        }
      }
      return JSON.stringify({stage:'none',path:location.pathname});
    });
    console.log('Game state:',gs);
  }

  await b.close();
})().catch(e=>console.error(e.message));
