const {chromium}=require('playwright-extra');
const StealthPlugin=require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());
(async()=>{
  const PIN='6405804';
  const b=await chromium.launch({headless:true,args:['--no-sandbox']});
  const ctx=await b.newContext({viewport:{width:1400,height:1000}});
  const p=await ctx.newPage();
  p.on('console', msg => {
    if(!msg.text().includes('sentry')&&!msg.text().includes('CSP')&&!msg.text().includes('Permissions-Policy'))
      console.log('🌐', msg.text());
  });
  
  await p.goto('https://play.blooket.com/play',{waitUntil:'domcontentloaded',timeout:15000});
  await p.waitForTimeout(3000);
  await p.evaluate(()=>{document.querySelectorAll('button').forEach(b=>{var t=b.textContent||'';if(t.includes('Accept')||t.includes('Reject'))b.click()})});
  await p.waitForTimeout(2000);
  
  await p.locator('input[name=join-code]').click();
  await p.keyboard.type(PIN,{delay:80});
  console.log('PIN entered');
  
  await p.locator('button[type=submit]:not([disabled])').first().click({timeout:5000});
  await p.waitForTimeout(6000);
  
  // Name
  try{
    const inputs=await p.$$('input');
    for(const i of inputs){
      const vis=await i.isVisible();
      if(vis){
        await i.click();await i.fill('');await p.keyboard.type('Test'+Math.floor(Math.random()*9000),{delay:50});
        console.log('Name entered');
        break;
      }
    }
    await p.keyboard.press('Enter');
    await p.waitForTimeout(5000);
    console.log('After name, URL:',p.url());
  }catch(e){console.log('Name skip:',e.message);}
  
  await p.waitForTimeout(8000);
  console.log('Game URL:',p.url());
  
  // PHASE 1: Handle intro/password selection
  console.log('\n=== Phase 1: Password Selection ===');
  for(let t=0;t<10;t++){
    await p.waitForTimeout(2000);
    const state=await p.evaluate(()=>{
      function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
      for(var el of document.querySelectorAll('*')){
        var k=Object.keys(el).filter(x=>x.indexOf('__react')===0);if(!k.length)continue;
        var s=wF(el[k[0]],0);if(!s)continue;
        if(s.question||s.stage||s.gold!==undefined||s.crypto!==undefined||s.password!==undefined){
          return JSON.stringify({
            stage:s.stage, password:s.password, correctPassword:s.correctPassword,
            passwordOptions:s.passwordOptions?JSON.stringify(s.passwordOptions):null,
            crypto:s.crypto, gold:s.gold,
            question:s.question?(s.question.question||s.question.text):null,
            correctAnswers:s.question?.correctAnswers?JSON.stringify(s.question.correctAnswers):null,
            stateKeys:Object.keys(s).filter(k=>!k.startsWith('_')&&typeof s[k]!=='function').slice(0,15)
          });
        }
      }
      return JSON.stringify({stage:'none'});
    });
    var d=JSON.parse(state);
    console.log(`[${t}] stage:${d.stage} pw:${d.password} correctPw:${d.correctPassword} opts:${d.passwordOptions} crypto:${d.crypto} Q:${d.question} A:${d.correctAnswers}`);
    if(d.stateKeys) console.log(`  Keys: ${d.stateKeys.join(',')}`);
    
    // If intro with password options visible, click one
    if(d.stage==='intro'){
      const clicked=await p.evaluate(()=>{
        // Find password buttons (any visible text-bearing div that's likely a password option)
        var btns=[];
        document.querySelectorAll('div,button,[role=button]').forEach(function(c){
          if(c.offsetHeight>0&&c.offsetHeight<100){
            var t=(c.textContent||'').trim();
            var cn=c.className||'';
            // Password buttons in Crypto Hack have class _button_*
            if(t.length>=3&&t.length<40&&cn.includes('button')&&!cn.includes('Container')){
              btns.push(c);
            }
          }
        });
        if(btns.length>0){
          btns[0].click();
          console.log('[Fix] Clicked password:',(btns[0].textContent||'').trim());
          return true;
        }
        return false;
      });
      if(clicked)console.log('  ✓ Clicked password button');
    }
    
    if(d.question)break; // We've reached questions
  }
  
  // PHASE 2: Now watch for trivia questions and test answer clicking
  console.log('\n=== Phase 2: Question Answering ===');
  let questionsAnswered=0;
  
  for(let t=0;t<30;t++){
    await p.waitForTimeout(2000);
    const r=await p.evaluate(()=>{
      function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
      for(var el of document.querySelectorAll('*')){
        var k=Object.keys(el).filter(x=>x.indexOf('__react')===0);if(!k.length)continue;
        var s=wF(el[k[0]],0);if(!s)continue;
        var hasGame=Object.keys(s).some(function(kk){return kk==='question'||kk==='stage'||kk==='crypto'||kk==='password'});
        if(!hasGame)continue;
        
        var q=s.question&&(s.question.question||s.question.text);
        if(q&&s.question.correctAnswers){
          var ca=Array.isArray(s.question.correctAnswers)?s.question.correctAnswers:[s.question.correctAnswers];
          
          // Find answer elements - try multiple strategies
          var answerEls=[];
          // Strategy 1: answerContainer class
          document.querySelectorAll('[class*="answerContainer"]').forEach(function(c){if(c.offsetHeight>0)answerEls.push({strategy:'answerContainer',text:(c.textContent||'').trim(),cls:c.className})});
          // Strategy 2: answerText class
          document.querySelectorAll('[class*="answerText"],[class*="AnswerText"]').forEach(function(c){if(c.offsetHeight>0)answerEls.push({strategy:'answerText',text:(c.textContent||'').trim(),cls:c.className})});
          // Strategy 3: visible divs with short text
          if(answerEls.length===0){
            document.querySelectorAll('div').forEach(function(c){
              if(c.offsetHeight>0&&c.offsetHeight<200){
                var t=(c.textContent||'').trim();
                if(t.length>0&&t.length<5)answerEls.push({strategy:'shortDiv',text:t,cls:c.className});
              }
            });
          }
          
          return JSON.stringify({
            stage:s.stage, Q:q, A:ca.map(function(a){return(a||'').toString().trim()}),
            crypto:s.crypto, gold:s.gold,
            answerEls:answerEls.slice(0,6)
          });
        }
        
        if(s.password!==undefined&&s.passwordOptions&&s.passwordOptions.length>0){
          return JSON.stringify({stage:'guessing',crypto:s.crypto,password:s.password,options:s.passwordOptions});
        }
        
        return JSON.stringify({stage:s.stage||'playing',crypto:s.crypto,gold:s.gold});
      }
      return JSON.stringify({stage:'none'});
    });
    
    var d=JSON.parse(r);
    
    if(d.Q&&d.A){
      console.log(`\n❓ Question #${++questionsAnswered}: ${d.Q}`);
      console.log(`✅ Answer: ${d.A.join(',')}`);
      console.log(`🎯 Answer elements: ${JSON.stringify(d.answerEls)}`);
      
      // Try different click strategies
      var clicked=false;
      
      // Strategy 1: Click answerContainer with matching text
      if(!clicked){
        clicked=await p.evaluate(()=>{
          function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
          for(var el of document.querySelectorAll('*')){
            var k=Object.keys(el).filter(x=>x.indexOf('__react')===0);if(!k.length)continue;
            var s=wF(el[k[0]],0);if(!s)continue;
            if(!s.question||!s.question.correctAnswers)continue;
            var ca=Array.isArray(s.question.correctAnswers)?s.question.correctAnswers:[s.question.correctAnswers];
            var ans=ca[0]?.toString().trim()||'';
            
            // Try answerContainer
            var els=document.querySelectorAll('[class*="answerContainer"]');
            for(var i=0;i<els.length;i++){
              var t=(els[i].textContent||'').trim();
              if(t.indexOf(ans)>=0&&els[i].offsetHeight>0){
                els[i].click();
                console.log('[Click] answerContainer:',t);
                return true;
              }
            }
            return false;
          }
          return false;
        });
        if(clicked)console.log('  ✓ Strategy 1 (answerContainer) worked');
      }
      
      // Strategy 2: Click any visible div with matching text
      if(!clicked){
        clicked=await p.evaluate(()=>{
          function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
          for(var el of document.querySelectorAll('*')){
            var k=Object.keys(el).filter(x=>x.indexOf('__react')===0);if(!k.length)continue;
            var s=wF(el[k[0]],0);if(!s)continue;
            if(!s.question||!s.question.correctAnswers)continue;
            var ca=Array.isArray(s.question.correctAnswers)?s.question.correctAnswers:[s.question.correctAnswers];
            var ans=ca[0]?.toString().trim()||'';
            
            var all=document.querySelectorAll('div');
            for(var i=0;i<all.length;i++){
              var t=(all[i].textContent||'').trim();
              if(t===ans&&all[i].offsetHeight>0&&all[i].offsetHeight<200){
                all[i].click();
                console.log('[Click] div exact:',t);
                return true;
              }
            }
            // Try indexOf fallback
            for(var j=0;j<all.length;j++){
              var t2=(all[j].textContent||'').trim();
              if(t2.indexOf(ans)>=0&&all[j].offsetHeight>0&&all[j].offsetHeight<200&&t2.length<20){
                all[j].click();
                console.log('[Click] div contains:',t2);
                return true;
              }
            }
            return false;
          }
          return false;
        });
        if(clicked)console.log('  ✓ Strategy 2 (div match) worked');
      }
      
      // Strategy 3: Click all buttons to advance
      if(!clicked){
        clicked=await p.evaluate(()=>{
          var anyClicked=false;
          document.querySelectorAll('[class*="answer"],div[class*="option"],div[class*="choice"]').forEach(function(c){
            if(c.offsetHeight>0&&c.offsetHeight<200){
              c.click();anyClicked=true;
            }
          });
          return anyClicked;
        });
        if(clicked)console.log('  ✓ Strategy 3 (click all answer-like) worked');
      }
      
      if(!clicked)console.log('  ❌ NO click strategy worked!');
    } else if(d.stage==='guessing'){
      console.log(`🔓 Guessing phase: crypto=${d.crypto} pw=${d.password} opts=${JSON.stringify(d.options)}`);
      // Click any password option
      await p.evaluate(()=>{
        var clicked=false;
        document.querySelectorAll('[class*="button"]').forEach(function(c){
          if(clicked)return;
          if(c.offsetHeight>0&&c.offsetHeight<100){
            var t=(c.textContent||'').trim();
            if(t.length>0){c.click();clicked=true;}
          }
        });
      });
    } else {
      process.stdout.write('.');
    }
  }
  
  console.log(`\nTotal questions answered: ${questionsAnswered}`);
  await p.screenshot({path:'/tmp/game-6405804-v3.png'});
  await b.close();
})();
