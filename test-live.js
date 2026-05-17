const {chromium}=require('playwright-extra');
const StealthPlugin=require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());
(async()=>{
  const b=await chromium.launch({headless:true,args:['--no-sandbox']});
  const ctx=await b.newContext({viewport:{width:1400,height:1000}});
  const p=await ctx.newPage();

  await p.goto('https://play.blooket.com/play',{waitUntil:'domcontentloaded',timeout:20000});await p.waitForTimeout(4000);
  await p.evaluate(()=>{document.querySelectorAll('button').forEach(b=>{if(b.textContent.includes('Accept All'))b.click()})});
  await p.waitForTimeout(2000);
  await p.locator('input[name=join-code]').click();await p.keyboard.type('8487995',{delay:80});
  await p.locator('button.FormSubmitButton_submitButton__MK2LJ').click();await p.waitForTimeout(6000);
  try{
    const inputs=await p.$$('input');
    for(const i of inputs){const vis=await i.isVisible();if(vis){await i.click();await p.keyboard.type('Diag'+Math.floor(Math.random()*9000),{delay:50});break}}
    await p.locator('[class*=joinButton]').click();await p.waitForTimeout(5000);
  }catch(e){}
  console.log('Joined:',p.url());
  await p.waitForTimeout(5000);

  // Check all frames for React state
  const frames=p.frames();
  console.log('Frames:',frames.length, frames.map(f=>f.url().slice(0,80)));
  
  for(const f of frames){
    try{
      const r=await f.evaluate(()=>{
        // Count elements with React keys
        let reactEls=0, hasState=0;
        for(const el of document.querySelectorAll('*')){
          const keys=Object.keys(el).filter(k=>k.startsWith('__react'));
          if(keys.length>0){
            reactEls++;
            if(reactEls<=2){
              let node=el[keys[0]];
              for(let i=0;i<50&&node;i++){
                try{if(node.stateNode?.state){hasState++;break}}catch(e){}
                node=node.return||node.child||node.sibling;
              }
            }
            if(reactEls>5)break;
          }
        }
        return JSON.stringify({url:location.href,reactEls,hasState,title:document.title,bodyLen:document.body?.innerHTML?.length});
      });
      console.log('Frame:',r);
    }catch(e){console.log('Frame err:',e.message.slice(0,80));}
  }

  // Try injecting and running walkFiber directly  
  const raw=await p.evaluate(()=>{
    function walkFiber(node,depth){
      if(!node||depth>50)return null;
      try{const s=node.stateNode?.state;if(s)return s}catch(e){}
      return walkFiber(node.child,depth+1)||walkFiber(node.sibling,depth+1)||walkFiber(node.return,depth+1);
    }
    const found=[];
    for(const el of document.querySelectorAll('*')){
      const keys=Object.keys(el).filter(k=>k.startsWith('__react'));
      if(!keys.length)continue;
      const s=walkFiber(el[keys[0]],0);
      if(s&&Object.keys(s).length>0){
        found.push({keys:Object.keys(s).slice(0,8)});
        if(found.length>=5)break;
      }
    }
    return JSON.stringify({found,url:location.href});
  });
  console.log('Raw state:',raw);

  await p.screenshot({path:'/tmp/gold-live.png'});
  await b.close();
})().catch(e=>console.error(e.message));
