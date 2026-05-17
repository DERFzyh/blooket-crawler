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
  await p.locator('input[name=join-code]').click();await p.keyboard.type('8224222',{delay:80});
  await p.locator('button.FormSubmitButton_submitButton__MK2LJ').click();
  await p.waitForTimeout(6000);
  try{
    const inputs=await p.$$('input');
    for(const i of inputs){const vis=await i.isVisible();if(vis){await i.click();await p.keyboard.type('Inspector'+Math.floor(Math.random()*9000),{delay:50});break}}
    await p.locator('[class*=joinButton]').click();await p.waitForTimeout(5000);
  }catch(e){}
  console.log('URL:',p.url());

  // Wait and check the game page for answer elements
  await p.waitForTimeout(5000);
  
  const dom=await p.evaluate(()=>{
    function walkFiber(node,depth){
      if(!node||depth>50)return null;
      try{const s=node.stateNode?.state;if(s?.stage==='question'&&s?.choices)return s;}catch(e){}
      return walkFiber(node.child,depth+1)||walkFiber(node.sibling,depth+1)||walkFiber(node.return,depth+1);
    }
    let gameState=null;
    for(const el of document.querySelectorAll('*')){
      const keys=Object.keys(el).filter(k=>k.startsWith('__react'));
      if(!keys.length)continue;
      gameState=walkFiber(el[keys[0]],0);
      if(gameState)break;
    }
    
    if(!gameState)return JSON.stringify({error:'no-state',path:location.pathname});
    
    // Find answer DOM elements
    const selectors=['[class*=answer]','[class*=choice]','[class*=option]','[class*=button]','[role=button]','button','div'];
    const found=[];
    for(const sel of selectors){
      const els=document.querySelectorAll(sel);
      if(els.length>=2){
        found.push({sel,count:els.length,samples:Array.from(els).slice(0,4).map(e=>({
          text:e.textContent.trim().slice(0,30),
          cls:e.className.slice(0,60),
          tag:e.tagName
        }))});
      }
    }
    
    return JSON.stringify({
      path:location.pathname,
      choices:gameState.choices.map(c=>({text:c.text||c.answer,correct:c.correct})),
      choiceIndex:gameState.choice,
      questionText:gameState.question?.text||gameState.question?.question,
      candidateElements:found.slice(0,8)
    });
  });
  console.log('DOM analysis:',dom);

  await p.screenshot({path:'/tmp/gold-click-targets.png'});
  await b.close();
})().catch(e=>console.error(e.message));
