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
    for(const i of inputs){const vis=await i.isVisible();if(vis){await i.click();await p.keyboard.type('Bot'+Math.floor(Math.random()*9000),{delay:50});break}}
    await p.locator('[class*=joinButton]').click();await p.waitForTimeout(5000);
  }catch(e){}
  console.log('URL:',p.url());
  await p.waitForTimeout(5000);

  // Inject auto-answer with FIXED walker (deeper search)
  await p.evaluate(()=>{(function(){
    if(window.__aaId)clearInterval(window.__aaId);
    window.__aaId=setInterval(function(){
      try{
        function wF(n,d){
          if(!n||d>100)return null;
          try{
            var s=n.stateNode?.state;
            if(s&&Object.keys(s).some(function(k){return k==='question'||k==='stage'||k==='gold'||k==='choices'||k==='players'}))return s;
          }catch(e){}
          var r=wF(n.child,d+1);if(r)return r;
          r=wF(n.sibling,d+1);if(r)return r;
          return wF(n.return,d+1);
        }
        for(var el of document.querySelectorAll('*')){
          var k=Object.keys(el).filter(function(x){return x.indexOf('__react')===0});if(!k.length)continue;
          var s=wF(el[k[0]],0);if(!s)continue;
          // Answer question
          if(s.question&&s.question.correctAnswers){
            var ca=Array.isArray(s.question.correctAnswers)?s.question.correctAnswers:[s.question.correctAnswers];
            document.querySelectorAll('[class*="answerContainer"]').forEach(function(c){
              var t=(c.textContent||'').trim();
              if(ca.some(function(a){return (a||'').toString().trim()===t})&&c.offsetHeight>0)c.click();
            });
          }
          // Chests/feedback
          document.querySelectorAll('[class*=chest],[class*=Chest]').forEach(function(c){if(c.offsetHeight>0&&c.offsetHeight<400)c.click()});
          document.querySelectorAll('[class*="feedback"],[id*="feedback"]').forEach(function(c){if(c.offsetHeight>0)c.click()});
          break;
        }
      }catch(e){}
    },700);
  })()});
  console.log('AA injected');

  // Monitor
  for(let t=0;t<25;t++){
    await p.waitForTimeout(2000);
    const r=await p.evaluate(()=>{
      function wF(n,d){
        if(!n||d>100)return null;
        try{var s=n.stateNode?.state;if(s&&Object.keys(s).some(function(k){return k==='question'||k==='stage'||k==='gold'||k==='choices'||k==='players'}))return s}catch(e){}
        var r=wF(n.child,d+1);if(r)return r;
        r=wF(n.sibling,d+1);if(r)return r;
        return wF(n.return,d+1);
      }
      for(var el of document.querySelectorAll('*')){var k=Object.keys(el).filter(function(x){return x.indexOf('__react')===0});if(!k.length)continue;var s=wF(el[k[0]],0);
        if(s&&s.question&&s.question.text)return JSON.stringify({Q:s.question.question||s.question.text,stage:s.stage,gold:s.gold,correct:Array.isArray(s.question.correctAnswers)?s.question.correctAnswers.join(','):s.question.correctAnswers});
      }return JSON.stringify({url:location.href});
    });
    console.log('['+t+']',r);
  }
  await p.screenshot({path:'/tmp/final-v3.png'});
  await b.close();
  console.log('DONE');
})().catch(e=>console.error(e.message));
