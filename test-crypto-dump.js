const {chromium}=require('playwright-extra');
const StealthPlugin=require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());
(async()=>{
  const PIN='9135405';
  const b=await chromium.launch({headless:true,args:['--no-sandbox']});
  const ctx=await b.newContext({viewport:{width:1400,height:1000}});
  const p=await ctx.newPage();
  await p.goto('https://play.blooket.com/play',{waitUntil:'domcontentloaded',timeout:15000});await p.waitForTimeout(2000);
  await p.evaluate(()=>{document.querySelectorAll('button').forEach(b=>{var t=b.textContent||'';if(t.includes('Accept')||t.includes('Reject'))b.click()})});
  await p.waitForTimeout(2000);
  await p.locator('input[name=join-code]').click();await p.keyboard.type(PIN,{delay:80});
  await p.locator('button[type=submit]:not([disabled])').first().click({timeout:5000});await p.waitForTimeout(6000);
  try{const inputs=await p.$$('input');for(const i of inputs){const vis=await i.isVisible();if(vis){await i.click();await p.keyboard.type('Z'+Math.floor(Math.random()*9000),{delay:50});await p.keyboard.press('Enter');break}}await p.waitForTimeout(3000)}catch(e){}
  await p.waitForTimeout(5000);
  console.log('URL:',p.url());
  
  // Wait for question, inject a ONE-TIME evaluator
  await p.evaluate(()=>{
    window.__dumpInterval=setInterval(()=>{
      function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
      var hasQ=false;
      for(var el of document.querySelectorAll('*')){var k=Object.keys(el).filter(function(x){return x.indexOf('__react')===0});if(!k.length)continue;var s=wF(el[k[0]],0);if(s&&s.question&&s.question.correctAnswers){hasQ=true;break}}
      if(hasQ){
        var all=Array.from(document.querySelectorAll('*')).filter(function(d){return d.offsetHeight>0&&d.offsetHeight<200}).map(function(d){return(d.textContent||'').trim().slice(0,40)+' ['+d.className.slice(0,40)+']'+' <'+d.tagName+'>'});
        window.__dumped=all.slice(0,20);
        clearInterval(window.__dumpInterval);
      }
    },500);
  });
  
  // Wait for dump
  for(let t=0;t<15;t++){
    await p.waitForTimeout(1000);
    const dumped=await p.evaluate(()=>window.__dumped);
    if(dumped){console.log('DUMPED:');dumped.forEach(l=>console.log(' ',l));break}
    process.stdout.write('.');
  }
  await p.screenshot({path:'/tmp/crypto-all-els.png'});
  await b.close();
})();
