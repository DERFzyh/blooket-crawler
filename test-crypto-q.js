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
  try{const inputs=await p.$$('input');for(const i of inputs){const vis=await i.isVisible();if(vis){await i.click();await p.keyboard.type('A'+Math.floor(Math.random()*9000),{delay:50});await p.keyboard.press('Enter');break}}await p.waitForTimeout(3000)}catch(e){}
  console.log('URL:',p.url());
  
  // Wait for question, then dump ALL visible divs and their classes
  for(let t=0;t<10;t++){
    await p.waitForTimeout(2000);
    const r=await p.evaluate(()=>{
      function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
      var hasQ=false;
      for(var el of document.querySelectorAll('*')){var k=Object.keys(el).filter(x=>x.indexOf('__react')===0);if(!k.length)continue;var s=wF(el[k[0]],0);if(s&&s.question&&s.question.correctAnswers){hasQ=true;break}}
      
      if(hasQ){
        // Dump ALL visible divs with their classes
        var all=Array.from(document.querySelectorAll('div,button,[role=button]')).filter(d=>d.offsetHeight>0&&d.offsetHeight<200).map(d=>({t:(d.textContent||'').trim().slice(0,30),c:d.className.slice(0,60),tag:d.tagName}));
        return JSON.stringify({hasQ:true,divs:all.slice(0,15)});
      }
      return JSON.stringify({hasQ:false,path:location.pathname});
    });
    const d=JSON.parse(r);
    if(d.hasQ){console.log('QUESTION ACTIVE. Elements:',JSON.stringify(d.divs,null,1));break}
    process.stdout.write('.');
  }
  await p.screenshot({path:'/tmp/crypto-q-dom.png'});
  await b.close();
})();
