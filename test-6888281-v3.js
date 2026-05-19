const {chromium}=require('playwright-extra');
const StealthPlugin=require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());
(async()=>{
  const PIN='6888281';
  const b=await chromium.launch({headless:true,args:['--no-sandbox']});
  const p=await (await b.newContext({viewport:{width:1400,height:1000}})).newPage();
  p.on('console', msg => { var t=msg.text(); if(t.includes('[Bot]')||t.includes('[DBG]'))console.log('🌐',t); });
  
  await p.goto('https://play.blooket.com/play',{waitUntil:'domcontentloaded',timeout:15000});
  await p.waitForTimeout(2000);
  try{await p.evaluate(()=>{document.querySelectorAll('button').forEach(b=>{if(b.textContent.includes('Accept'))b.click()})})}catch(e){}
  await p.waitForTimeout(1000);
  await p.locator('input[name=join-code]').click();await p.keyboard.type(PIN,{delay:80});
  await p.keyboard.press('Enter');await p.waitForTimeout(6000);
  try{const i=await p.$('input:not([hidden]):not([type=hidden])');if(i&&await i.isVisible()){await i.fill('TestBot');await p.keyboard.press('Enter');}}catch(e){}
  await p.waitForTimeout(8000);
  console.log('URL:',p.url());
  
  // Inject auto-answer (current server.js version)
  await p.evaluate(()=>{(function(){
    if(window.__aaId)clearInterval(window.__aaId);
    window.__aaLastQ='';window.__aaLastPw='';window.__aaNeedAdvance=0;window.__aaStats={q:0};
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
                c.click();window.__aaLastPw=t;console.log('[Bot] picked password: '+t);pc=true;
              }})};break;
          }
          
          // 1. Answer (NO break!)
          if(qt&&s.question.correctAnswers){
            var isNewQ=(qt!==window.__aaLastQ);
            if(isNewQ){
              var ca=Array.isArray(s.question.correctAnswers)?s.question.correctAnswers:[s.question.correctAnswers];
              // DEBUG: dump answer elements
              var ac=document.querySelectorAll('[class*="answerContainer"]').length;
              console.log('[DBG] answerContainers in DOM:',ac,'correctAnswer:',ca.join(','));
              document.querySelectorAll('[class*="answerContainer"]').forEach(function(c){
                var t=(c.textContent||'').trim();
                console.log('[DBG] answerEl text:'+t+' cls:'+c.className.slice(0,50));
                if(ca.some(function(a){return(a||'').toString().trim()===t})&&c.offsetHeight>0){
                  c.click();window.__aaLastQ=qt;window.__aaNeedAdvance=8;window.__aaStats.q++;
                  console.log('[Bot] answered: '+t);
                }
              });
              // If not clicked yet, try fallback
              if(window.__aaLastQ!==qt){
                document.querySelectorAll('div').forEach(function(d){
                  if(window.__aaLastQ===qt)return;
                  var t=(d.textContent||'').trim();
                  if(ca.some(function(a){return(a||'').toString().trim()===t})&&d.offsetHeight>0&&d.offsetHeight<250){
                    d.click();window.__aaLastQ=qt;window.__aaNeedAdvance=8;window.__aaStats.q++;
                    console.log('[Bot] fallback-answered: '+t);
                  }
                });
              }
            }
          }
          
          // 2. Chest
          if(s.choices&&s.choices.length>=3){
            var bv=-1,bi=0;
            s.choices.forEach(function(c,i){var txt=c.text||c.question||'';var m=txt.match(/\+?\s*(\d+)/);var v=m?parseInt(m[1]):0;if(txt.indexOf('Triple')>=0)v=999;if(txt.indexOf('Double')>=0)v=666;if(v>bv){bv=v;bi=i}});
            var ce=document.querySelectorAll('[class*="chest"],[class*="Chest"],[class*="prize"],[class*="Prize"],[class*="choice"],[class*="Choice"]');
            if(ce.length>bi&&ce[bi].offsetHeight>0){ce[bi].click();console.log('[Bot] chest #'+bi+' ('+bv+')')}
            else{var cnt=0;document.querySelectorAll('div').forEach(function(d){if(cnt===bi&&d.offsetHeight>0&&d.offsetHeight<250){d.click();console.log('[Bot] chest fallback #'+bi);cnt=-1}if(d.offsetHeight>0&&d.offsetHeight<250&&(d.textContent||'').trim().length<40)cnt++})}
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
          
          // 5. Click ALL buttons to advance (ALWAYS)
          if(window.__aaNeedAdvance>0)window.__aaNeedAdvance--;
          document.querySelectorAll('button:not([disabled])').forEach(function(c){if(c.offsetHeight>0)c.click()});
          document.querySelectorAll('[role=button]').forEach(function(c){if(c.offsetHeight>0)c.click()});
          document.querySelectorAll('div[class*="_button_"],div[class*="-button-"]').forEach(function(c){if(c.offsetHeight>0&&c.offsetHeight<120)c.click()});
          document.querySelectorAll('div,span,button').forEach(function(c){if(!c.offsetHeight||c.offsetHeight>150)return;var t=(c.textContent||'').trim().toLowerCase();if(t==='go'||t==='go!'||t==='next'||t==='continue'||t==='play'||t==='ready'||t==='ok'){c.click();console.log('[Bot] advance click: '+t)}});
          break;
        }
      }catch(e){console.log('[DBG] error:',e)}
    },600);
  })()});
  console.log('AA injected');
  
  let seen=new Set(),lastGold=undefined;
  for(let t=0;t<50;t++){
    await p.waitForTimeout(1000);
    try{if(p.isClosed())break}catch(e){break}
    try{
      const r=await p.evaluate(()=>{
        function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
        for(var el of document.querySelectorAll('*')){
          var k=Object.keys(el).filter(x=>x.indexOf('__react')===0);if(!k.length)continue;
          var s=wF(el[k[0]],0);if(!s)continue;
          if(s.question||s.stage||s.gold!==undefined||s.choices||s.weight!==undefined){
            return JSON.stringify({stage:s.stage,Q:s.question?(s.question.question||s.question.text):null,A:s.question?.correctAnswers?JSON.stringify(s.question.correctAnswers):null,gold:s.gold,weight:s.weight,choices:s.choices?JSON.stringify(s.choices).slice(0,100):null,url:location.href});
          }
        }
        return JSON.stringify({stage:'none'});
      });
      if(!r)continue;
      var d=JSON.parse(r);
      if(d.Q&&!seen.has(d.Q)){
        seen.add(d.Q);
        console.log(`❓ #${seen.size}: ${(d.Q||'').slice(0,50)} ✅${d.A} 🪙${d.gold}`);
      } else if(d.choices)console.log(`🎁 gold:${d.gold} choices:${d.choices?.slice(0, 60)}`);
      else if(d.stage==='question')process.stdout.write('q');
      else if(d.stage)process.stdout.write(d.stage[0]||'s');
      else process.stdout.write('.');
      if(d.gold!==undefined&&d.gold!==lastGold){lastGold=d.gold;console.log('💰',d.gold)}
    }catch(e){process.stdout.write('!')}
  }
  var s=await p.evaluate(()=>window.__aaStats||{q:0}).catch(()=>({q:0}));
  console.log(`\n=== 答题:${s.q} 唯一题:${seen.size} 最终金:${lastGold??'?'} ===`);
  await b.close().catch(()=>{});
})().catch(e=>console.error('FATAL:',e.message));
