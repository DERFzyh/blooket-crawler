const {chromium}=require('playwright-extra');
const StealthPlugin=require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());
(async()=>{
  const PIN='9135405';
  const b=await chromium.launch({headless:true,args:['--no-sandbox']});
  const ctx=await b.newContext({viewport:{width:1400,height:1000}});
  const p=await ctx.newPage();
  await p.goto('https://play.blooket.com/play',{waitUntil:'domcontentloaded',timeout:15000});await p.waitForTimeout(3000);
  try{await p.click('text="Accept All"',{timeout:3000})}catch(e){}
  await p.waitForTimeout(1000);
  await p.locator('input[name=join-code]').click();await p.keyboard.type(PIN,{delay:80});
  await p.locator('button[type=submit]:not([disabled])').first().click({timeout:5000});await p.waitForTimeout(6000);
  try{const inputs=await p.$$('input');for(const i of inputs){const vis=await i.isVisible();if(vis){await i.click();await p.keyboard.type('X'+Math.floor(Math.random()*9000),{delay:50});await p.keyboard.press('Enter');break}}await p.waitForTimeout(3000)}catch(e){}
  console.log('URL:',p.url());
  await p.waitForTimeout(5000);
  
  // Check what clickable elements are on the intro/game screen
  const dom=await p.evaluate(()=>{
    var btns=Array.from(document.querySelectorAll('button,[role=button]')).filter(b=>b.offsetHeight>0).map(b=>({text:(b.textContent||'').trim().slice(0,40),cls:b.className.slice(0,60),disabled:b.disabled}));
    var imgs=Array.from(document.querySelectorAll('img')).map(i=>({src:i.src.slice(-50),alt:i.alt,cls:i.className.slice(0,60)}));
    return JSON.stringify({url:location.href,buttons:btns.slice(0,10),imgs:imgs.slice(0,5)});
  });
  console.log('DOM:',dom.slice(0,1500));
  
  await p.screenshot({path:'/tmp/crypto-intro.png'});
  await b.close();
})();
