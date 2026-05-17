const {chromium}=require('playwright-extra');
const StealthPlugin=require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());
(async()=>{
  const b=await chromium.launch({headless:true,args:['--no-sandbox']});
  const ctx=await b.newContext({viewport:{width:1400,height:1000}});
  await ctx.addInitScript(()=>{Object.defineProperty(navigator,'webdriver',{get:()=>false})});
  const p=await ctx.newPage();

  // Join game
  await p.goto('https://play.blooket.com/play',{waitUntil:'domcontentloaded',timeout:20000});await p.waitForTimeout(4000);
  await p.evaluate(()=>{document.querySelectorAll('button').forEach(b=>{if(b.textContent.includes('Accept All'))b.click()})});
  await p.waitForTimeout(2000);
  await p.locator('input[name=join-code]').click();await p.keyboard.type('6331767',{delay:80});
  await p.locator('button.FormSubmitButton_submitButton__MK2LJ').click();
  await p.waitForTimeout(6000);
  try{
    const inputs=await p.$$('input');
    for(const i of inputs){const vis=await i.isVisible();if(vis){await i.click();await p.keyboard.type('Inspector',{delay:50});break}}
    await p.locator('[class*=joinButton]').click();await p.waitForTimeout(5000);
  }catch(e){}
  console.log('URL:',p.url());
  await p.waitForTimeout(5000);

  // Check the iframe for detailed React state
  const frames=p.frames();
  console.log('Frames:',frames.length);
  for(const f of frames){
    console.log('Frame:',f.url().slice(0,100));
    if(f.url().includes('gold')||f.url().includes('game')){
      const deep=await f.evaluate(()=>{
        for(const el of document.querySelectorAll('*')){
          const keys=Object.keys(el).filter(k=>k.startsWith('__react'));
          if(!keys.length)continue;
          let node=el[keys[0]];
          for(let i=0;i<50&&node;i++){
            const s=node.stateNode?.state;
            if(s?.stage==='question'&&s?.question){
              const q=s.question;
              const choices=s.choices;
              return JSON.stringify({
                stage:s.stage,
                qText:q.text||q.question,
                qType:q.qType,
                correctAnswers:q.correctAnswers,
                answer:q.answer,
                answers:q.answers?.slice?.(0,5),
                choices:Array.isArray(choices)?choices.map(c=>({
                  text:c.text||c.answer||c.option,
                  correct:c.correct,
                  isCorrect:c.isCorrect,
                  keys:Object.keys(c)
                })).slice(0,5):typeof choices,
                gold:s.gold,
                playerCount:s.players?.length
              });
            }
            node=node.return||node.child||node.sibling;
          }
          break;
        }
        return JSON.stringify({found:false});
      });
      console.log('Deep state:',deep);
      break;
    }
  }

  await b.close();
})().catch(e=>console.error(e.message));
