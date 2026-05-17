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
  
  // Method: Use React's internal value setter to fill the input
  const result=await p.evaluate((pin)=>{
    const input=document.querySelector('input[name="join-code"]');
    if(!input)return 'no-input';
    
    // Get the React internal instance
    const fiberKey=Object.keys(input).find(k=>k.startsWith('__reactFiber'));
    if(!fiberKey)return 'no-fiber';
    
    // Set value through native setter
    const nativeSetter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
    nativeSetter.call(input,pin);
    
    // Fire React's onChange
    const event=new Event('input',{bubbles:true});
    input.dispatchEvent(event);
    const changeEvent=new Event('change',{bubbles:true});
    input.dispatchEvent(changeEvent);
    
    return 'done';
  },'4237282');
  console.log('Fill result:',result);
  
  // Now click the submit button
  await p.click('.FormSubmitButton_submitButton__MK2LJ');
  await p.waitForTimeout(5000);
  console.log('After submit:',p.url());
  
  // If name prompt appears
  const nameInput=await p.$('input[name="name"], input[placeholder*="Your name" i], input:visible');
  if(nameInput&&p.url().includes('/play')){
    console.log('Name input found');
    await p.evaluate((name)=>{
      const input=document.querySelector('input[name="name"]')||document.querySelectorAll('input')[0];
      if(!input)return;
      const ns=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
      ns.call(input,name);
      input.dispatchEvent(new Event('input',{bubbles:true}));
    },'Bot');
    await p.click('.FormSubmitButton_submitButton__MK2LJ');
    await p.waitForTimeout(5000);
    console.log('After name:',p.url());
  }
  
  // If not joined yet, check for the PIN error
  if(p.url().includes('/play')&&!p.url().includes('/')){
    console.log('Still on play. Checking for errors...');
    const errs=await p.$$('[class*=error], [class*=Error]');
    for(const e of errs){console.log('Error:',await e.textContent());}
  }
  
  console.log('Final URL:',p.url());
  await p.screenshot({path:'/tmp/react-join.png'});
  await b.close();
})().catch(e=>console.error(e.message));
