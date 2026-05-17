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
  
  console.log('Redirected:',p.url());
  
  // Enter name if on register page
  try{
    const inputs=await p.$$('input');
    for(const i of inputs){const vis=await i.isVisible();if(vis){await i.click();await p.keyboard.type('Bot'+Math.floor(Math.random()*9000),{delay:50});break}}
    await p.locator('[class*=joinButton]').click();await p.waitForTimeout(5000);
  }catch(e){}
  console.log('After join:',p.url());
  
  // Poll game state for 30s
  for(let t=0;t<15;t++){
    await p.waitForTimeout(2000);
    const r=await p.evaluate(()=>{
      function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
      for(var el of document.querySelectorAll('*')){var k=Object.keys(el).filter(x=>x.indexOf('__react')===0);if(!k.length)continue;var s=wF(el[k[0]],0);
        if(s&&Object.keys(s).some(k=>['stage','question','weight','crypto','gold'].indexOf(k)>=0))
          return JSON.stringify({keys:Object.keys(s).slice(0,12),stage:s.stage,weight:s.weight,crypto:s.crypto,gold:s.gold,hasQ:!!s.question});
      }return JSON.stringify({url:location.href});
    });
    const d=JSON.parse(r);
    if(d.stage&&d.stage!=='none')console.log('['+t+'] stage:',d.stage,'weight:',d.weight,'crypto:',d.crypto,'gold:',d.gold);
    else if(d.url)process.stdout.write('.');
  }
  
  // Inject the v2.6 auto-answer from run5.js
  const fs=require('fs');
  const run5=fs.readFileSync('run5.js','utf8');
  const aaMatch=run5.match(/setInterval\(function\(\)\{[\s\S]*?\},600\)/);
  if(aaMatch){
    await p.evaluate('('+aaMatch[0]+')');
    console.log('\nAA injected from run5.js');
  }
  
  // Monitor 40s more
  for(let t=0;t<20;t++){
    await p.waitForTimeout(2000);
    const r=await p.evaluate(()=>{
      function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
      for(var el of document.querySelectorAll('*')){var k=Object.keys(el).filter(x=>x.indexOf('__react')===0);if(!k.length)continue;var s=wF(el[k[0]],0);
        if(s&&s.question&&(s.question.question||s.question.text))return JSON.stringify({Q:s.question.question||s.question.text,stage:s.stage,gold:s.gold,weight:s.weight,crypto:s.crypto});
        if(s&&(s.weight!==undefined||s.crypto!==undefined))return JSON.stringify({stage:s.stage,weight:s.weight,crypto:s.crypto,gold:s.gold});
      }return JSON.stringify({url:location.href});
    });
    console.log('['+t+']',r.slice(0,120));
  }
  await p.screenshot({path:'/tmp/game-6055401.png'});
  await b.close();
})();
