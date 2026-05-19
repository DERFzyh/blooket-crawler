const {chromium}=require('playwright-extra');
const StealthPlugin=require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());
(async()=>{
  const PIN='6888281';
  const b=await chromium.launch({headless:true,args:['--no-sandbox']});
  const p=await (await b.newContext({viewport:{width:1400,height:1000}})).newPage();
  p.on('console', msg => { var t=msg.text(); if(t.includes('[Bot]')||t.includes('[Mon]'))console.log('🌐',t); });
  
  await p.goto('https://play.blooket.com/play',{waitUntil:'domcontentloaded',timeout:15000});
  await p.waitForTimeout(2000);
  try{await p.evaluate(()=>{document.querySelectorAll('button').forEach(b=>{if(b.textContent.includes('Accept'))b.click()})})}catch(e){}
  await p.waitForTimeout(1000);
  await p.locator('input[name=join-code]').click();await p.keyboard.type(PIN,{delay:80});
  await p.keyboard.press('Enter');await p.waitForTimeout(6000);
  try{const i=await p.$('input:not([hidden]):not([type=hidden])');if(i&&await i.isVisible()){await i.fill('ChestBot');await p.keyboard.press('Enter');}}catch(e){}
  await p.waitForTimeout(8000);
  console.log('URL:',p.url());
  
  // Inject answer bot that also dumps state when non-question
  await p.evaluate(()=>{(function(){
    if(window.__aaId)clearInterval(window.__aaId);
    window.__aaLastQ='';window.__aaLastPw='';window.__aaStats={q:0};
    window.__aaId=setInterval(function(){
      try{
        function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
        for(var el of document.querySelectorAll('*')){
          var k=Object.keys(el).filter(x=>x.indexOf('__react')===0);if(!k.length)continue;
          var s=wF(el[k[0]],0);if(!s)continue;
          var hasGame=Object.keys(s).some(function(k){return k==='question'||k==='stage'||k==='gold'||k==='choices'||k==='weight'||k==='lure'||k==='crypto'||k==='password'||k==='correctPassword'});
          if(!hasGame)continue;
          var qt=s.question&&(s.question.question||s.question.text);
          var weight=s.weight,lure=s.lure,pwOpts=s.passwordOptions;
          
          // 0. INTRO
          if(s.stage==='intro'&&pwOpts&&pwOpts.length>0&&!qt){
            var pc=false;
            document.querySelectorAll('div[class*="button"]').forEach(function(c){
              if(pc)return;var t=(c.textContent||'').trim();
              if(t.length>2&&t.length<40&&c.offsetHeight>0&&c.offsetHeight<100&&!window.__aaLastPw){
                c.click();window.__aaLastPw=t;pc=true;
              }
            });break;
          }
          
          // 1. Answer
          if(qt&&s.question.correctAnswers){
            if(qt===window.__aaLastQ)break;
            var ca=Array.isArray(s.question.correctAnswers)?s.question.correctAnswers:[s.question.correctAnswers];
            document.querySelectorAll('[class*="answerContainer"]').forEach(function(c){
              var t=(c.textContent||'').trim();
              if(ca.some(function(a){return(a||'').toString().trim()===t})&&c.offsetHeight>0){
                c.click();window.__aaLastQ=qt;window.__aaStats.q++;console.log('[Bot] answered: '+t);
              }
            });
          }
          
          // 2. Chest / Prize - dump what we see
          if(s.choices&&s.choices.length>=3){
            // Dump chest DOM elements
            var chestInfo=[];
            document.querySelectorAll('[class*="chest"],[class*="Chest"],[class*="prize"],[class*="Prize"],[class*="choice"],[class*="Choice"],[class*="option"],[class*="Option"],div[class*="_chest"],div[class*="_prize"]').forEach(function(c,n){
              if(c.offsetHeight>0)chestInfo.push({i:n,t:(c.textContent||'').trim().slice(0,40),cl:(c.className||'').slice(0,60)});
            });
            // Also dump all visible clickable divs with short text
            var other=[];
            document.querySelectorAll('div').forEach(function(c){
              if(c.offsetHeight>0&&c.offsetHeight<300){
                var t=(c.textContent||'').trim();
                if(t.length>0&&t.length<30)other.push({t:t,cl:(c.className||'').slice(0,60)});
              }
            });
            console.log('[Mon] PRIZE stage:'+s.stage+' choices:'+s.choices.length+' gold:'+s.gold);
            console.log('[Mon] Chest DOM:',JSON.stringify(chestInfo).slice(0,500));
            console.log('[Mon] Visible divs:',JSON.stringify(other.slice(0,10)));
            
            // Try clicking chest
            var bestVal=-1,bestIdx=0;
            s.choices.forEach(function(c,i){var txt=c.text||c.question||'';var m=txt.match(/\+?\s*(\d+)/);var v=m?parseInt(m[1]):0;if(txt.indexOf('Triple')>=0)v=999;if(txt.indexOf('Double')>=0)v=666;if(v>bestVal){bestVal=v;bestIdx=i}});
            var ce=document.querySelectorAll('[class*="chest"],[class*="Chest"],[class*="prize"],[class*="Prize"],[class*="choice"],[class*="Choice"]');
            if(ce.length>bestIdx&&ce[bestIdx].offsetHeight>0){ce[bestIdx].click();console.log('[Bot] picked chest #'+bestIdx+' ('+bestVal+')')}
            // Fallback: click best chest by text content
            else{var bt=bestIdx;var all=document.querySelectorAll('div');var cnt=0;all.forEach(function(c){if(c.offsetHeight>0&&c.offsetHeight<200){if(cnt===bt){c.click();console.log('[Bot] chest fallback div#'+bt);}cnt++}})}
          }
          
          // 3. Fishing
          if((weight!==undefined||lure!==undefined)&&!qt){
            document.querySelectorAll('[class*="cast"],[class*="Cast"],[class*="fish"],[class*="Fish"],[class*="reel"],[class*="Reel"]').forEach(function(c){if(c.offsetHeight>0)c.click()});
          }
          
          // 4. Crypto password
          if(pwOpts&&pwOpts.length>0&&!qt){
            var cp=s.correctPassword||(pwOpts[0]||'').toString().trim();var c2=false;
            document.querySelectorAll('[class*="button"],[role=button]').forEach(function(c){var t=(c.textContent||'').trim();if(!c2&&cp&&t===cp&&c.offsetHeight>0){c.click();c2=true;}});
            if(!c2&&s&&s.password!==undefined&&s.passwordOptions){s.password=s.correctPassword||s.passwordOptions[0];if(s.forceUpdate)s.forceUpdate()}
          }
          
          // 5. Click ALL buttons to advance
          document.querySelectorAll('button:not([disabled])').forEach(function(c){if(c.offsetHeight>0)c.click()});
          document.querySelectorAll('[role=button]').forEach(function(c){if(c.offsetHeight>0)c.click()});
          break;
        }
      }catch(e){}
    },600);
  })()});
  console.log('AA injected (with chest debug)');
  
  for(let t=0;t<40;t++){
    await p.waitForTimeout(1200);
    try{if(p.isClosed())break}catch(e){break}
    try{
      const r=await p.evaluate(()=>{
        function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
        for(var el of document.querySelectorAll('*')){
          var k=Object.keys(el).filter(x=>x.indexOf('__react')===0);if(!k.length)continue;
          var s=wF(el[k[0]],0);if(!s)continue;
          if(s.question||s.stage||s.gold!==undefined||s.choices||s.weight!==undefined){
            var keys=Object.keys(s).filter(k=>!k.startsWith('_')&&typeof s[k]!=='function').slice(0,12);
            return JSON.stringify({stage:s.stage,Q:s.question?(s.question.question||s.question.text):null,gold:s.gold,choices:s.choices?JSON.stringify(s.choices).slice(0,150):null,keys:keys});
          }
        }
        return JSON.stringify({stage:'none'});
      });
      if(!r)continue;
      var d=JSON.parse(r);
      var tag=d.stage||(d.choices?'prize':'');
      if(d.Q)console.log(`❓ ${(d.Q||'').slice(0,40)} | gold:${d.gold}`);
      else if(d.choices)console.log(`🎁 stage:${d.stage} gold:${d.gold} keys:${d.keys?.join(',')} choices:${d.choices}`);
      else if(tag)process.stdout.write(tag[0]||'.');
      else process.stdout.write('.');
    }catch(e){process.stdout.write('!')}
  }
  await b.close().catch(()=>{});
})().catch(e=>console.error('FATAL:',e.message));
