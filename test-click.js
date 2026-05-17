const {chromium}=require('playwright-extra');
const StealthPlugin=require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());
(async()=>{
  const b=await chromium.launch({headless:true,args:['--no-sandbox']});
  const ctx=await b.newContext({viewport:{width:1400,height:1000}});
  await ctx.addInitScript(()=>{Object.defineProperty(navigator,'webdriver',{get:()=>false})});
  const p=await ctx.newPage();

  await p.goto('https://play.blooket.com/play',{waitUntil:'domcontentloaded',timeout:20000});await p.waitForTimeout(4000);
  await p.evaluate(()=>{document.querySelectorAll('button').forEach(b=>{if(b.textContent.includes('Accept All'))b.click()})});
  await p.waitForTimeout(2000);
  await p.locator('input[name=join-code]').click();await p.keyboard.type('6190889',{delay:80});
  await p.locator('button.FormSubmitButton_submitButton__MK2LJ').click();await p.waitForTimeout(6000);
  try{
    const inputs=await p.$$('input');
    for(const i of inputs){const vis=await i.isVisible();if(vis){await i.click();await p.keyboard.type('ClickT'+Math.floor(Math.random()*9000),{delay:50});break}}
    await p.locator('[class*=joinButton]').click();await p.waitForTimeout(5000);
  }catch(e){}
  console.log('Joined:',p.url());
  await p.waitForTimeout(3000);

  // Step 1: Check state
  const before=await p.evaluate(()=>{
    function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
    for(var el of document.querySelectorAll('*')){
      var k=Object.keys(el).filter(x=>x.indexOf('__react')===0);if(!k.length)continue;
      var s=wF(el[k[0]],0);if(!s)continue;
      if(s.question?.text&&s.choices){
        var cr=[];s.choices.forEach(c=>{if(c.correct===true)cr.push(c.text||c.answer)});
        return JSON.stringify({Q:s.question.text,A:cr,gold:s.gold,answerContainers:document.querySelectorAll('[class*=answerContainer]').length});
      }
    }
    return JSON.stringify({none:true});
  });
  console.log('Before:',before);

  // Step 2: Try clicking the answer element directly
  const clickResult=await p.evaluate(()=>{
    var answerEls=document.querySelectorAll('[class*=answerContainer]');
    var results=[];
    answerEls.forEach(function(el,i){
      results.push({i:i,text:(el.textContent||'').trim(),role:el.getAttribute('role'),visible:el.offsetHeight>0});
    });
    
    // Try clicking the one with text "b"
    var clicked=false;
    answerEls.forEach(function(el){
      if(clicked)return;
      if((el.textContent||'').trim()==='b'&&el.offsetHeight>0){
        el.click();
        clicked=true;
      }
    });
    return JSON.stringify({clicked,results});
  });
  console.log('Click result:',clickResult);
  await p.waitForTimeout(2000);

  // Step 3: Check state after click
  const after=await p.evaluate(()=>{
    function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
    for(var el of document.querySelectorAll('*')){
      var k=Object.keys(el).filter(x=>x.indexOf('__react')===0);if(!k.length)continue;
      var s=wF(el[k[0]],0);if(!s)continue;
      if(s.question?.text)return JSON.stringify({Q:s.question.text,gold:s.gold,stage:s.stage,correct:s.correct});
      return JSON.stringify({s:s.stage||'?',gold:s.gold});
    }
    return JSON.stringify({none:true});
  });
  console.log('After:',after);

  await p.screenshot({path:'/tmp/click-test.png'});
  await b.close();
})();
