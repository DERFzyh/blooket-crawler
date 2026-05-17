const {chromium}=require('playwright-extra');
const StealthPlugin=require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

(async()=>{
  const b=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  const ctx=await b.newContext({viewport:{width:1400,height:1000}});
  await ctx.addInitScript(()=>{
    Object.defineProperty(navigator,'webdriver',{get:()=>false});
  });
  
  // Pre-set cookie consent
  await ctx.addCookies([{
    name: 'cookieyes-consent',
    value: 'consentid:Z2xOMXpOWUdHaUNiMUtUUU1tZnkxa0VkYWhydHBmSHc,consent:yes,action:yes,necessary:yes,functional:yes,analytics:yes,performance:yes,advertisement:yes,other:yes',
    domain: '.blooket.com',
    path: '/'
  }]);
  
  const p=await ctx.newPage();
  
  // Login
  console.log('Logging in...');
  await p.goto('https://id.blooket.com/login',{waitUntil:'domcontentloaded',timeout:20000});
  await p.waitForTimeout(3000);
  
  // Dismiss any cookie popup first
  await p.evaluate(()=>{document.querySelectorAll('button').forEach(b=>{if(b.textContent?.includes('Accept'))b.click()})});
  await p.waitForTimeout(1000);
  
  await p.fill('input[name=username]','fred11zyh@outlook.com');
  await p.fill('input[name=password]','ZYH11fred@blooket');
  await p.click('button[type=submit]');
  await p.waitForTimeout(6000);
  console.log('URL:',p.url());
  
  // Try different host URLs
  const urls=[
    'https://play.blooket.com/host',
    'https://play.blooket.com/host?id=685d405f64022b0fbe8ac753',
  ];
  
  for(const url of urls){
    console.log(`\nTrying: ${url}`);
    await p.goto(url,{waitUntil:'domcontentloaded',timeout:15000});
    await p.waitForTimeout(3000);
    
    // Dismiss cookie consent
    await p.evaluate(()=>{document.querySelectorAll('button').forEach(b=>{if(b.textContent?.includes('Accept'))b.click()})});
    await p.waitForTimeout(1000);
    
    console.log('End URL:',p.url());
    
    const info=await p.evaluate(()=>{
      const buttons=Array.from(document.querySelectorAll('button')).filter(b=>b.offsetHeight>0).map(b=>b.textContent?.trim().slice(0,80));
      const imgs=Array.from(document.querySelectorAll('img')).filter(i=>i.offsetHeight>0).map(i=>({alt:i.alt?.slice(0,60),src:i.src?.slice(0,80)}));
      const inputs=Array.from(document.querySelectorAll('input')).map(i=>({placeholder:i.placeholder,name:i.name}));
      return JSON.stringify({buttons:buttons.slice(0,20),imgs:imgs.slice(0,10),inputs,title:document.title});
    });
    console.log('Page info:',info.slice(0,2000));
    
    await p.screenshot({path:`/tmp/host-${url.includes('?id=')?'withid':'noid'}.png`});
    
    // If we see game mode images, try to host
    if(info.includes('Select')){
      console.log('Found game mode selection!');
      break;
    }
  }
  
  // Now try to navigate from dashboard to host
  console.log('\n\nTrying dashboard route...');
  await p.goto('https://dashboard.blooket.com/my-sets',{waitUntil:'domcontentloaded',timeout:15000});
  await p.waitForTimeout(3000);
  await p.evaluate(()=>{document.querySelectorAll('button').forEach(b=>{if(b.textContent?.includes('Accept'))b.click()})});
  await p.waitForTimeout(1000);
  
  const dashInfo=await p.evaluate(()=>{
    const buttons=Array.from(document.querySelectorAll('button, a, [role=button]')).filter(b=>b.offsetHeight>0).map(b=>({
      tag:b.tagName,text:b.textContent?.trim().slice(0,60),href:b.href?.slice(0,100)
    }));
    return JSON.stringify({buttons:buttons.slice(0,20),url:location.href,title:document.title});
  });
  console.log('Dashboard:',dashInfo.slice(0,3000));
  await p.screenshot({path:'/tmp/dashboard-debug.png'});
  
  await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
