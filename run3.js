const {chromium}=require('playwright-extra');
const StealthPlugin=require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());
(async()=>{
  const PIN='1627236';
  const b=await chromium.launch({headless:true,args:['--no-sandbox']});
  const ctx=await b.newContext({viewport:{width:1400,height:1000}});
  const p=await ctx.newPage();

  await p.goto('https://play.blooket.com/play',{waitUntil:'domcontentloaded',timeout:15000});
  await p.waitForTimeout(3000);
  await p.evaluate(()=>{document.querySelectorAll('button').forEach(b=>{if(b.textContent.includes('Accept All'))b.click()})});
  await p.waitForTimeout(2000);
  await p.locator('input[name=join-code]').click();await p.keyboard.type(PIN,{delay:80});
  await p.locator('button.FormSubmitButton_submitButton__MK2LJ').click();await p.waitForTimeout(8000);
  try{
    const inputs=await p.$$('input');
    for(const i of inputs){const vis=await i.isVisible();if(vis){await i.click();await p.keyboard.type('Fin'+Math.floor(Math.random()*9000),{delay:50});break}}
    await p.locator('[class*=joinButton]').click();await p.waitForTimeout(5000);
  }catch(e){}
  console.log('URL:',p.url());
  await p.waitForTimeout(10000);
  console.log('URL2:',p.url());

  // FINAL APPROACH: unfiltered wF, filter outside
  const r=await p.evaluate(()=>{
    function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
    for(var el of document.querySelectorAll('*')){
      var k=Object.keys(el).filter(x=>x.indexOf('__react')===0);if(!k.length)continue;
      var s=wF(el[k[0]],0);if(!s)continue;
      // Filter: look for game-related data
      var hasGame=Object.keys(s).some(function(k){return k==='question'||k==='stage'||k==='gold'||k==='choices'||k==='players'||k==='weight'||k==='crypto'});
      if(!hasGame)continue;
      // Found!
      if(s.question&&(s.question.question||s.question.question||s.question.text)){
        var correct=s.question.correctAnswers?(Array.isArray(s.question.correctAnswers)?s.question.correctAnswers.join(','):s.question.correctAnswers):'?';
        s.choices&&s.choices.forEach(function(c){if(c.correct===true)correct+=';'+c.text});
        return JSON.stringify({Q:s.question.question||s.question.text,A:correct,stage:s.stage,gold:s.gold,elCount:document.querySelectorAll('[class*=answerContainer]').length});
      }
      return JSON.stringify({stage:s.stage||Object.keys(s).slice(0,5).join(','),gold:s.gold,path:location.pathname});
    }
    return JSON.stringify({none:true,path:location.pathname});
  });
  console.log('RESULT:',r);
  
  await p.screenshot({path:'/tmp/final-v4.png'});
  await b.close();
})();
