const {chromium}=require('playwright-extra');
const StealthPlugin=require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());
(async()=>{
  const b=await chromium.launch({headless:true,args:['--no-sandbox']});
  const ctx=await b.newContext({viewport:{width:1400,height:1000}});
  await ctx.addInitScript(()=>{Object.defineProperty(navigator,'webdriver',{get:()=>false})});
  const p=await ctx.newPage();

  await p.goto('https://play.blooket.com/play',{waitUntil:'domcontentloaded',timeout:20000});await p.waitForTimeout(4000);
  await p.evaluate(()=>{document.querySelectorAll('button').forEach(b=>{if(b.textContent.includes('Accept All'))b.click()})});
  await p.waitForTimeout(2000);
  await p.locator('input[name=join-code]').click();await p.keyboard.type('8224222',{delay:80});
  await p.locator('button.FormSubmitButton_submitButton__MK2LJ').click();
  await p.waitForTimeout(6000);
  try{
    const inputs=await p.$$('input');
    for(const i of inputs){const vis=await i.isVisible();if(vis){await i.click();await p.keyboard.type('DeepBot'+Math.floor(Math.random()*9000),{delay:50});break}}
    await p.locator('[class*=joinButton]').click();await p.waitForTimeout(5000);
  }catch(e){}
  console.log('URL:',p.url());
  await p.waitForTimeout(5000);

  // Deep inspection of question object
  const deep=await p.evaluate(()=>{
    function walkFiber(node,depth){
      if(!node||depth>50)return null;
      try{const s=node.stateNode?.state;if(s?.stage==='question'&&s?.question?.text)return s;}catch(e){}
      return walkFiber(node.child,depth+1)||walkFiber(node.sibling,depth+1)||walkFiber(node.return,depth+1);
    }
    for(const el of document.querySelectorAll('*')){
      const keys=Object.keys(el).filter(k=>k.startsWith('__react'));
      if(!keys.length)continue;
      const s=walkFiber(el[keys[0]],0);
      if(!s)continue;
      
      const q=s.question;
      if(!q)continue;
      
      // Get ALL properties of the question object
      const qKeys=Object.keys(q);
      const qInfo={};
      qKeys.forEach(k=>{
        const v=q[k];
        if(v===undefined||v===null)return;
        if(typeof v==='function')return;
        if(Array.isArray(v)){
          qInfo[k]=v.slice(0,5).map(item=>{
            if(typeof item==='object'&&item!==null){
              const ik=Object.keys(item).slice(0,8);
              const io={};
              ik.forEach(ik2=>{const iv=item[ik2];if(iv!==undefined&&iv!==null&&typeof iv!=='function')io[ik2]=typeof iv==='object'?'[obj]':iv});
              return io;
            }
            return item;
          });
        }else if(typeof v==='object'){
          qInfo[k]='[obj:'+Object.keys(v).slice(0,5).join(',')+']';
        }else{
          qInfo[k]=v;
        }
      });
      
      // Also check choices at state level
      const cInfo=s.choices?{len:s.choices.length,items:s.choices.slice(0,3).map(c=>({text:c.text||c.answer,correct:c.correct,keys:Object.keys(c).slice(0,6)}))}:null;
      
      return JSON.stringify({
        stage:s.stage,
        question:qInfo,
        choices:cInfo,
        choice:s.choice,
        correct:s.correct,
        gold:s.gold,
        // Find clickable answer elements
        answerElements:Array.from(document.querySelectorAll('[class*=answerContainer]')).map(e=>({text:e.textContent.trim().slice(0,20),role:e.getAttribute('role'),clickable:e.onclick!==null||e.getAttribute('role')==='button'}))
      });
    }
    return JSON.stringify({error:'no-state',path:location.pathname});
  });
  console.log('Deep:',deep);

  await p.screenshot({path:'/tmp/gold-deep-question.png'});
  await b.close();
})().catch(e=>console.error(e.message));
