const {chromium}=require('playwright-extra');
const StealthPlugin=require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());
(async()=>{
  const b=await chromium.launch({headless:true,args:['--no-sandbox']});
  const ctx=await b.newContext({viewport:{width:1400,height:1000}});
  const p=await ctx.newPage();

  await p.goto('https://play.blooket.com/play',{waitUntil:'domcontentloaded',timeout:20000});await p.waitForTimeout(4000);
  await p.evaluate(()=>{document.querySelectorAll('button').forEach(b=>{if(b.textContent.includes('Accept All'))b.click()})});
  await p.waitForTimeout(2000);
  await p.locator('input[name=join-code]').click();await p.keyboard.type('8487995',{delay:80});
  await p.locator('button.FormSubmitButton_submitButton__MK2LJ').click();await p.waitForTimeout(8000);
  try{
    const inputs=await p.$$('input');
    for(const i of inputs){const vis=await i.isVisible();if(vis){await i.click();await p.keyboard.type('LiveT'+Math.floor(Math.random()*9000),{delay:50});break}}
    try{await p.locator('[class*=joinButton]').click();await p.waitForTimeout(5000);}catch(e){}
  }catch(e){}
  console.log('URL:',p.url());
  
  // Poll state every 2s for 40s
  for(let i=0;i<20;i++){
    await p.waitForTimeout(2000);
    try{
      const r=await p.evaluate(()=>{
        function walkFiber(node,depth){
          if(!node||depth>50)return null;
          try{const s=node.stateNode?.state;if(s)return s}catch(e){}
          return walkFiber(node.child,depth+1)||walkFiber(node.sibling,depth+1)||walkFiber(node.return,depth+1);
        }
        for(const el of document.querySelectorAll('*')){
          const keys=Object.keys(el).filter(k=>k.startsWith('__react'));
          if(!keys.length)continue;
          const s=walkFiber(el[keys[0]],0);
          if(!s)continue;
          if(s.question?.text&&s.choices){
            const corrects=[];
            s.choices.forEach(c=>{if(c.correct===true)corrects.push(c.text||c.answer)});
            if(s.question.correctAnswers){const ca=Array.isArray(s.question.correctAnswers)?s.question.correctAnswers:[s.question.correctAnswers];corrects.push(...ca)}
            return JSON.stringify({Q:s.question.text,A:corrects,gold:s.gold,url:location.href});
          }
          if(s.question?.correctAnswers){
            return JSON.stringify({Q:s.question.text||s.question.question,A:Array.isArray(s.question.correctAnswers)?s.question.correctAnswers.join(','):s.question.correctAnswers,stage:s.stage,url:location.href});
          }
          if(s.stage)return JSON.stringify({stage:s.stage,gold:s.gold,url:location.href});
        }
        return JSON.stringify({none:true,url:location.href});
      });
      console.log('['+i+']',r);
    }catch(e){console.log('err:',e.message.slice(0,80))}
  }
  await b.close();
})();
