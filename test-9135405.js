const {chromium}=require('playwright-extra');
const StealthPlugin=require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());
(async()=>{
  const PIN='9135405';
  const b=await chromium.launch({headless:true,args:['--no-sandbox']});
  const ctx=await b.newContext({viewport:{width:1400,height:1000}});
  const p=await ctx.newPage();
  await p.goto('https://play.blooket.com/play',{waitUntil:'domcontentloaded',timeout:15000});await p.waitForTimeout(3000);
  try{await p.click('text="Accept All"',{timeout:3000});await p.waitForTimeout(1000)}catch(e){}
  await p.locator('input[name=join-code]').click();await p.keyboard.type(PIN,{delay:80});
  await p.locator('button[type=submit]:not([disabled])').first().click({timeout:5000});await p.waitForTimeout(6000);
  try{
    const inputs=await p.$$('input');
    for(const i of inputs){const vis=await i.isVisible();const n=await i.getAttribute('name');if(vis&&n!=='join-code'){await i.click();await p.keyboard.type('Bot'+Math.floor(Math.random()*9000),{delay:50});await p.keyboard.press('Enter');break}}
    await p.waitForTimeout(3000);
    try{await p.locator('[class*=joinButton]').first().click({timeout:2000})}catch(e){}
    await p.waitForTimeout(3000);
  }catch(e){}
  console.log('URL:',p.url());
  await p.waitForTimeout(8000);
  
  const fs=require('fs');const src=fs.readFileSync('run5.js','utf8');
  const m=src.match(/window\.__aaId=setInterval\(function\(\).*?\},600\)/s);
  if(m)await p.evaluate('('+m[0]+')');
  console.log('AA from run5.js injected');
  
  let lastQ='';
  for(let t=0;t<15;t++){
    await p.waitForTimeout(2000);
    const r=await p.evaluate(()=>{
      function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
      for(var el of document.querySelectorAll('*')){var k=Object.keys(el).filter(x=>x.indexOf('__react')===0);if(!k.length)continue;var s=wF(el[k[0]],0);
        if(s&&s.question&&(s.question.question||s.question.text))return JSON.stringify({Q:s.question.question||s.question.text,stage:s.stage,weight:s.weight,crypto:s.crypto,gold:s.gold,path:location.pathname});
        if(s&&s.stage)return JSON.stringify({stage:s.stage,weight:s.weight,crypto:s.crypto,path:location.pathname});
      }return JSON.stringify({url:location.href});
    });
    const d=JSON.parse(r);
    if(d.Q&&d.Q!==lastQ){lastQ=d.Q;console.log('Q:',d.Q,'gold:',d.gold,'weight:',d.weight,'crypto:',d.crypto,'stage:',d.stage)}
    else if(d.Q)process.stdout.write('.');
    else console.log(' '+JSON.stringify(d));
  }
  await p.screenshot({path:'/tmp/game-9135405.png'});
  await b.close();
})();
