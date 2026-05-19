const {chromium}=require('playwright-extra');
const StealthPlugin=require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());
(async()=>{
  const PIN='9996877';
  const b=await chromium.launch({headless:true,args:['--no-sandbox']});
  const p=await (await b.newContext({viewport:{width:1400,height:1000}})).newPage();
  await p.goto('https://play.blooket.com/play',{waitUntil:'domcontentloaded',timeout:15000});
  await p.waitForTimeout(2000);
  try{await p.evaluate(()=>{document.querySelectorAll('button').forEach(b=>{if(b.textContent.includes('Accept'))b.click()})})}catch(e){}
  await p.waitForTimeout(1000);
  await p.locator('input[name=join-code]').click();await p.keyboard.type(PIN,{delay:80});
  await p.keyboard.press('Enter');await p.waitForTimeout(6000);
  console.log('Joined, URL:',p.url());
  try{const i=await p.$('input:not([hidden]):not([type=hidden])');if(i&&await i.isVisible()){await i.fill('DebugBot');await p.keyboard.press('Enter');}}catch(e){}
  await p.waitForTimeout(8000);
  console.log('Game URL:',p.url());

  // Dump answer DOM structure for the current question
  for(let t=0;t<10;t++){
    await p.waitForTimeout(2000);
    const r=await p.evaluate(()=>{
      function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
      for(var el of document.querySelectorAll('*')){
        var k=Object.keys(el).filter(x=>x.indexOf('__react')===0);if(!k.length)continue;
        var s=wF(el[k[0]],0);if(!s)continue;
        if(!s.question||!s.question.correctAnswers)continue;
        var q=s.question.question||s.question.text;
        var ca=Array.isArray(s.question.correctAnswers)?s.question.correctAnswers.map(function(a){return(a||'').toString().trim()}):[(s.question.correctAnswers||'').toString().trim()];
        
        // Find ALL elements with "answer" in their class name
        var ansEls=[];
        document.querySelectorAll('[class*="answer"],[class*="Answer"],[class*="choice"],[class*="Choice"],[class*="option"],[class*="Option"],[class*="card"],[class*="Card"]').forEach(function(c){
          if(c.offsetHeight>0)ansEls.push({tag:c.tagName,text:(c.textContent||'').trim().slice(0,40),cls:(c.className||'').slice(0,80)});
        });
        
        // Find ALL visible elements matching the correct answer text
        var matchEls=[];
        document.querySelectorAll('*').forEach(function(c){
          if(!c.offsetHeight||c.offsetHeight>400)return;
          var t=(c.textContent||'').trim();
          if(t.length<3||t.length>100)return;
          if(ca.some(function(a){return t===a||t.indexOf(a)>=0}))matchEls.push({tag:c.tagName,text:t.slice(0,30),cls:(c.className||'').slice(0,80)});
        });
        
        // Find buttons
        var btns=[];
        document.querySelectorAll('button:not([disabled])').forEach(function(c){
          if(c.offsetHeight>0)btns.push({text:(c.textContent||'').trim().slice(0,30),cls:(c.className||'').slice(0,60)});
        });
        
        return JSON.stringify({Q:q,A:ca,ansEls:ansEls.slice(0,8),matchEls:matchEls.slice(0,8),btns:btns.slice(0,8),url:location.href});
      }
      return JSON.stringify({stage:'none'});
    });
    var d=JSON.parse(r);
    if(d.Q){
      console.log(`\n❓ ${d.Q} → ${JSON.stringify(d.A)}`);
      console.log(`🎯 answer-like: ${JSON.stringify(d.ansEls)}`);
      console.log(`📍 text matches: ${JSON.stringify(d.matchEls)}`);
      console.log(`🔘 buttons: ${JSON.stringify(d.btns)}`);
      
      // Try clicking each approach
      if(d.ansEls.length>0){
        var clicked=await p.evaluate(()=>{
          function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
          for(var el of document.querySelectorAll('*')){
            var k=Object.keys(el).filter(x=>x.indexOf('__react')===0);if(!k.length)continue;
            var s=wF(el[k[0]],0);if(!s||!s.question||!s.question.correctAnswers)continue;
            var ans=s.question.correctAnswers[0]?.toString().trim()||'';
            var els=document.querySelectorAll('[class*="answer"]');
            for(var i=0;i<els.length;i++){
              if((els[i].textContent||'').trim().indexOf(ans)>=0&&els[i].offsetHeight>0){els[i].click();console.log('[Debug] clicked answer: '+ans);return true}
            }
          }return false;
        });
        console.log(`  clicked via [class*="answer"]: ${clicked}`);
      }
      
      if(d.matchEls.length>0){
        var c2=await p.evaluate(()=>{
          function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
          for(var el of document.querySelectorAll('*')){
            var k=Object.keys(el).filter(x=>x.indexOf('__react')===0);if(!k.length)continue;
            var s=wF(el[k[0]],0);if(!s||!s.question||!s.question.correctAnswers)continue;
            var ans=s.question.correctAnswers[0]?.toString().trim()||'';
            var all=document.querySelectorAll('*');
            for(var i=0;i<all.length;i++){
              var t=(all[i].textContent||'').trim();
              if(t===ans&&all[i].offsetHeight>0&&all[i].offsetHeight<300){all[i].click();console.log('[Debug] exact-match clicked: '+t);return true}
            }
          }return false;
        });
        console.log(`  clicked via exact match: ${c2}`);
      }
      break; // done
    }
    process.stdout.write('.');
  }
  await p.close();
  await b.close();
})().catch(e=>console.error('FATAL:',e.message));
