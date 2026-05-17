const {chromium}=require('playwright-extra');
const StealthPlugin=require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());
(async()=>{
  const PIN='1649012';
  const b=await chromium.launch({headless:true,args:['--no-sandbox']});
  const ctx=await b.newContext({viewport:{width:1400,height:1000}});
  const p=await ctx.newPage();

  await p.goto('https://play.blooket.com/play',{waitUntil:'domcontentloaded',timeout:15000});await p.waitForTimeout(3000);
  await p.evaluate(()=>{document.querySelectorAll('button').forEach(b=>{if(b.textContent.includes('Accept All'))b.click()})});await p.waitForTimeout(2000);
  await p.locator('input[name=join-code]').click();await p.keyboard.type(PIN,{delay:80});
  await p.locator('button.FormSubmitButton_submitButton__MK2LJ').click();await p.waitForTimeout(8000);
  try{const inputs=await p.$$('input');for(const i of inputs){const vis=await i.isVisible();if(vis){await i.click();await p.keyboard.type('Bot'+Math.floor(Math.random()*9000),{delay:50});break}}await p.locator('[class*=joinButton]').click();await p.waitForTimeout(5000)}catch(e){}
  console.log('URL:',p.url());await p.waitForTimeout(10000);
  console.log('URL2:',p.url());

  // Inject auto-answer with the FIXED question.question text
  await p.evaluate(()=>{(function(){
    if(window.__aaId)clearInterval(window.__aaId);
    window.__aaId=setInterval(function(){
      try{
        function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
        for(var el of document.querySelectorAll('*')){
          var k=Object.keys(el).filter(function(x){return x.indexOf('__react')===0});if(!k.length)continue;
          var s=wF(el[k[0]],0);if(!s)continue;
          var hasGame=Object.keys(s).some(function(k){return k==='question'||k==='stage'||k==='gold'||k==='choices'||k==='players'});
          if(!hasGame)continue;
          // Answer question
          var qt=s.question&&(s.question.question||s.question.text);
          if(qt&&s.question.correctAnswers){
            var ca=Array.isArray(s.question.correctAnswers)?s.question.correctAnswers:[s.question.correctAnswers];
            document.querySelectorAll('[class*="answerContainer"]').forEach(function(c){
              var t=(c.textContent||'').trim();
              if(ca.some(function(a){return(a||'').toString().trim()===t})&&c.offsetHeight>0)c.click();
            });
          }
          // Chests/feedback
          document.querySelectorAll('[class*=chest],[class*=Chest]').forEach(function(c){if(c.offsetHeight>0)c.click()});
          document.querySelectorAll('[class*="feedback"],[id*="feedback"]').forEach(function(c){if(c.offsetHeight>0)c.click()});
          break;
        }
      }catch(e){}
    },600);
  })()});
  console.log('AA injected');

  // Monitor for 40s, tracking question changes to confirm clicks work
  let lastQ='',clickCount=0;
  for(let t=0;t<20;t++){
    await p.waitForTimeout(2000);
    const r=await p.evaluate(()=>{
      function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
      for(var el of document.querySelectorAll('*')){var k=Object.keys(el).filter(function(x){return x.indexOf('__react')===0});if(!k.length)continue;var s=wF(el[k[0]],0);
        if(s&&s.question&&(s.question.question||s.question.text)){
          var correct=s.question.correctAnswers?Array.isArray(s.question.correctAnswers)?s.question.correctAnswers.join(','):s.question.correctAnswers:'?';
          return JSON.stringify({Q:s.question.question||s.question.text,A:correct,gold:s.gold,elCount:document.querySelectorAll('[class*=answerContainer]').length});
        }
      }return JSON.stringify({url:location.href});
    });
    var d=JSON.parse(r);
    if(d.Q&&d.Q!==lastQ){lastQ=d.Q;clickCount++;console.log('🔄 NEW Q:',d.Q,'A:',d.A,'💰:',d.gold)}
    else if(d.Q)process.stdout.write('.');
    else console.log(' '+(d.url||d.stage));
  }
  console.log('\n📊 题目变化:',clickCount,'次');
  await p.screenshot({path:'/tmp/final-result.png'});
  await b.close();
})();
