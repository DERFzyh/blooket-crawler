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
  try{const inputs=await p.$$('input');for(const i of inputs){const vis=await i.isVisible();if(vis){await i.click();await p.keyboard.type('D'+Math.floor(Math.random()*9000),{delay:50});await p.keyboard.press('Enter');break}}await p.waitForTimeout(3000)}catch(e){}
  await p.waitForTimeout(8000);
  console.log('URL:',p.url());
  
  // Dump all visible clickables + answer elements
  const pre=await p.evaluate(()=>{
    var btns=Array.from(document.querySelectorAll('button,[role=button]')).filter(b=>b.offsetHeight>0).map(b=>({text:(b.textContent||'').trim().slice(0,60),cls:b.className.slice(0,60)}));
    var ans=document.querySelectorAll('[class*="answerContainer"]').length;
    var divs=Array.from(document.querySelectorAll('div')).filter(d=>d.offsetHeight>0&&d.offsetHeight<200&&(d.textContent||'').trim().length<10).map(d=>({text:(d.textContent||'').trim(),cls:d.className.slice(0,60)}));
    return JSON.stringify({url:location.href,buttons:btns.slice(0,8),answerContainers:ans,smallDivs:divs.slice(0,8)});
  });
  console.log('Pre:',pre.slice(0,1500));
  
  // Now manually click correct answer
  await p.evaluate(()=>{
    var els=document.querySelectorAll('[class*="answerContainer"],div');
    for(var i=0;i<els.length;i++){
      if((els[i].textContent||'').trim()==='b'&&els[i].offsetHeight>0){els[i].click();return;}
    }
  });
  console.log('Clicked answer');
  await p.waitForTimeout(3000);
  
  // Check what's on the screen after answering
  const post=await p.evaluate(()=>{
    var btns=Array.from(document.querySelectorAll('button,[role=button]')).filter(b=>b.offsetHeight>0).map(b=>({text:(b.textContent||'').trim().slice(0,60),cls:b.className.slice(0,60)}));
    var divs=Array.from(document.querySelectorAll('div')).filter(d=>d.offsetHeight>0&&d.offsetHeight<200&&(d.textContent||'').trim().length<30).map(d=>({text:(d.textContent||'').trim(),cls:d.className.slice(0,60)}));
    return JSON.stringify({url:location.href,buttons:btns.slice(0,8),divs:divs.slice(0,8)});
  });
  console.log('Post:',post.slice(0,1500));
  
  // Click anything to advance
  await p.evaluate(()=>{
    document.querySelectorAll('button,[role=button]').forEach(function(c){if(c.offsetHeight>0)c.click()});
    document.querySelectorAll('div').forEach(function(d){if(d.offsetHeight>0&&d.offsetHeight<400)d.click()});
  });
  await p.waitForTimeout(3000);
  console.log('After advance:',p.url());
  
  // Check state
  const after=await p.evaluate(()=>{
    function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
    for(var el of document.querySelectorAll('*')){var k=Object.keys(el).filter(x=>x.indexOf('__react')===0);if(!k.length)continue;var s=wF(el[k[0]],0);
      if(s&&s.question)return JSON.stringify({Q:s.question.question||s.question.text,stage:s.stage,crypto:s.crypto});
      if(s&&s.stage)return JSON.stringify({stage:s.stage,crypto:s.crypto});
    }return':';
  });
  console.log('After:',after);
  
  await p.screenshot({path:'/tmp/crypto-post-answer.png'});
  await b.close();
})();
