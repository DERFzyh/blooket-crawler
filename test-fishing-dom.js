const {chromium}=require('playwright-extra');
const StealthPlugin=require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());
(async()=>{
  const PIN='6055401';
  const b=await chromium.launch({headless:true,args:['--no-sandbox']});
  const ctx=await b.newContext({viewport:{width:1400,height:1000}});
  const p=await ctx.newPage();
  await p.goto('https://play.blooket.com/play',{waitUntil:'domcontentloaded',timeout:15000});await p.waitForTimeout(3000);
  await p.evaluate(()=>{document.querySelectorAll('button').forEach(b=>{if(b.textContent.includes('Accept All'))b.click()})});await p.waitForTimeout(2000);
  await p.locator('input[name=join-code]').click();await p.keyboard.type(PIN,{delay:80});
  await p.locator('button.FormSubmitButton_submitButton__MK2LJ').click();await p.waitForTimeout(8000);
  try{const inputs=await p.$$('input');for(const i of inputs){const vis=await i.isVisible();if(vis){await i.click();await p.keyboard.type('Diag'+Math.floor(Math.random()*9000),{delay:50});break}}await p.locator('[class*=joinButton]').click();await p.waitForTimeout(5000)}catch(e){}
  console.log('URL:',p.url());
  await p.waitForTimeout(5000);

  // Inject auto-answer with logging
  await p.evaluate(()=>{(function(){
    window.__fishingLog=[];
    if(window.__aaId)clearInterval(window.__aaId);
    window.__aaId=setInterval(function(){
      try{
        function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
        for(var el of document.querySelectorAll('*')){
          var k=Object.keys(el).filter(x=>x.indexOf('__react')===0);if(!k.length)continue;
          var s=wF(el[k[0]],0);if(!s)continue;
          var hg=Object.keys(s).some(k=>k==='question'||k==='stage'||k==='gold'||k==='weight');
          if(!hg)continue;
          var qt=s.question&&(s.question.question||s.question.text);
          
          // Answer
          if(qt&&s.question.correctAnswers){
            var ca=Array.isArray(s.question.correctAnswers)?s.question.correctAnswers:[s.question.correctAnswers];
            document.querySelectorAll('[class*="answerContainer"]').forEach(function(c){
              var t=(c.textContent||'').trim();
              if(ca.some(function(a){return(a||'').toString().trim()===t})&&c.offsetHeight>0)c.click();
            });
          }
          
          // During fishing phase - log ALL visible clickables
          if(!qt&&(s.weight!==undefined)){
            window.__fishingLog.push({stage:s.stage,weight:s.weight,isFrenzy:s.isFrenzy});
            // Find and dump all visible elements with click-related classes
            var allClicks=[];
            document.querySelectorAll('[class*=cast],[class*=Cast],[class*=fish],[class*=Fish],[class*=reel],[class*=Reel],[role=button],button').forEach(function(c){
              if(c.offsetHeight>0)allClicks.push({cls:c.className.slice(0,50),text:(c.textContent||'').trim().slice(0,30),tag:c.tagName});
            });
            if(allClicks.length>0)window.__fishingLog.push('CLICKABLES:'+JSON.stringify(allClicks));
            // Click them
            document.querySelectorAll('[class*=cast],[class*=Cast],[class*=fish],[class*=Fish],[class*=reel],[class*=Reel]').forEach(function(c){if(c.offsetHeight>0)c.click()});
          }
          break;
        }
      }catch(e){window.__fishingLog.push('err:'+e.message)}
    },600);
  })()});
  console.log('AA+logging injected');
  
  await p.waitForTimeout(8000);
  const logs=await p.evaluate(()=>JSON.stringify(window.__fishingLog||[]));
  console.log('Fishing logs:',logs.slice(0,3000));
  
  await p.screenshot({path:'/tmp/fishing-dom-debug.png'});
  await b.close();
})();
