const {chromium}=require('playwright-extra');
const StealthPlugin=require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());
(async()=>{
  const b=await chromium.launch({headless:true,args:['--no-sandbox']});
  const ctx=await b.newContext({viewport:{width:1400,height:1000}});
  await ctx.addInitScript(()=>{Object.defineProperty(navigator,'webdriver',{get:()=>false})});
  const p=await ctx.newPage();

  // Join just like the server does
  await p.goto('https://play.blooket.com/play',{waitUntil:'domcontentloaded',timeout:20000});
  await p.waitForTimeout(4000);
  await p.evaluate(()=>{
    document.querySelectorAll('button').forEach(b=>{if(b.textContent.includes('Accept All'))b.click()});
  });
  await p.waitForTimeout(2000);
  await p.locator('input[name="join-code"]').click();
  await p.keyboard.type('4237282',{delay:80});
  await p.locator('button.FormSubmitButton_submitButton__MK2LJ').click();
  await p.waitForTimeout(6000);
  console.log('After join:',p.url());

  // Enter name
  try{
    await p.locator('input[name="name"]').waitFor({timeout:5000});
    await p.locator('input[name="name"]').click();
    await p.keyboard.type('Bot',{delay:50});
    await p.keyboard.press('Enter');
    await p.waitForTimeout(4000);
  }catch(e){}
  console.log('After name:',p.url());

  // On register page - dump all elements
  if(p.url().includes('register')){
    const info=await p.evaluate(()=>{
      const buttons=Array.from(document.querySelectorAll('button,[role=button]')).map(el=>({
        t:el.textContent.trim().slice(0,50),
        v:el.offsetHeight>0,
        id:el.id,
        cls:el.className.slice(0,50)
      }));
      return JSON.stringify({url:location.href,buttons});
    });
    console.log('Register page:',info);

    // Try clicking any visible button
    const btns=await p.$$('button:not([disabled]), [role=button]');
    for(const btn of btns){
      const vis=await btn.isVisible();
      const txt=await btn.textContent();
      if(vis&&txt.trim()){
        console.log('Clicking:',txt.trim());
        await btn.click();
        await p.waitForTimeout(2000);
        break;
      }
    }
    console.log('After click:',p.url());
    await p.screenshot({path:'/tmp/gold-register.png'});
  }

  await b.close();
})().catch(e=>console.error(e.message));
