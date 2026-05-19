const {chromium}=require('playwright-extra');
const StealthPlugin=require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());
(async()=>{
  const b=await chromium.launch({headless:true,args:['--no-sandbox']});
  const ctx=await b.newContext({viewport:{width:1400,height:1000}});
  const p=await ctx.newPage();
  
  await p.goto('https://play.blooket.com/play',{waitUntil:'domcontentloaded',timeout:15000});
  await p.waitForTimeout(3000);
  
  // Click Accept All using text selector
  try{await p.click('text="Accept All"',{timeout:3000});console.log('Accept All clicked');await p.waitForTimeout(1000)}catch(e){console.log('no Accept All')}
  try{await p.click('text="Accept"',{timeout:2000});await p.waitForTimeout(500)}catch(e){}
  
  // Type PIN
  await p.locator('input[name=join-code]').click({timeout:5000});
  await p.keyboard.type('7220946',{delay:80});
  console.log('PIN typed');
  
  // Click submit
  await p.locator('button[type=submit]:not([disabled])').first().click({timeout:3000});
  await p.waitForTimeout(6000);
  console.log('After submit:',p.url());
  
  // If on game page, enter name
  if(!p.url().includes('play.blooket.com/play')){
    try{
      const inputs=await p.$$('input');
      for(const i of inputs){
        const vis=await i.isVisible();
        const n=await i.getAttribute('name');
        if(vis&&n!=='join-code'){
          await i.click();
          await p.keyboard.type('Bot'+Math.floor(Math.random()*9000),{delay:50});
          console.log('Name typed');
          break;
        }
      }
      await p.keyboard.press('Enter');
      await p.waitForTimeout(4000);
      console.log('After name:',p.url());
    }catch(e){console.log('Name error:',e.message)}
  }
  
  await p.screenshot({path:'/tmp/join-final.png'});
  await b.close();
  console.log('Done');
})();
