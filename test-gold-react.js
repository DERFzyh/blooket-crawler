const {chromium}=require('playwright-extra');
const StealthPlugin=require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());
(async()=>{
  const b=await chromium.launch({headless:true,args:['--no-sandbox']});
  const ctx=await b.newContext({viewport:{width:1400,height:1000}});
  await ctx.addInitScript(()=>{Object.defineProperty(navigator,'webdriver',{get:()=>false})});
  const p=await ctx.newPage();

  // Join same game
  await p.goto('https://play.blooket.com/play',{waitUntil:'domcontentloaded',timeout:20000});await p.waitForTimeout(4000);
  await p.evaluate(()=>{document.querySelectorAll('button').forEach(b=>{if(b.textContent.includes('Accept All'))b.click()})});
  await p.waitForTimeout(2000);
  await p.locator('input[name=join-code]').click();await p.keyboard.type('6331767',{delay:80});
  await p.locator('button.FormSubmitButton_submitButton__MK2LJ').click();
  await p.waitForTimeout(6000);
  
  // Enter name and click join
  try{
    await p.locator('input').first().waitFor({timeout:5000});
    const inputs=await p.$$('input');
    for(const i of inputs){
      const vis=await i.isVisible();
      const t=await i.getAttribute('type');
      if(vis&&t!=='hidden'){
        await i.click();await p.keyboard.type('DebugBot',{delay:50});break;
      }
    }
    await p.locator('[class*=joinButton]').click();
    await p.waitForTimeout(5000);
  }catch(e){}
  console.log('URL:',p.url());

  // Wait for game to start (check if game page loaded)
  await p.waitForTimeout(5000);
  console.log('Current URL:',p.url());

  // Deep React inspection on the game page
  const react=await p.evaluate(()=>{
    const results=[];
    const allEls=document.querySelectorAll('*');
    for(const el of allEls){
      const keys=Object.keys(el).filter(k=>k.startsWith('__react'));
      if(!keys.length)continue;
      let node=el[keys[0]];
      for(let i=0;i<50&&node;i++){
        try{
          const s=node.stateNode?.state;
          if(s){
            const info={};
            Object.keys(s).forEach(k=>{if(s[k]!==undefined&&s[k]!==null&&typeof s[k]!=='function')info[k]=typeof s[k]==='object'?'[obj]':String(s[k]).slice(0,60)});
            if(Object.keys(info).length>0)results.push(info);
          }
        }catch(e){}
        if(node.child){node=node.child;continue}
        if(node.sibling){node=node.sibling;continue}
        node=node.return;
        while(node&&!node.sibling)node=node.return;
        if(node)node=node.sibling;
        if(results.length>10)break;
      }
      if(results.length>10)break;
    }
    return JSON.stringify({results:results.slice(0,10),path:location.pathname,iframe:!!document.querySelector('iframe')});
  });
  console.log('React states:',react);

  await p.screenshot({path:'/tmp/gold-inspect.png'});
  await b.close();
})().catch(e=>console.error(e.message));
