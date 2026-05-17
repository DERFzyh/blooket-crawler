const {chromium}=require('playwright-extra');
const StealthPlugin=require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());
(async()=>{
  const PIN='7220946';
  const b=await chromium.launch({headless:true,args:['--no-sandbox']});
  const ctx=await b.newContext({viewport:{width:1400,height:1000}});
  const p=await ctx.newPage();
  await p.goto('https://play.blooket.com/play',{waitUntil:'domcontentloaded',timeout:15000});await p.waitForTimeout(3000);
  await p.evaluate(()=>{document.querySelectorAll('button').forEach(b=>{if(b.textContent.includes('Accept All'))b.click()})});await p.waitForTimeout(2000);
  await p.locator('input[name=join-code]').click();await p.keyboard.type(PIN,{delay:80});
  await p.locator('button.FormSubmitButton_submitButton__MK2LJ').click();await p.waitForTimeout(8000);
  try{const inputs=await p.$$('input');for(const i of inputs){const vis=await i.isVisible();if(vis){await i.click();await p.keyboard.type('Ca'+Math.floor(Math.random()*9000),{delay:50});break}}await p.locator('[class*=joinButton]').click();await p.waitForTimeout(5000)}catch(e){}
  console.log('URL:',p.url());
  await p.waitForTimeout(8000);
  
  // Check answer elements in Crypto Hack
  const dom=await p.evaluate(()=>{
    var all=[];
    document.querySelectorAll('[class*="answer"],div').forEach(function(c,i){
      if(c.offsetHeight>0&&c.offsetHeight<200&&(c.textContent||'').trim().length<=5)all.push({i:i,cls:c.className.slice(0,60),text:(c.textContent||'').trim()});
    });
    var answerContainer=document.querySelectorAll('[class*="answerContainer"]').length;
    var answerText=document.querySelectorAll('[class*="answerText"]').length;
    var choice=document.querySelectorAll('[class*="choice"]').length;
    return JSON.stringify({answerContainer,answerText,choice,sampleAnswers:all.slice(0,8)});
  });
  console.log('DOM:',dom);
  
  await p.screenshot({path:'/tmp/crypto-dom.png'});
  await b.close();
})();
