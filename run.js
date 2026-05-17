const {chromium}=require('playwright-extra');
const StealthPlugin=require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());
(async()=>{
  const PIN='1627236';
  const b=await chromium.launch({headless:true,args:['--no-sandbox']});
  const ctx=await b.newContext({viewport:{width:1400,height:1000}});
  const p=await ctx.newPage();

  // Join
  await p.goto('https://play.blooket.com/play',{waitUntil:'domcontentloaded',timeout:15000});
  await p.waitForTimeout(3000);
  await p.evaluate(()=>{document.querySelectorAll('button').forEach(b=>{if(b.textContent.includes('Accept All'))b.click()})});
  await p.waitForTimeout(2000);
  await p.locator('input[name=join-code]').click();await p.keyboard.type(PIN,{delay:80});
  await p.locator('button.FormSubmitButton_submitButton__MK2LJ').click();
  await p.waitForTimeout(8000);
  try{
    const inputs=await p.$$('input');
    for(const i of inputs){const vis=await i.isVisible();if(vis){await i.click();await p.keyboard.type('Bot'+Math.floor(Math.random()*9000),{delay:50});break}}
    await p.locator('[class*=joinButton]').click();await p.waitForTimeout(5000);
  }catch(e){}
  console.log('URL:',p.url());

  // Inject auto-answer v2.4
  await p.evaluate(()=>{(function(){
    if(window.__aaId)clearInterval(window.__aaId);
    window.__aaId=setInterval(function(){
      try{
        function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s&&(s.question||s.stage||s.choices||s.gold!==undefined))return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
        for(var el of document.querySelectorAll('*')){
          var k=Object.keys(el).filter(function(x){return x.indexOf('__react')===0});if(!k.length)continue;
          var s=wF(el[k[0]],0);if(!s)continue;
          var stage=s.stage;
          // Gold Quest: question + choices
          if(s.question&&s.question.text&&s.choices){
            var cr=[];s.choices.forEach(function(c){if(c.correct===true)cr.push(c.text||c.answer)});
            if(s.question.correctAnswers){var a=s.question.correctAnswers;if(!Array.isArray(a))a=[a];cr=cr.concat(a)}
            if(cr.length>0){
              var clicked=false;
              document.querySelectorAll('[class*="answerContainer"]').forEach(function(c){if(clicked)return;if((c.textContent||'').trim()===cr[0]&&c.offsetHeight>0){c.click();clicked=true}});
            }
          }
          // Standard question
          if(stage==='question'&&s.question&&s.question.correctAnswers){
            var correct=Array.isArray(s.question.correctAnswers)?s.question.correctAnswers:[s.question.correctAnswers];
            document.querySelectorAll('[class*="answerContainer"]').forEach(function(c){var t=(c.textContent||'').trim();if(correct.some(function(a){return (a||'').toString().trim()===t})&&c.offsetHeight>0)c.click()});
          }
          // Chests/feedback  
          document.querySelectorAll('[class*=chest],[class*=Chest]').forEach(function(c){if(c.offsetHeight>0&&c.offsetHeight<400)c.click()});
          document.querySelectorAll('[class*="feedback"],[id*="feedback"]').forEach(function(c){if(c.offsetHeight>0)c.click()});
          if(stage||s.question)break;
        }
      }catch(e){}
    },700);
  })()});
  console.log('AA injected');

  // Monitor
  for(let t=0;t<30;t++){
    await p.waitForTimeout(2000);
    const r=await p.evaluate(()=>{
      function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s&&(s.question||s.stage||s.choices||s.gold!==undefined))return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
      for(var el of document.querySelectorAll('*')){var k=Object.keys(el).filter(function(x){return x.indexOf('__react')===0});if(!k.length)continue;var s=wF(el[k[0]],0);
        if(s&&s.question&&s.question.text&&s.choices){var cr=[];s.choices.forEach(function(c){if(c.correct===true)cr.push(c.text||c.answer)});return JSON.stringify({Q:s.question.text,A:cr,gold:s.gold})}
        if(s&&s.question&&s.question.text)return JSON.stringify({Q:s.question.text,gold:s.gold});
      }return JSON.stringify({url:location.href});
    });
    console.log('['+t+']',r);
  }
  await p.screenshot({path:'/tmp/final-fulltest.png'});
  await b.close();
  console.log('DONE');
})().catch(e=>console.error(e.message));
