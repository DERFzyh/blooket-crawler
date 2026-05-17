const {chromium}=require('playwright-extra');
const StealthPlugin=require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());
(async()=>{
  const b=await chromium.launch({headless:true,args:['--no-sandbox']});
  const ctx=await b.newContext({viewport:{width:1400,height:1000}});
  const p=await ctx.newPage();

  await p.goto('https://play.blooket.com/play',{waitUntil:'domcontentloaded',timeout:20000});await p.waitForTimeout(3000);
  await p.evaluate(()=>{document.querySelectorAll('button').forEach(b=>{if(b.textContent.includes('Accept All'))b.click()})});
  await p.waitForTimeout(2000);
  await p.locator('input[name=join-code]').click();await p.keyboard.type('1627236',{delay:80});
  await p.locator('button.FormSubmitButton_submitButton__MK2LJ').click();
  await p.waitForTimeout(8000);
  try{
    const inputs=await p.$$('input');
    for(const i of inputs){const vis=await i.isVisible();if(vis){await i.click();await p.keyboard.type('Test'+Math.floor(Math.random()*9000),{delay:50});break}}
    await p.locator('[class*=joinButton]').click();await p.waitForTimeout(5000);
  }catch(e){}
  console.log('URL:',p.url());
  if(!p.url().includes('/play/gold')){console.log('Not in game yet, waiting...');await p.waitForTimeout(10000);console.log('URL2:',p.url())}

  // Test the FIXED walkFiber (only returns game states)
  const r=await p.evaluate(()=>{
    function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s&&(s.question||s.stage||s.choices||s.gold!==undefined))return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
    for(var el of document.querySelectorAll('*')){
      var k=Object.keys(el).filter(x=>x.indexOf('__react')===0);if(!k.length)continue;
      var s=wF(el[k[0]],0);if(!s)continue;
      // Gold Quest detection
      if(s.question?.text&&s.choices){
        var cr=[];s.choices.forEach(c=>{if(c.correct===true)cr.push(c.text||c.answer)});
        if(s.question.correctAnswers){var a=s.question.correctAnswers;if(!Array.isArray(a))a=[a];cr=cr.concat(a)}
        return JSON.stringify({Q:s.question.text,A:cr,gold:s.gold,answers:document.querySelectorAll('[class*=answerContainer]').length});
      }
      if(s.question?.correctAnswers)return JSON.stringify({Q:s.question.text||s.question.question,A:Array.isArray(s.question.correctAnswers)?s.question.correctAnswers.join(','):s.question.correctAnswers});
      if(s.stage&&s.question?.text)return JSON.stringify({Q:s.question.text,stage:s.stage});
      return JSON.stringify({stage:s.stage||'?',gold:s.gold});
    }
    return JSON.stringify({none:true,url:location.href});
  });
  console.log('State:',r);

  // If we found a question, click the answer!
  const state=JSON.parse(r);
  if(state.Q){
    console.log('Clicking answer:',state.A);
    const clicked=await p.evaluate(()=>{
      var els=document.querySelectorAll('[class*=answerContainer]');
      for(var i=0;i<els.length;i++){
        var t=(els[i].textContent||'').trim();
        if(t==='b'&&els[i].offsetHeight>0){els[i].click();return 'clicked b at '+i}
      }
      return 'not clicked, els='+els.length;
    });
    console.log('Click:',clicked);
    await p.waitForTimeout(3000);
    // Check if question changed
    const after=await p.evaluate(()=>{
      function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s&&(s.question||s.stage||s.choices||s.gold!==undefined))return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
      for(var el of document.querySelectorAll('*')){
        var k=Object.keys(el).filter(x=>x.indexOf('__react')===0);if(!k.length)continue;
        var s=wF(el[k[0]],0);if(!s)continue;
        if(s.question?.text)return JSON.stringify({Q:s.question.text,gold:s.gold});
      }
      return JSON.stringify({none:true});
    });
    console.log('After click:',after);
  }
  await p.screenshot({path:'/tmp/final-click-test.png'});
  await b.close();
})();
