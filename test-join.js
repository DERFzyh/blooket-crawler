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
  
  console.log('Going to play page...');
  await p.goto('https://play.blooket.com/play',{waitUntil:'domcontentloaded',timeout:20000});
  await p.waitForTimeout(4000);
  
  const info=await p.evaluate(()=>{
    const inputs=Array.from(document.querySelectorAll('input')).map(i=>({type:i.type,ph:i.placeholder,name:i.name,vis:i.offsetHeight>0}));
    return JSON.stringify({url:location.href,inputs});
  });
  console.log('Page:',info);
  
  const pins=await p.$$('input');
  console.log('Inputs found:',pins.length);
  for(let i=0;i<pins.length;i++){
    const vis=await pins[i].isVisible();
    const ph=await pins[i].getAttribute('placeholder');
    console.log('Input '+i+': visible='+vis+' placeholder='+ph);
    if(vis){
      await pins[i].click();
      await p.waitForTimeout(500);
      await pins[i].fill('4237282');
      console.log('Filled input '+i);
      break;
    }
  }
  
  await p.keyboard.press('Enter');
  await p.waitForTimeout(4000);
  console.log('After PIN:',p.url());
  
  const nameInputs=await p.$$('input');
  for(let i=0;i<nameInputs.length;i++){
    const vis=await nameInputs[i].isVisible();
    if(vis){
      await nameInputs[i].click();
      await p.waitForTimeout(300);
      await nameInputs[i].fill('Bot');
      console.log('Filled name');
      await p.keyboard.press('Enter');
      break;
    }
  }
  await p.waitForTimeout(3000);
  console.log('After name:',p.url());
  
  await p.screenshot({path:'/tmp/join-debug.png'});
  console.log('Done');
  await b.close();
})().catch(e=>console.error(e.message));
