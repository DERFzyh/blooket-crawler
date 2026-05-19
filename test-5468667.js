const {chromium}=require('playwright-extra');
const StealthPlugin=require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());
(async()=>{
  const PIN='5468667';
  const b=await chromium.launch({headless:true,args:['--no-sandbox']});
  const ctx=await b.newContext({viewport:{width:1400,height:1000}});
  const p=await ctx.newPage();
  p.on('console', msg => {
    var t=msg.text();
    if(!t.includes('sentry')&&!t.includes('CSP')&&!t.includes('Permissions-Policy'))console.log('🌐',t);
  });
  
  await p.goto('https://play.blooket.com/play',{waitUntil:'domcontentloaded',timeout:15000});
  await p.waitForTimeout(3000);
  await p.evaluate(()=>{document.querySelectorAll('button').forEach(b=>{if(b.textContent.includes('Accept')||b.textContent.includes('Reject'))b.click()})});
  await p.waitForTimeout(2000);
  await p.locator('input[name=join-code]').click();await p.keyboard.type(PIN,{delay:80});
  await p.locator('button[type=submit]:not([disabled])').first().click({timeout:5000});
  await p.waitForTimeout(6000);
  try{const inputs=await p.$$('input');for(const i of inputs){const vis=await i.isVisible();if(vis){await i.click();await i.fill('');await p.keyboard.type('Test'+Math.floor(Math.random()*9000),{delay:50});break}}await p.keyboard.press('Enter');await p.waitForTimeout(5000)}catch(e){}
  await p.waitForTimeout(8000);
  console.log('URL:',p.url());

  // Inject fixed auto-answer from server.js
  await p.evaluate(()=>{
    (function(){
      if(window.__aaId)clearInterval(window.__aaId);
      window.__aaLastQ='';window.__aaLastPw='';window.__aaQDelay=0;
      window.__aaId=setInterval(function(){
        try{
          function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
          for(var el of document.querySelectorAll('*')){
            var k=Object.keys(el).filter(function(x){return x.indexOf('__react')===0});if(!k.length)continue;
            var s=wF(el[k[0]],0);if(!s)continue;
            var hasGame=Object.keys(s).some(function(k){return k==='question'||k==='stage'||k==='gold'||k==='choices'||k==='weight'||k==='lure'||k==='crypto'||k==='password'||k==='correctPassword'||k==='passwordOptions'});
            if(!hasGame)continue;
            var qt=s.question&&(s.question.question||s.question.text);
            var stage=s.stage;var weight=s.weight,lure=s.lure;
            var cr=s.crypto,pw=s.password,pwOpts=s.passwordOptions;

            // 0. INTRO
            if(stage==='intro'&&pwOpts&&pwOpts.length>0&&!qt){
              var pwClicked=false;
              document.querySelectorAll('div[class*="button"]').forEach(function(c){
                if(pwClicked)return;var t=(c.textContent||'').trim();
                if(t.length>2&&t.length<40&&c.offsetHeight>0&&c.offsetHeight<100&&!window.__aaLastPw){
                  c.click();window.__aaLastPw=t;console.log('[Bot] picked password: '+t);pwClicked=true;
                }
              });break;
            }

            // 1. Answer
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
              if(!clicked){document.querySelectorAll('[class*="answerTextContainer"],[class*="answerContainer"]').forEach(function(c){if(clicked)return;var t=(c.textContent||'').trim();if(ca.some(function(a){var at=(a||'').toString().trim();return t.indexOf(at)>=0})&&c.offsetHeight>0){c.click();clicked=true;window.__aaLastQ=qt;window.__aaQDelay=3;console.log('[Bot] text-clicked: '+t)}})}
              if(!clicked){document.querySelectorAll('*').forEach(function(d){if(clicked)return;var t=(d.textContent||'').trim();if(ca.some(function(a){var at=(a||'').toString().trim();return t===at||t.indexOf(at)>=0})&&d.offsetHeight>0&&d.offsetHeight<300&&t.length<100){d.click();clicked=true;window.__aaLastQ=qt;window.__aaQDelay=3;console.log('[Bot] fallback: '+t.substring(0,40))}})}
              break;
            }

            // 2. Chest
            if(stage==='prize'&&s.choices&&s.choices.length>=3){
              var bestVal=-1,bestIdx=0;
              s.choices.forEach(function(c,i){var txt=c.text||c.question||'';var m=txt.match(/\+?\s*(\d+)/);var v=m?parseInt(m[1]):0;if(txt.indexOf('Triple')>=0)v=999;if(txt.indexOf('Double')>=0)v=666;if(v>bestVal){bestVal=v;bestIdx=i}});
              var ce=document.querySelectorAll('[class*="chest"],[class*="Chest"],[class*="prize"]');
              if(ce.length>bestIdx&&ce[bestIdx].offsetHeight>0){ce[bestIdx].click();console.log('[Bot] picked chest #'+bestIdx+' ('+bestVal+')');break}
            }

            // 3. Fishing
            if((weight!==undefined||lure!==undefined)&&!qt){
              document.querySelectorAll('[class*="fishingRod"],[class*="_fishingRod"],[class*="pageButton"],[class*="_pageButton"],[class*="cast"],[class*="reel"]').forEach(function(c){if(c.offsetHeight>0){c.click();console.log('[Bot] fishing click')}});break;
            }

            // 4. Crypto password
            if(pwOpts&&pwOpts.length>0&&!qt&&stage!=='intro'){
              var correctPw=s.correctPassword||pwOpts[0];var pwClicked2=false;
              document.querySelectorAll('div[class*="button"]').forEach(function(c){if(pwClicked2)return;var t=(c.textContent||'').trim();if(correctPw&&t===correctPw&&c.offsetHeight>0&&c.offsetHeight<100){c.click();pwClicked2=true;console.log('[Bot] crypto guessed: '+t)}});
              if(!pwClicked2){document.querySelectorAll('div[class*="button"]').forEach(function(c){if(pwClicked2)return;var t=(c.textContent||'').trim();if(t===pwOpts[0]&&c.offsetHeight>0&&c.offsetHeight<100){c.click();pwClicked2=true;console.log('[Bot] crypto pick: '+t)}})}
              break;
            }

            // 5. Advance
            if(!qt||qt===window.__aaLastQ){
              document.querySelectorAll('button:not([disabled])').forEach(function(c){if(c.offsetHeight>0&&c.offsetHeight<200)c.click()});
              document.querySelectorAll('[role=button]').forEach(function(c){if(c.offsetHeight>0&&c.offsetHeight<200)c.click()});
              document.querySelectorAll('div[class*="_button_"],div[class*="-button-"]').forEach(function(c){var t=(c.textContent||'').trim().toLowerCase();if(c.offsetHeight>0&&c.offsetHeight<120&&(t=='next'||t=='continue'||t=='ok'||t=='ready'||t=='got it'||t==''))c.click()});
            }
            break;
          }
        }catch(e){}
      },600);
    })();
  });
  console.log('AA injected\n');

  // Monitor
  let qCount=0,lastQ='',stats={total:0,answered:0,chests:0,passwords:0};
  for(let t=0;t<60;t++){
    await p.waitForTimeout(1500);
    const r=await p.evaluate(()=>{
      function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
      for(var el of document.querySelectorAll('*')){
        var k=Object.keys(el).filter(x=>x.indexOf('__react')===0);if(!k.length)continue;
        var s=wF(el[k[0]],0);if(!s)continue;
        if(s.question||s.stage||s.crypto!==undefined||s.password!==undefined||s.gold!==undefined){
          return JSON.stringify({
            stage:s.stage,Q:s.question?(s.question.question||s.question.text):null,
            A:s.question?.correctAnswers?JSON.stringify(s.question.correctAnswers):null,
            crypto:s.crypto,gold:s.gold,weight:s.weight,
            pw:s.password,pwOpts:s.passwordOptions?JSON.stringify(s.passwordOptions).slice(0,100):null,
            choices:s.choices?JSON.stringify(s.choices.slice?1:2):null,
            url:location.href
          });
        }
      }
      return JSON.stringify({stage:'none'});
    });
    var d=JSON.parse(r);
    if(d.Q&&d.Q!==lastQ){qCount++;lastQ=d.Q;stats.total++;console.log(`\n❓ #${qCount}: ${d.Q.slice(0,60)}\n✅ ${d.A} | crypto:${d.crypto} stage:${d.stage}`);}
    else if(d.stage==='intro'){console.log('🔑 intro (pw select)');stats.passwords++;}
    else if(d.stage==='prize'){console.log('🎁 prize');stats.chests++;}
    else if(d.stage==='guessing')process.stdout.write('g');
    else if(d.stage==='question'&&d.Q===lastQ)process.stdout.write('q');
    else if(d.stage==='question'){qCount++;lastQ=d.Q;stats.total++;console.log(`\n❓ #${qCount}: ${d.Q.slice(0,60)}\n✅ ${d.A}`);}
    else if(d.stage==='none')process.stdout.write('.');
    else console.log(' '+d.stage);
  }
  console.log(`\n\n=== 统计 ===`);
  console.log(`题目总数: ${stats.total}`);
  console.log(`宝箱: ${stats.chests}  密码选择: ${stats.passwords}`);
  await p.screenshot({path:'/tmp/game-5468667.png'});
  await b.close();
})();
