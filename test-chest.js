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
  try{const inputs=await p.$$('input');for(const i of inputs){const vis=await i.isVisible();if(vis){await i.click();await p.keyboard.type('Chest'+Math.floor(Math.random()*9000),{delay:50});break}}await p.locator('[class*=joinButton]').click();await p.waitForTimeout(5000)}catch(e){}
  await p.waitForTimeout(10000);
  console.log('URL:',p.url());

  // Inject chest-focused auto-answer + logging
  await p.evaluate(()=>{(function(){
    window.__cbLog=[];
    if(window.__aaId)clearInterval(window.__aaId);
    window.__aaId=setInterval(function(){
      try{
        function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
        for(var el of document.querySelectorAll('*')){
          var k=Object.keys(el).filter(function(x){return x.indexOf('__react')===0});if(!k.length)continue;
          var s=wF(el[k[0]],0);if(!s)continue;
          var hg=Object.keys(s).some(function(k){return k==='question'||k==='stage'||k==='gold'||k==='chests'||k==='choices'});
          if(!hg)continue;
          
          // Log full state for chest analysis
          if(s.chests||s.choices){
            var info={stage:s.stage,gold:s.gold};
            if(s.chests){info.chests=s.chests.length;info.chestData=s.chests.slice(0,5).map(function(c){return{cgold:c.gold||c.amount||0,text:c.text||'',correct:c.correct,keys:Object.keys(c).slice(0,6)}})}
            if(s.choices){info.choices=s.choices.slice(0,5).map(function(c){return{cgold:c.gold||c.amount||c.reward?.gold||0,text:c.text||c.question||'',correct:c.correct}})}
            window.__cbLog.push(info);
          }
          
          var qt=s.question&&(s.question.question||s.question.text);
          // Click answer
          if(qt&&s.question.correctAnswers){
            var ca=Array.isArray(s.question.correctAnswers)?s.question.correctAnswers:[s.question.correctAnswers];
            document.querySelectorAll('[class*="answerContainer"]').forEach(function(c){
              var t=(c.textContent||'').trim();
              if(ca.some(function(a){return(a||'').toString().trim()===t})&&c.offsetHeight>0)c.click();
            });
          }
          
          // Chests - find best one and click
          var chestEls=document.querySelectorAll('[class*="chest"],[class*="Chest"]');
          if(chestEls.length>=3&&s.gold!==undefined){
            window.__cbLog.push('CHEST PHASE: found '+chestEls.length+' chest elements');
            // Try to read gold amounts from DOM
            var amounts=[];
            chestEls.forEach(function(c){
              var t=c.textContent||'';var m=t.match(/(\d+)/);amounts.push(m?parseInt(m[1]):0);
            });
            window.__cbLog.push('Chest amounts:'+JSON.stringify(amounts));
            // Click the one with most gold
            var best=0,bestIdx=0;
            amounts.forEach(function(a,i){if(a>best){best=a;bestIdx=i}});
            if(best>0){chestEls[bestIdx].click();window.__cbLog.push('Clicked chest #'+bestIdx+' with '+best+' gold')}
            else{chestEls[0].click();window.__cbLog.push('Clicked first chest')}
          }
          
          // Next button
          document.querySelectorAll('button:not([disabled])').forEach(function(c){if(c.offsetHeight>0)c.click()});
          document.querySelectorAll('[role=button]').forEach(function(c){if(c.offsetHeight>0)c.click()});
          break;
        }
      }catch(e){window.__cbLog.push('err:'+e.message)}
    },800);
  })()});
  console.log('AA+Chest injected');
  await p.waitForTimeout(8000);
  
  const logs=await p.evaluate(()=>JSON.stringify(window.__cbLog||[]));
  console.log('Chest logs:',logs.slice(0,2000));
  
  // Dump chest state
  const chestState=await p.evaluate(()=>{
    function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
    for(var el of document.querySelectorAll('*')){var k=Object.keys(el).filter(function(x){return x.indexOf('__react')===0});if(!k.length)continue;var s=wF(el[k[0]],0);
      if(s&&s.chests)return JSON.stringify({chests:s.chests.map(function(c){return{gold:c.gold||c.amount||0,type:c.type,correct:c.correct,text:c.text,keys:Object.keys(c).slice(0,8)}})});
    }return JSON.stringify({nochests:true});
  });
  console.log('Chest state:',chestState);
  
  await p.screenshot({path:'/tmp/chest-debug.png'});
  await b.close();
})();
