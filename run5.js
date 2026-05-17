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

  // Inject FULL auto-answer with chest selection
  await p.evaluate(()=>{(function(){
    if(window.__aaId)clearInterval(window.__aaId);
window.__aaLastQ='';window.__aaLastPw='';
    window.__aaId=setInterval(function(){
      try{
        function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
        for(var el of document.querySelectorAll('*')){
          var k=Object.keys(el).filter(x=>x.indexOf('__react')===0);if(!k.length)continue;
          var s=wF(el[k[0]],0);if(!s)continue;
          var hasGame=Object.keys(s).some(k=>k==='question'||k==='stage'||k==='gold'||k==='choices'||k==='weight'||k==='lure'||k==='crypto'||k==='password'||k==='correctPassword');
          if(!hasGame)continue;
          var qt=s.question&&(s.question.question||s.question.text);
          var stage=s.stage;
          var weight=s.weight,lure=s.lure,isFrenzy=s.isFrenzy;
          var crval=s.crypto,pw=s.password,pwOpts=s.passwordOptions;

          // 1. Answer question
          if(qt&&s.question.correctAnswers){
            var ca=Array.isArray(s.question.correctAnswers)?s.question.correctAnswers:[s.question.correctAnswers];
            if(qt===window.__aaLastQ){break}
            document.querySelectorAll('[class*="answerContainer"]').forEach(function(c){
              var t=(c.textContent||'').trim();
              if(ca.some(function(a){return(a||'').toString().trim()===t})&&c.offsetHeight>0)c.click();
            });
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
            if(ce.length>bestIdx&&ce[bestIdx].offsetHeight>0)ce[bestIdx].click();
          }

          // 3. Fishing auto-click (cast/fish/reel during fishing phase)
          if((weight!==undefined||lure!==undefined)&&!qt){
            document.querySelectorAll('[class*="cast"],[class*="Cast"],[class*="fish"],[class*="Fish"],[class*="reel"],[class*="Reel"]').forEach(function(c){
              if(c.offsetHeight>0)c.click();
            });
          }

          // 4. Crypto password guessing
          if(pwOpts&&pwOpts.length>0&&!qt){
            var correctPw=s.correctPassword||(pwOpts[0]||'').toString().trim();
            var clicked=false;
            document.querySelectorAll('[class*="button"],[role=button]').forEach(function(c){
              var t=(c.textContent||'').trim();
              if(!clicked&&correctPw&&t===correctPw&&c.offsetHeight>0){c.click();clicked=true;}
            });
            if(!clicked&&s&&s.password!==undefined&&s.passwordOptions){
              s.password=s.correctPassword||s.passwordOptions[0];
              if(s.forceUpdate)s.forceUpdate();
            }
          }

          // 5. Click ALL buttons/clickables to advance
          document.querySelectorAll('button:not([disabled])').forEach(function(c){if(c.offsetHeight>0)c.click()});
          document.querySelectorAll('[role=button]').forEach(function(c){if(c.offsetHeight>0)c.click()});
          break;
        }
      }catch(e){}
    },600);
  })()});
  console.log('AA v6 injected (Gold Quest + Fishing + Crypto)');

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
