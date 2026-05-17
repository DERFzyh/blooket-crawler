const {chromium}=require('playwright-extra');
const StealthPlugin=require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());
(async()=>{
  const b=await chromium.launch({headless:true,args:['--no-sandbox']});
  const ctx=await b.newContext({viewport:{width:1400,height:1000}});
  await ctx.addInitScript(()=>{
    Object.defineProperty(navigator,'webdriver',{get:()=>false});
    setInterval(()=>{document.querySelectorAll('button').forEach(b=>{if(b.textContent.includes('Accept'))b.click()})},300);
  });
  const p=await ctx.newPage();
  
  await p.goto('https://play.blooket.com/play',{waitUntil:'domcontentloaded',timeout:20000});
  await p.waitForTimeout(5000);
  
  // Get full page structure
  const html=await p.evaluate(()=>{
    // Get all forms and their buttons
    const forms=Array.from(document.forms).map(f=>({
      action:f.action,
      inputs:Array.from(f.querySelectorAll('input')).map(i=>({n:i.name,v:i.value,vis:i.offsetHeight>0})),
      buttons:Array.from(f.querySelectorAll('button,[role=button]')).map(b=>b.textContent.trim())
    }));
    // Get all buttons with click handlers
    const allClickable=Array.from(document.querySelectorAll('button,[role=button]')).map(el=>({
      t:el.textContent.trim().slice(0,40),
      v:el.offsetHeight>0,
      id:el.id,
      cls:el.className.slice(0,60)
    }));
    return JSON.stringify({forms,allClickable,url:location.href});
  });
  console.log('Page structure:',html);
  
  // Try clicking the PIN input then submitting via the form
  await p.click('input[name="join-code"]');
  await p.keyboard.type('4237282',{delay:50});
  
  // Find and click a submit button or press Enter on the active element
  const submitBtn=await p.$('button[type="submit"]');
  if(submitBtn){
    console.log('Found submit button, clicking...');
    await submitBtn.click();
    await p.waitForTimeout(4000);
  } else {
    // Try pressing Enter on the input
    await p.focus('input[name="join-code"]');
    await p.keyboard.press('Enter');
    await p.waitForTimeout(4000);
  }
  console.log('After submit:',p.url());
  
  // If still on play page, check for changes
  if(p.url().includes('/play')){
    const still=await p.evaluate(()=>{
      const inputs=Array.from(document.querySelectorAll('input')).filter(i=>i.offsetHeight>0).map(i=>({n:i.name,ph:i.placeholder,v:i.value}));
      return JSON.stringify({url:location.href,inputs});
    });
    console.log('Still on play:',still);
  }
  
  await p.screenshot({path:'/tmp/play-form-debug.png'});
  await b.close();
})().catch(e=>console.error(e.message));
