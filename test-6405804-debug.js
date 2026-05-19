const {chromium}=require('playwright-extra');
const StealthPlugin=require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());
(async()=>{
  const PIN='6405804';
  const b=await chromium.launch({headless:true,args:['--no-sandbox']});
  const ctx=await b.newContext({viewport:{width:1400,height:1000}});
  const p=await ctx.newPage();
  
  // Log console messages
  p.on('console', msg => console.log('🌐', msg.text()));
  
  await p.goto('https://play.blooket.com/play',{waitUntil:'domcontentloaded',timeout:15000});await p.waitForTimeout(2000);
  await p.evaluate(()=>{document.querySelectorAll('button').forEach(b=>{var t=b.textContent||'';if(t.includes('Accept')||t.includes('Reject'))b.click()})});
  await p.waitForTimeout(2000);
  await p.locator('input[name=join-code]').click();await p.keyboard.type(PIN,{delay:80});
  await p.locator('button[type=submit]:not([disabled])').first().click({timeout:5000});await p.waitForTimeout(6000);
  try{const inputs=await p.$$('input');for(const i of inputs){const vis=await i.isVisible();if(vis){await i.click();await p.keyboard.type('B'+Math.floor(Math.random()*9000),{delay:50});await p.keyboard.press('Enter');break}}await p.waitForTimeout(3000)}catch(e){}
  await p.waitForTimeout(10000);
  console.log('URL:',p.url());
  
  // Dump game state and answer DOM structure
  for(let t=0;t<15;t++){
    await p.waitForTimeout(2000);
    const r=await p.evaluate(()=>{
      function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
      var result={stage:'none',url:location.href,pathname:location.pathname};
      
      // Try to find game state
      for(var el of document.querySelectorAll('*')){
        var k=Object.keys(el).filter(x=>x.indexOf('__react')===0);if(!k.length)continue;
        var s=wF(el[k[0]],0);
        if(!s)continue;
        
        // Found game state - dump it
        if(s.question||s.stage||s.gold!==undefined||s.weight!==undefined||s.crypto!==undefined){
          result.foundReact=true;
          if(s.question){
            result.question=s.question;
            result.hasCorrectAnswers=!!s.question.correctAnswers;
            result.correctAnswersRaw=JSON.stringify(s.question.correctAnswers);
          }
          result.stage=s.stage;
          result.gold=s.gold;
          result.weight=s.weight;
          result.crypto=s.crypto;
          result.stateKeys=Object.keys(s).slice(0,20);
          
          // Dump answer DOM structure
          var answerEls=[];
          document.querySelectorAll('[class*="answer"],[class*="Answer"],[class*="choice"],[class*="Choice"],[class*="option"],[class*="Option"]').forEach(function(c){
            if(c.offsetHeight>0){
              answerEls.push({tag:c.tagName,text:(c.textContent||'').trim().substring(0,60),classes:(c.className||'').substring(0,80)});
            }
          });
          if(answerEls.length>0)result.answerElements=answerEls;
          
          // Also dump ALL visible clickable buttons/divs
          var visibleBtns=[];
          document.querySelectorAll('div[role=button],button,div[class*="container"]').forEach(function(c){
            if(c.offsetHeight>0&&c.offsetHeight<200){
              var t=(c.textContent||'').trim();
              if(t.length>0&&t.length<80)visibleBtns.push({tag:c.tagName,t:t,classes:(c.className||'').substring(0,60)});
            }
          });
          if(visibleBtns.length>0)result.visibleElements=visibleBtns.slice(0,10);
          
          break;
        }
      }
      return JSON.stringify(result);
    });
    var d=JSON.parse(r);
    console.log('Frame',t,':',JSON.stringify(d,null,2));
    if(d.question)console.log('🎯 QUESTION FOUND!');
    if(d.answerElements)console.log('📋 Answer elements:',d.answerElements.length);
  }
  
  await p.screenshot({path:'/tmp/game-6405804-debug.png'});
  console.log('DONE - screenshot saved');
  await b.close();
})();
