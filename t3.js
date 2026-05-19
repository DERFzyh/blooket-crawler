const {chromium}=require('playwright-extra');
const StealthPlugin=require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());
(async()=>{
  const b=await chromium.launch({headless:true,args:['--no-sandbox']});
  const p=await (await b.newContext({viewport:{width:1400,height:1000}})).newPage();
  p.on('console',m=>{if(m.text().includes('[Bot]')||m.text().includes('[DBG]'))console.log('🌐',m.text())});
  await p.goto('https://play.blooket.com/play',{waitUntil:'domcontentloaded',timeout:15000});
  await p.waitForTimeout(2000);
  try{await p.evaluate(()=>document.querySelectorAll('button').forEach(b=>{if(b.textContent.includes('Accept'))b.click()}))}catch(e){}
  await p.locator('input[name=join-code]').click();await p.keyboard.type('6888281',{delay:80});
  await p.keyboard.press('Enter');await p.waitForTimeout(6000);
  try{const i=await p.$('input:not([hidden]):not([type=hidden])');if(i&&await i.isVisible()){await i.fill('FastTest');await p.keyboard.press('Enter');}}catch(e){}
  await p.waitForTimeout(8000);
  console.log('URL:',p.url());

  // Simple auto-answer with aggressive clicking
  await p.evaluate(()=>{
    var lastQ='';
    setInterval(()=>{
      try{
        function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
        for(var el of document.querySelectorAll('*')){
          var k=Object.keys(el).filter(x=>x.indexOf('__react')===0);if(!k.length)continue;
          var s=wF(el[k[0]],0);if(!s)continue;
          if(!s.question||!s.question.correctAnswers)continue;
          var q=s.question.question||s.question.text;
          var ca=Array.isArray(s.question.correctAnswers)?s.question.correctAnswers:[s.question.correctAnswers];
          if(q===lastQ)return;
          lastQ=q;
          var ans=ca.map(a=>(a||'').toString().trim());
          
          // DUMP all visible elements and their classes
          var all=[];
          document.querySelectorAll('*').forEach(function(c){
            if(!c.offsetHeight||c.offsetHeight>400)return;
            var t=(c.textContent||'').trim();
            var cn=(c.className||'').toString();
            if(cn.includes('answer')||cn.includes('choice')||cn.includes('option')||t.length===1||t.length===2){
              all.push({tn:c.tagName,t:t,cl:cn.slice(0,60)});
            }
          });
          console.log('[DBG] Question:',q,'Answers:',ans.join(','),'Answer-like:',JSON.stringify(all.slice(0,12)));
          
          // Try EVERYTHING
          var done=false;
          document.querySelectorAll('[class*="answer"]').forEach(function(c){
            if(done)return;var t=(c.textContent||'').trim();
            if(ans.some(function(a){return t===a})&&c.offsetHeight>0){c.click();done=true;console.log('[Bot] answer class:',t)}
          });
          if(!done){document.querySelectorAll('*').forEach(function(c){
            if(done)return;var t=(c.textContent||'').trim();
            if(ans.some(function(a){return t===a})&&c.offsetHeight>0&&c.offsetHeight<250){c.click();done=true;console.log('[Bot] exact match:',t)}
          })}
          if(!done){document.querySelectorAll('div,button,span').forEach(function(c){
            if(done)return;var t=(c.textContent||'').trim();
            if(ans.some(function(a){return t.indexOf(a)>=0&&t.length<10})&&c.offsetHeight>0&&c.offsetHeight<200){c.click();done=true;console.log('[Bot] contains:',t)}
          })}
        }
        // Always click buttons
        document.querySelectorAll('button:not([disabled])').forEach(function(c){if(c.offsetHeight>0)c.click()});
        document.querySelectorAll('[role=button]').forEach(function(c){if(c.offsetHeight>0)c.click()});
      }catch(e){}
    },400);
  });
  console.log('Bot started');
  
  let lastGold=undefined;
  for(let t=0;t<60;t++){
    await p.waitForTimeout(1000);
    try{if(p.isClosed())break}catch(e){break}
    try{
      const r=await p.evaluate(()=>{
        function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
        for(var el of document.querySelectorAll('*')){
          var k=Object.keys(el).filter(x=>x.indexOf('__react')===0);if(!k.length)continue;
          var s=wF(el[k[0]],0);if(!s||(!s.question&&!s.stage&&s.gold===undefined&&s.weight===undefined&&s.choices===undefined))continue;
          return JSON.stringify({Q:s.question?(s.question.question||s.question.text):null,gold:s.gold,stage:s.stage,weight:s.weight,choices:!!s.choices});
        }
        return JSON.stringify({stage:'none'});
      });
      var d=JSON.parse(r||'{}');
      if(d.Q)process.stdout.write('Q'); else if(d.choices)process.stdout.write('C'); else if(d.stage&&d.stage!=='none')process.stdout.write(d.stage[0]); else process.stdout.write('.');
      if(d.gold!==undefined&&d.gold!==lastGold){lastGold=d.gold;console.log('\n💰',d.gold)}
    }catch(e){process.stdout.write('!')}
  }
  console.log('\nDone, final gold:',lastGold);
  await b.close().catch(()=>{});
})().catch(e=>console.error(e.message));
