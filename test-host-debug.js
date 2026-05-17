const {chromium}=require('playwright-extra');
const StealthPlugin=require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

(async()=>{
  const b=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  const ctx=await b.newContext({viewport:{width:1400,height:1000}});
  await ctx.addInitScript(()=>{
    Object.defineProperty(navigator,'webdriver',{get:()=>false});
    setInterval(()=>{document.querySelectorAll('button').forEach(b=>{if(b.textContent?.includes('Accept'))b.click()})},500);
  });
  const p=await ctx.newPage();
  
  // Login
  console.log('Logging in...');
  await p.goto('https://id.blooket.com/login',{waitUntil:'domcontentloaded',timeout:20000});
  await p.waitForTimeout(3000);
  await p.fill('input[name=username]','fred11zyh@outlook.com');
  await p.fill('input[name=password]','ZYH11fred@blooket');
  await p.click('button[type=submit]');
  await p.waitForTimeout(6000);
  console.log('URL:',p.url());
  
  // Go to discover page
  console.log('\nGoing to play area...');
  await p.goto('https://play.blooket.com/play',{waitUntil:'domcontentloaded',timeout:20000});
  await p.waitForTimeout(5000);
  console.log('Play URL:',p.url());
  
  // Check what's on the page
  const pageInfo=await p.evaluate(()=>{
    const buttons=Array.from(document.querySelectorAll('button')).map(b=>({text:b.textContent?.trim().slice(0,60),visible:b.offsetHeight>0}));
    const links=Array.from(document.querySelectorAll('a')).map(a=>({text:a.textContent?.trim().slice(0,60),href:a.href?.slice(0,80)}));
    const imgs=Array.from(document.querySelectorAll('img')).map(i=>({alt:i.alt,src:i.src?.slice(0,80)}));
    return JSON.stringify({buttons,links:links.slice(0,15),imgs:imgs.slice(0,10),title:document.title});
  });
  console.log('Page info:',pageInfo.slice(0,2000));
  
  await p.screenshot({path:'/tmp/host-debug.png'});
  
  // Try to find host button
  console.log('\nLooking for host option...');
  const hostBtn=await p.evaluate(()=>{
    const all=Array.from(document.querySelectorAll('button, a, [role=button]'));
    const host=all.find(el=>{
      const t=(el.textContent||'').toLowerCase();
      return t.includes('host')||t.includes('solo');
    });
    if(host){host.click();return'clicked:'+host.textContent}
    return'not found';
  });
  console.log('Host btn:',hostBtn);
  await p.waitForTimeout(3000);
  console.log('After host click URL:',p.url());
  
  // Check the host page
  const hostInfo=await p.evaluate(()=>{
    const buttons=Array.from(document.querySelectorAll('button')).map(b=>({text:b.textContent?.trim().slice(0,60)}));
    const imgs=Array.from(document.querySelectorAll('img')).map(i=>({alt:i.alt,src:i.src?.slice(0,60)}));
    const allText=document.body?.textContent?.slice(0,1000);
    return JSON.stringify({buttons,imgs:imgs.slice(0,15),text:allText,url:location.href});
  });
  console.log('Host page info:',hostInfo.slice(0,3000));
  await p.screenshot({path:'/tmp/host-debug2.png'});
  
  await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
