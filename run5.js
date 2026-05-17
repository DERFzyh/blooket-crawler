const {chromium}=require('playwright-extra');
const StealthPlugin=require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());
(async()=>{
  const PIN='1649012';
  const b=await chromium.launch({headless:true,args:['--no-sandbox']});
  const ctx=await b.newContext({viewport:{width:1400,height:1000}});
  const p=await ctx.newPage();
  await p.goto('https://play.blooket.com/play',{waitUntil:'domcontentloaded',timeout:15000});await p.waitForTimeout(3000);
  await p.evaluate(()=>{document.querySelectorAll('button').forEach(b=>{if(b.textContent.includes('Accept All'))b.click()})});await p.waitForTimeout(2000);
  await p.locator('input[name=join-code]').click();await p.keyboard.type(PIN,{delay:80});
  await p.locator('button.FormSubmitButton_submitButton__MK2LJ').click();await p.waitForTimeout(8000);
  try{const inputs=await p.$$('input');for(const i of inputs){const vis=await i.isVisible();if(vis){await i.click();await p.keyboard.type('B'+Math.floor(Math.random()*9000),{delay:50});break}}await p.locator('[class*=joinButton]').click();await p.waitForTimeout(5000)}catch(e){}
  await p.waitForTimeout(10000);
  console.log('URL:',p.url());

  // Inject FULL auto-answer (updated for modern Blooket + Crypto Hack)
  await p.evaluate(()=>{(function(){
    if(window.__aaId)clearInterval(window.__aaId);
    window.__aaLastQ='';window.__aaLastPw='';window.__aaQDelay=0;
    window.__aaId=setInterval(function(){
      try{
        function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
        for(var el of document.querySelectorAll('*')){
          var k=Object.keys(el).filter(x=>x.indexOf('__react')===0);if(!k.length)continue;
          var s=wF(el[k[0]],0);if(!s)continue;
          var hasGame=Object.keys(s).some(function(k){return k==='question'||k==='stage'||k==='gold'||k==='choices'||k==='weight'||k==='lure'||k==='crypto'||k==='password'||k==='correctPassword'||k==='passwordOptions'});
          if(!hasGame)continue;
          var qt=s.question&&(s.question.question||s.question.text);
          var stage=s.stage;
          var weight=s.weight,lure=s.lure,isFrenzy=s.isFrenzy;
          var crval=s.crypto,pw=s.password,pwOpts=s.passwordOptions;

          // 0. INTRO / PASSWORD SELECTION (Crypto Hack new user)
          if(stage==='intro'&&pwOpts&&pwOpts.length>0&&!qt){
            var pwClicked=false;
            document.querySelectorAll('div[class*="button"]').forEach(function(c){
              if(pwClicked)return;
              var t=(c.textContent||'').trim();
              if(t.length>2&&t.length<40&&c.offsetHeight>0&&c.offsetHeight<100&&!window.__aaLastPw){
                c.click();window.__aaLastPw=t;console.log('[Bot] picked password: '+t);pwClicked=true;
              }
            });
            break;
          }

          // 1. Answer question (track to avoid re-clicking)
          if(qt&&s.question.correctAnswers){
            var ca=Array.isArray(s.question.correctAnswers)?s.question.correctAnswers:[s.question.correctAnswers];
            if(qt===window.__aaLastQ&&window.__aaQDelay>0){window.__aaQDelay--;break}
            if(qt===window.__aaLastQ){break}
            var clicked=false;
            var acEls=document.querySelectorAll('[class*="answerContainer"]');
            for(var ai=0;ai<acEls.length&&!clicked;ai++){
              var c=acEls[ai];var t=(c.textContent||'').trim();
              if(ca.some(function(a){var at=(a||'').toString().trim();return t.indexOf(at)>=0||at.indexOf(t)>=0})&&c.offsetHeight>0){
                c.click();clicked=true;window.__aaLastQ=qt;window.__aaQDelay=3;console.log('[Bot] answered: '+t);
              }
            }
            if(!clicked){
              document.querySelectorAll('[class*="answerTextContainer"],[class*="answerContainer"]').forEach(function(c){
                if(clicked)return;var t=(c.textContent||'').trim();
                if(ca.some(function(a){var at=(a||'').toString().trim();return t.indexOf(at)>=0})&&c.offsetHeight>0){
                  c.click();clicked=true;window.__aaLastQ=qt;window.__aaQDelay=3;console.log('[Bot] text-clicked: '+t);
                }
              });
            }
            if(!clicked){
              document.querySelectorAll('*').forEach(function(d){
                if(clicked)return;var t=(d.textContent||'').trim();
                if(ca.some(function(a){var at=(a||'').toString().trim();return t===at||t.indexOf(at)>=0})&&d.offsetHeight>0&&d.offsetHeight<300&&t.length<100){
                  d.click();clicked=true;window.__aaLastQ=qt;window.__aaQDelay=3;console.log('[Bot] fallback: '+t.substring(0,40));
                }
              });
            }
            break;
          }

          // 2. CHEST SELECTION - pick best
          if(stage==='prize'&&s.choices&&s.choices.length>=3){
            var bestVal=-1,bestIdx=0;
            s.choices.forEach(function(c,i){
              var txt=c.text||c.question||'';
              var m=txt.match(/\+?\s*(\d+)/);var v=m?parseInt(m[1]):0;
              if(txt.indexOf('Triple')>=0)v=999;if(txt.indexOf('Double')>=0)v=666;
              if(v>bestVal){bestVal=v;bestIdx=i}
            });
            var ce=document.querySelectorAll('[class*="chest"],[class*="Chest"],[class*="prize"]');
            if(ce.length>bestIdx&&ce[bestIdx].offsetHeight>0){ce[bestIdx].click();console.log('[Bot] picked chest #'+bestIdx+' ('+bestVal+')');break}
          }

          // 3. Fishing auto-click
          if((weight!==undefined||lure!==undefined)&&!qt){
            document.querySelectorAll('[class*="fishingRod"],[class*="_fishingRod"],[class*="pageButton"],[class*="_pageButton"],[class*="cast"],[class*="reel"]').forEach(function(c){
              if(c.offsetHeight>0){c.click();console.log('[Bot] fishing click')}
            });
            break;
          }

          // 4. Crypto password guessing (click visible password buttons)
          if(pwOpts&&pwOpts.length>0&&!qt&&stage!=='intro'){
            var correctPw=s.correctPassword||pwOpts[0];
            var pwClicked2=false;
            document.querySelectorAll('div[class*="button"]').forEach(function(c){
              if(pwClicked2)return;var t=(c.textContent||'').trim();
              if(correctPw&&t===correctPw&&c.offsetHeight>0&&c.offsetHeight<100){c.click();pwClicked2=true;console.log('[Bot] crypto guessed: '+t)}
            });
            if(!pwClicked2){
              document.querySelectorAll('div[class*="button"]').forEach(function(c){
                if(pwClicked2)return;var t=(c.textContent||'').trim();
                if(t===pwOpts[0]&&c.offsetHeight>0&&c.offsetHeight<100){c.click();pwClicked2=true;console.log('[Bot] crypto pick: '+t)}
              });
            }
            break;
          }

          // 5. Click advancement buttons
          if(!qt||qt===window.__aaLastQ){
            document.querySelectorAll('button:not([disabled])').forEach(function(c){if(c.offsetHeight>0&&c.offsetHeight<200)c.click()});
            document.querySelectorAll('[role=button]').forEach(function(c){if(c.offsetHeight>0&&c.offsetHeight<200)c.click()});
            document.querySelectorAll('div[class*="_button_"],div[class*="-button-"]').forEach(function(c){
              var t=(c.textContent||'').trim().toLowerCase();
              if(c.offsetHeight>0&&c.offsetHeight<120&&(t=='next'||t=='continue'||t=='ok'||t=='ready'||t=='got it'||t==''))c.click();
            });
          }
          break;
        }
      }catch(e){}
    },600);
  })()});
  console.log('AA v7 injected (Crypto Hack intro + answer tracking + advance clicks)');

  // Monitor 40s
  let lastGold=undefined;
  for(let t=0;t<20;t++){
    await p.waitForTimeout(2000);
    const r=await p.evaluate(()=>{
      function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
      for(var el of document.querySelectorAll('*')){var k=Object.keys(el).filter(x=>x.indexOf('__react')===0);if(!k.length)continue;var s=wF(el[k[0]],0);
        if(s&&s.question&&(s.question.question||s.question.text))return JSON.stringify({Q:s.question.question||s.question.text,stage:s.stage,gold:s.gold});
        if(s&&s.stage==='prize'&&s.choices){
          var opts=s.choices.map(function(c){var t=c.text||'';var m=t.match(/\d+/);return{text:t,gold:m?parseInt(m[0]):0}});
          return JSON.stringify({stage:'prize',opts:opts});
        }
      }return JSON.stringify({url:location.href});
    });
    var d=JSON.parse(r);
    if(d.Q)console.log('Q:',d.Q,'💰:',d.gold,'stage:',d.stage);
    else if(d.stage==='prize')console.log('🎁 PRIZE:',d.opts.map(function(o){return o.text+'='+o.gold}).join(' | '));
    else process.stdout.write('.');
    if(d.gold!==undefined&&d.gold!==lastGold){lastGold=d.gold;console.log('🪙',d.gold)}
  }
  await p.screenshot({path:'/tmp/chest-final.png'});
  await b.close();
})();
