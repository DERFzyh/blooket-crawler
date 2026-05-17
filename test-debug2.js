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
    for(const i of inputs){const vis=await i.isVisible();if(vis){await i.click();await p.keyboard.type('Q'+Math.floor(Math.random()*9000),{delay:50});break}}
    await p.locator('[class*=joinButton]').click();await p.waitForTimeout(5000);
  }catch(e){}
  console.log('URL:',p.url());
  await p.waitForTimeout(10000);
  console.log('URL2:',p.url());

  // Dump ALL states with the UNFILTERED walker
  const all=await p.evaluate(()=>{
    function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
    var found=[];
    for(var el of document.querySelectorAll('*')){
      var k=Object.keys(el).filter(x=>x.indexOf('__react')===0);if(!k.length)continue;
      var s=wF(el[k[0]],0);
      if(s){found.push({keys:Object.keys(s).slice(0,12),sample:JSON.stringify(s).slice(0,120)});if(found.length>=8)break}
    }
    return JSON.stringify({path:location.pathname,states:found,answerEls:document.querySelectorAll('[class*=answerContainer]').length});
  });
  console.log('States:',all);

  await p.screenshot({path:'/tmp/game-state-debug.png'});
  await b.close();
})();
