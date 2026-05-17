const {chromium}=require('playwright-extra');
const StealthPlugin=require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());
(async()=>{
  const PINS=['5995773','6090638'];
  const NAMES=['Fishing','Crypto'];
  
  for(let g=0;g<2;g++){
    const PIN=PINS[g];
    console.log(`\n=== ${NAMES[g]} (PIN:${PIN}) ===`);
    const b=await chromium.launch({headless:true,args:['--no-sandbox']});
    const ctx=await b.newContext({viewport:{width:1400,height:1000}});
    const p=await ctx.newPage();
    
    await p.goto('https://play.blooket.com/play',{waitUntil:'domcontentloaded',timeout:15000});
    await p.waitForTimeout(3000);
    await p.evaluate(()=>{document.querySelectorAll('button').forEach(b=>{if(b.textContent.includes('Accept All'))b.click()})});
    await p.waitForTimeout(2000);
    await p.locator('input[name=join-code]').click();await p.keyboard.type(PIN,{delay:80});
    await p.locator('button.FormSubmitButton_submitButton__MK2LJ').click();
    await p.waitForTimeout(8000);
    try{
      const inputs=await p.$$('input');
      for(const i of inputs){const vis=await i.isVisible();if(vis){await i.click();await p.keyboard.type('R'+Math.floor(Math.random()*9000),{delay:50});break}}
      await p.locator('[class*=joinButton]').click();await p.waitForTimeout(5000);
    }catch(e){}
    console.log('URL:',p.url());
    
    // Poll for game state over 25s
    for(let t=0;t<12;t++){
      await p.waitForTimeout(2000);
      const r=await p.evaluate(()=>{
        function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
        for(var el of document.querySelectorAll('*')){var k=Object.keys(el).filter(x=>x.indexOf('__react')===0);if(!k.length)continue;var s=wF(el[k[0]],0);
          if(s&&Object.keys(s).some(function(k){return['stage','question','weight','crypto','password','gold'].indexOf(k)>=0}))
            return JSON.stringify({keys:Object.keys(s).slice(0,12),stage:s.stage,weight:s.weight,crypto:s.crypto,gold:s.gold,hasQ:!!s.question});
        }return JSON.stringify({url:location.href});
      });
      console.log(`[${t}]`,r);
    }
    await p.screenshot({path:`/tmp/${NAMES[g]}-monitor.png`});
    await b.close();
  }
})();
