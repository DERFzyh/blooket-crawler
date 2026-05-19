/**
 * Gold Quest 3824128 - 答题+宝箱深度探索
 * 自动答题，详细记录每次宝箱阶段的 React state
 */
const {chromium}=require('playwright-extra');
const StealthPlugin=require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

(async()=>{
  const PIN='3824128';
  const b=await chromium.launch({headless:true,args:['--no-sandbox']});
  const ctx=await b.newContext({viewport:{width:1400,height:1000}});
  const p=await ctx.newPage();
  
  p.on('console', msg => {
    var t=msg.text();
    if(t.includes('[BOT]')||t.includes('[CHEST]'))console.log(t);
  });

  await p.goto('https://play.blooket.com/play',{waitUntil:'domcontentloaded',timeout:15000});
  await p.waitForTimeout(3000);
  
  try{await p.evaluate(()=>{document.querySelectorAll('button').forEach(b=>{if(b.textContent.includes('Accept'))b.click()})})}catch(e){}
  await p.waitForTimeout(1500);

  await p.locator('input[name=join-code]').click();
  await p.keyboard.type(PIN,{delay:80});
  await p.keyboard.press('Enter');
  await p.waitForTimeout(6000);

  try{
    const nameEl=await p.locator('input:not([type="hidden"]):not([name="join-code"])').first();
    if(await nameEl.isVisible({timeout:5000}).catch(()=>false)){
      await nameEl.fill('GQBot');
      await p.keyboard.press('Enter');
      await p.waitForTimeout(6000);
    }
  }catch(e){}

  console.log('URL:',p.url());

  // ====== 注入自动答题 + 宝箱详细 Dump ======
  await p.evaluate(()=>{
    window.__chestLog=[];
    window.__aaId=setInterval(function(){
      try{
        function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
        for(var el of document.querySelectorAll('*')){
          var k=Object.keys(el).filter(function(x){return x.indexOf('__react')===0});if(!k.length)continue;
          var s=wF(el[k[0]],0);if(!s)continue;
          var hasGame=Object.keys(s).some(function(k){return k==='question'||k==='stage'||k==='gold'||k==='choices'});
          if(!hasGame)continue;
          
          var qt=s.question&&(s.question.question||s.question.text);

          // 1. Answer question
          if(qt&&s.question.correctAnswers){
            var ca=Array.isArray(s.question.correctAnswers)?s.question.correctAnswers:[s.question.correctAnswers];
            document.querySelectorAll('[class*="answerContainer"]').forEach(function(c){
              var t=(c.textContent||'').trim();
              if(t!==''&&ca.some(function(a){var at=(a||'').toString().trim();return t.indexOf(at)>=0||at.indexOf(t)>=0})&&c.offsetHeight>0){
                c.click();
                console.log('[BOT] answered: '+t);
              }
            });
          }

          // 2. Chest phase - DUMP everything!
          if(s.stage==='prize'&&s.choices&&s.choices.length>=2){
            // Full deep dump of each choice
            var chestInfo={
              ts:Date.now(),
              gold:s.gold,
              gold2:s.gold2,
              stage:s.stage,
              choiceCount:s.choices.length,
              choices:s.choices.map(function(c,i){
                // Try EVERY possible property
                var raw={};
                for(var ck in c){
                  if(c.hasOwnProperty(ck)){
                    try{raw[ck]=c[ck]}catch(e){raw[ck]='<error>'}
                  }
                }
                return {
                  index:i,
                  text:c.text||null,
                  question:c.question||null,
                  type:c.type||null,
                  id:c.id||null,
                  amount:c.amount||null,
                  target:c.target||null,
                  player:c.player||null,
                  msg:c.msg||null,
                  allKeys:Object.keys(c),
                  allRaw:raw
                };
              }),
              // Also dump all state keys for clues
              stateKeys:Object.keys(s).filter(function(k){return typeof s[k]!=='function'})
            };
            
            // Deduplicate
            var last=window.__chestLog[window.__chestLog.length-1];
            if(!last||Date.now()-last.ts>2000){
              window.__chestLog.push(chestInfo);
              console.log('[CHEST] '+JSON.stringify(chestInfo,null,2));
            }

            // Pick "worst" chest to avoid getting too much gold (stay under 10000)
            var minVal=99999,minIdx=0;
            s.choices.forEach(function(c,i){
              var txt=c.text||c.question||'';
              var m=txt.match(/\+?\s*(\\d+)/);var v=m?parseInt(m[1]):0;
              if(txt.indexOf('Swap')>=0)v=0;  // swap might reduce gold
              if(txt.indexOf('Lose')>=0)v=-1; // always avoid lose
              if(v<minVal){minVal=v;minIdx=i}
            });
            
            var ce=document.querySelectorAll('[class*="chest"],[class*="Chest"],[class*="prize"],[class*="chestImage"]');
            console.log('[BOT] chest elements found: '+ce.length+' | picking #'+minIdx+' (val='+minVal+')');
            if(ce.length>minIdx&&ce[minIdx].offsetHeight>0){
              ce[minIdx].click();
              console.log('[BOT] clicked chest #'+minIdx);
            }
            break;
          }

          // 3. Click buttons to advance
          document.querySelectorAll('button:not([disabled])').forEach(function(c){if(c.offsetHeight>0&&c.offsetHeight<200)c.click()});
          document.querySelectorAll('[role=button]').forEach(function(c){if(c.offsetHeight>0&&c.offsetHeight<200)c.click()});
          break;
        }
      }catch(e){}
    },600);
  });

  // Wait and observe
  for(let t=0;t<60;t++){
    await p.waitForTimeout(2000);
    if(p.isClosed())break;
    try{
      const info=await p.evaluate(()=>{
        return JSON.stringify({
          chestLogLen:window.__chestLog.length,
          url:location.href
        });
      });
      if(!info)continue;
      const d=JSON.parse(info);
      if(d.chestLogLen>0)process.stdout.write('\n🎁 chests:'+d.chestLogLen);
      process.stdout.write('.');
    }catch(e){process.stdout.write('!')}
  }

  // Final summary
  console.log('\n\n=== 🎁 CHEST LOG ===');
  try{
    const log=await p.evaluate(()=>JSON.stringify(window.__chestLog,null,2));
    console.log(log);
  }catch(e){console.log('log err:',e.message)}

  try{await p.evaluate('clearInterval(window.__aaId)')}catch(e){}
  await b.close().catch(()=>{});
})().catch(e=>console.error('FATAL:',e.message));
