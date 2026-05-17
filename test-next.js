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
  try{const inputs=await p.$$('input');for(const i of inputs){const vis=await i.isVisible();if(vis){await i.click();await p.keyboard.type('Clk'+Math.floor(Math.random()*9000),{delay:50});break}}await p.locator('[class*=joinButton]').click();await p.waitForTimeout(5000)}catch(e){}
  await p.waitForTimeout(10000);
  console.log('URL:',p.url());

  // Inject auto-answer that also reports what it's clicking
  await p.evaluate(()=>{(function(){
    window.__aaLog=[];
    if(window.__aaId)clearInterval(window.__aaId);
    window.__aaId=setInterval(function(){
      try{
        function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
        for(var el of document.querySelectorAll('*')){
          var k=Object.keys(el).filter(function(x){return x.indexOf('__react')===0});if(!k.length)continue;
          var s=wF(el[k[0]],0);if(!s)continue;
          var hasGame=Object.keys(s).some(function(k){return k==='question'||k==='stage'||k==='gold'});
          if(!hasGame)continue;
          var qt=s.question&&(s.question.question||s.question.text);
          
          // Click answer
          if(qt&&s.question.correctAnswers){
            var ca=Array.isArray(s.question.correctAnswers)?s.question.correctAnswers:[s.question.correctAnswers];
            var clicked=false;
            document.querySelectorAll('[class*="answerContainer"]').forEach(function(c){
              if(clicked)return;
              var t=(c.textContent||'').trim();
              if(ca.some(function(a){return(a||'').toString().trim()===t})&&c.offsetHeight>0){c.click();clicked=true;window.__aaLog.push('clicked answer: '+t)}
            });
          }
          
          // Click ALL buttons/clickables
          document.querySelectorAll('button:not([disabled])').forEach(function(c){if(c.offsetHeight>0&&c.offsetHeight<400){c.click();window.__aaLog.push('clicked button: '+(c.textContent||'').trim().slice(0,20))}});
          document.querySelectorAll('[role=button]').forEach(function(c){if(c.offsetHeight>0&&c.offsetHeight<300){c.click();window.__aaLog.push('clicked role=button: '+(c.textContent||'').trim().slice(0,20))}});
          document.querySelectorAll('[class*="chest"],[class*="Chest"],[class*="feedback"]').forEach(function(c){if(c.offsetHeight>0){c.click();window.__aaLog.push('clicked feedback/chest')}});
          break;
        }
      }catch(e){window.__aaLog.push('err:'+e.message)}
    },800);
  })()});
  console.log('AA + logging injected');
  await p.waitForTimeout(5000);

  // Get logs
  const logs=await p.evaluate(()=>JSON.stringify(window.__aaLog||[]));
  console.log('AA logs:',logs);
  
  // Get all clickable elements 
  const els=await p.evaluate(()=>{
    var all=[];  
    document.querySelectorAll('button,[role=button]').forEach(function(c,i){
      if(c.offsetHeight>0)all.push({i:i,tag:c.tagName,t:(c.textContent||'').trim().slice(0,30),cls:c.className.slice(0,50),disabled:c.disabled,role:c.getAttribute('role')});
    });
    return JSON.stringify(all);
  });
  console.log('Clickables:',els);
  
  await p.screenshot({path:'/tmp/after-answer.png'});
  await b.close();
})();
