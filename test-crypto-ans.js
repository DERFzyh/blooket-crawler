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
  try{const inputs=await p.$$('input');for(const i of inputs){const vis=await i.isVisible();if(vis){await i.click();await p.keyboard.type('T'+Math.floor(Math.random()*9000),{delay:50});await p.keyboard.press('Enter');break}}await p.waitForTimeout(3000)}catch(e){}
  await p.waitForTimeout(8000);
  console.log('URL:',p.url());
  const dom=await p.evaluate(()=>{
    var ac=document.querySelectorAll('[class*="answer"]').length;
    var allDivs=Array.from(document.querySelectorAll('div')).filter(d=>d.offsetHeight>0&&d.offsetHeight<200)
      .map(d=>({t:(d.textContent||'').trim().slice(0,30),c:d.className.slice(0,50)}));
    var small=allDivs.filter(d=>d.t.length>0&&d.t.length<10);
    return JSON.stringify({url:location.href,ac,small:small.slice(0,10)});
  });
  console.log('DOM:',dom);
  await p.screenshot({path:'/tmp/crypto-answer-dom.png'});
  await b.close();
})();
