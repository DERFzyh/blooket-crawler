/**
 * 探索 Gold Quest game 3824128 的 React 状态结构
 * 重点：宝箱抽奖阶段的完整 state dump
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
    if(t.includes('[GQ]')||t.includes('[STATE]')||t.includes('[CHEST]'))console.log(t);
  });

  await p.goto('https://play.blooket.com/play',{waitUntil:'domcontentloaded',timeout:15000});
  await p.waitForTimeout(3000);
  
  // Cookie
  try{await p.evaluate(()=>{document.querySelectorAll('button').forEach(b=>{if(b.textContent.includes('Accept'))b.click()})})}catch(e){}
  await p.waitForTimeout(1500);

  // Join
  await p.locator('input[name=join-code]').click();
  await p.keyboard.type(PIN,{delay:80});
  await p.keyboard.press('Enter');
  await p.waitForTimeout(6000);

  // Name
  try{
    const nameEl=await p.locator('input:not([type="hidden"]):not([name="join-code"])').first();
    if(await nameEl.isVisible({timeout:5000}).catch(()=>false)){
      await nameEl.fill('GQ-Test');
      await p.keyboard.press('Enter');
      await p.waitForTimeout(6000);
    }
  }catch(e){}

  console.log('URL:',(await p.url()));

  // ====== 全量 State Dump 脚本 ======
  const STATE_DUMP_JS = `(function(){
    function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
    var results=[];
    for(var el of document.querySelectorAll('*')){
      var k=Object.keys(el).filter(function(x){return x.indexOf('__react')===0});if(!k.length)continue;
      var s=wF(el[k[0]],0);if(!s)continue;
      var hasGame=Object.keys(s).some(function(k){return k==='question'||k==='stage'||k==='gold'||k==='choices'||k==='weight'||k==='lure'||k==='crypto'});
      if(!hasGame)continue;
      
      // Deep dump: show all top-level state keys + their types
      var dump={};
      for(var key in s){
        if(s.hasOwnProperty(key)){
          var v=s[key];
          var type=typeof v;
          if(type==='object'&&v!==null){
            if(Array.isArray(v))dump[key]='Array['+v.length+']';
            else{var ks=Object.keys(v).slice(0,15).join(',');dump[key]='Object{'+ks+'}';}
          }else if(type==='string'&&v.length>100)dump[key]='String['+v.length+']:"'+v.slice(0,80)+'..."';
          else if(type==='string')dump[key]='String:"'+v+'"';
          else if(type==='function')dump[key]='Function';
          else dump[key]=type+'='+v;
        }
      }
      results.push(dump);
    }
    return JSON.stringify(results,null,2);
  })()`;

  // ====== Chest 详细 Dump ======
  const CHEST_DUMP_JS = `(function(){
    function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
    for(var el of document.querySelectorAll('*')){
      var k=Object.keys(el).filter(function(x){return x.indexOf('__react')===0});if(!k.length)continue;
      var s=wF(el[k[0]],0);if(!s)continue;
      if(s.stage==='prize'||(s.choices&&s.choices.length>=2)){
        var info={
          stage:s.stage,
          gold:s.gold,
          choices:s.choices?JSON.parse(JSON.stringify(s.choices)):null,
          // Also check for other relevant fields
          keys:Object.keys(s).filter(function(k){return typeof s[k]!=='function'&&k[0]!=='_'&&k[0]!=='$'})
        };
        // Try to get more details on each choice
        if(s.choices) info.choiceDetails=s.choices.map(function(c,i){
          return {index:i, keys:Object.keys(c), text:c.text, question:c.question, type:c.type, amount:c.amount, target:c.target, all:JSON.parse(JSON.stringify(c))};
        });
        return JSON.stringify(info,null,2);
      }
    }
    return JSON.stringify({error:'no prize stage found'});
  })()`;

  // ====== 注入观察脚本，每次状态变化都记录 ======
  await p.evaluate(()=>{
    window.__gqLog=[];
    window.__gqId=setInterval(function(){
      try{
        function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
        for(var el of document.querySelectorAll('*')){
          var k=Object.keys(el).filter(function(x){return x.indexOf('__react')===0});if(!k.length)continue;
          var s=wF(el[k[0]],0);if(!s)continue;
          var hasGame=Object.keys(s).some(function(k){return k==='question'||k==='stage'||k==='gold'||k==='choices'});
          if(!hasGame)continue;
          
          var qt=s.question&&(s.question.question||s.question.text);
          var entry={ts:Date.now(),stage:s.stage,gold:s.gold};
          
          if(qt&&s.question.correctAnswers){
            entry.type='question';
            entry.text=qt.slice(0,60);
            entry.answers=Array.isArray(s.question.correctAnswers)?s.question.correctAnswers:[s.question.correctAnswers];
          }
          if(s.stage==='prize'&&s.choices&&s.choices.length>=2){
            entry.type='prize';
            entry.choices=s.choices.map(function(c){
              return {text:c.text||c.question||'',keys:Object.keys(c)};
            });
          }
          if(entry.type){
            // Deduplicate
            var last=window.__gqLog[window.__gqLog.length-1];
            if(!last||last.type!==entry.type||last.stage!==entry.stage||JSON.stringify(last.choices)!==JSON.stringify(entry.choices)){
              window.__gqLog.push(entry);
              console.log('[GQ] '+JSON.stringify(entry));
            }
          }
          break;
        }
      }catch(e){}
    },800);
  });

  // ====== 运行观察 ======
  let lastLogLength=0;
  for(let t=0;t<60;t++){
    await p.waitForTimeout(2000);
    if(p.isClosed())break;
    
    try{
      const r=await p.evaluate(()=>{
        return JSON.stringify({
          logLen:window.__gqLog.length,
          url:location.href,
          last5:window.__gqLog.slice(-5)
        });
      });
      if(!r)continue;
      const d=JSON.parse(r);
      if(d.logLen!==lastLogLength){
        lastLogLength=d.logLen;
        console.log(`\n🔄 日志条目: ${d.logLen} | URL: ${d.url.split('/').pop()}`);
      }
    }catch(e){process.stdout.write('!')}

    // Every 10 seconds, do a deep dump
    if(t%5===0){
      try{
        const stateDump=await p.evaluate(STATE_DUMP_JS);
        console.log('\n=== STATE DUMP (t='+t*2+'s) ===');
        console.log(stateDump);
      }catch(e){}
    }
  }

  // Final: full log
  console.log('\n\n=== 📊 FINAL SUMMARY ===');
  try{
    const log=await p.evaluate(()=>JSON.stringify(window.__gqLog.slice(-30),null,2));
    console.log(log);
  }catch(e){console.log('log err:',e.message)}

  try{clearInterval(await p.evaluate('window.__gqId'))}catch(e){}
  await b.close().catch(()=>{});
})().catch(e=>console.error('FATAL:',e.message));
