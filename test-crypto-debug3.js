const {chromium}=require('playwright-extra');
const StealthPlugin=require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

(async()=>{
  const b=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  const ctx=await b.newContext({viewport:{width:1400,height:1000}});
  await ctx.addInitScript(()=>{
    Object.defineProperty(navigator,'webdriver',{get:()=>false});
    setInterval(()=>{document.querySelectorAll('button').forEach(b=>{if(b.textContent?.includes('Accept'))b.click()})},500);
  });
  
  // Host + Join (same as before)
  const pHost=await ctx.newPage();
  await pHost.goto('https://id.blooket.com/login',{waitUntil:'domcontentloaded',timeout:20000});
  await pHost.waitForTimeout(3000);
  await pHost.fill('input[name=username]','fred11zyh@outlook.com');
  await pHost.fill('input[name=password]','ZYH11fred@blooket');
  await pHost.click('button[type=submit]');
  await pHost.waitForTimeout(6000);
  await pHost.goto('https://play.blooket.com/host?id=685d405f64022b0fbe8ac753',{waitUntil:'domcontentloaded',timeout:20000});
  await pHost.waitForTimeout(4000);
  await pHost.click('img[alt="Select Crypto Hack"]');
  await pHost.waitForTimeout(1000);
  await pHost.click('button:has-text("Host")');
  await pHost.waitForTimeout(5000);await pHost.waitForTimeout(3000);
  const hhn=await pHost.$('#hostNow');if(hhn){await pHost.click('#hostNow');await pHost.waitForTimeout(5000);}
  const PIN=await pHost.evaluate(()=>document.querySelector('._idNumberText_1gorp_59, [class*="idNumber"]')?.textContent?.trim());
  if(!PIN){console.log('No PIN');await b.close();return;}
  console.log('PIN:',PIN);
  
  const pBot=await ctx.newPage();
  pBot.on('console',msg=>{if(msg.type()==='log')console.log('  [BROWSER]',msg.text())});
  await pBot.goto('https://play.blooket.com/play',{waitUntil:'domcontentloaded',timeout:20000});
  await pBot.waitForTimeout(3000);
  try{await pBot.fill('input[placeholder*="Game ID" i]',PIN);await pBot.keyboard.press('Enter');}catch(e){}
  await pBot.waitForTimeout(4000);
  const ni=await pBot.$('input[placeholder*="name" i]');if(ni){await ni.fill('PwBot');await pBot.keyboard.press('Enter');}
  await pBot.waitForTimeout(3000);
  await pHost.evaluate(()=>{document.querySelectorAll('button,[role=button]').forEach(b=>{if(b.textContent?.trim()==='Start')b.click()})});
  await pHost.waitForTimeout(3000);
  await pHost.evaluate(()=>{document.querySelectorAll('button,[role=button]').forEach(b=>{if(b.textContent?.includes('Skip'))b.click()})});
  await pHost.waitForTimeout(5000);
  
  // Answer questions until password phase
  console.log('Waiting for password phase...');
  for(let t=0;t<30;t++){
    await pBot.waitForTimeout(2000);
    const r=await pBot.evaluate(()=>{
      function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
      for(var el of document.querySelectorAll('*')){var k=Object.keys(el).filter(x=>x.indexOf('__react')===0);if(!k.length)continue;var s=wF(el[k[0]],0);
        if(s&&s.question&&s.question.correctAnswers){
          var ca=Array.isArray(s.question.correctAnswers)?s.question.correctAnswers:[s.question.correctAnswers];
          document.querySelectorAll('[class*="answerContainer"]').forEach(function(c){
            var t=(c.textContent||'').trim();
            if(ca.some(function(a){return(a||'').toString().trim()===t})&&c.offsetHeight>0)c.click();
          });
          return JSON.stringify({type:'q',q:(s.question.question||s.question.text).slice(0,30),crypto:s.crypto});
        }
        if(s&&s.passwordOptions&&s.passwordOptions.length>0){
          // DUMP ALL password option DOM elements
          var pwDivs=[];
          document.querySelectorAll('[class*="button"]').forEach(function(d){
            if(d.offsetHeight>0){
              var t=d.textContent?.trim();
              if(t&&s.passwordOptions.indexOf(t)>=0) pwDivs.push({text:t,class:d.className?.slice(0,60),tag:d.tagName,attrs:Array.from(d.attributes).map(a=>a.name+'='+a.value).join(';')})
            }
          });
          return JSON.stringify({type:'pw',pw:s.password,opts:s.passwordOptions,crypto:s.crypto,pwDivs:pwDivs});
        }
        if(s&&s.stage) return JSON.stringify({type:'stage',stage:s.stage});
      }return JSON.stringify({type:'none'});
    });
    const d=JSON.parse(r);
    console.log(`[${(t+1)*2}s]`,r.slice(0,300));
    if(d.type==='pw'){
      console.log('PASSWORD OPTIONS FOUND!');
      console.log('  password:',d.pw||'(empty)');
      console.log('  options:',d.opts);
      console.log('  DOM elements:');
      d.pwDivs.forEach(el=>console.log('    ',JSON.stringify(el)));
      
      // Now try: answer the question, then try each option one at a time
      // First, let me find the correct answer from the React state
      const allState=await pBot.evaluate(()=>{
        function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
        for(var el of document.querySelectorAll('*')){
          var k=Object.keys(el).filter(x=>x.indexOf('__react')===0);if(!k.length)continue;
          var s=wF(el[k[0]],0);
          if(s&&s.passwordOptions){
            // Dump ALL keys in this state  
            return JSON.stringify(Object.keys(s).sort());
          }
        }return'[]';
      });
      console.log('ALL STATE KEYS:',allState);
      
      // Try clicking a DIFFERENT option this time
      const tryPw=d.opts[2]; // Try the 3rd option
      console.log('Trying to click option:',tryPw);
      await pBot.evaluate((pw)=>{
        document.querySelectorAll('[class*="button"]').forEach(function(d){
          if(d.offsetHeight>0&&d.textContent?.trim()===pw){
            console.log('Clicking:',d.textContent.trim(),'class:',d.className);
            d.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));
            d.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));
            d.dispatchEvent(new MouseEvent('click',{bubbles:true}));
          }
        });
      },tryPw);
      
      // Wait to see result
      await pBot.waitForTimeout(3000);
      const after=await pBot.evaluate(()=>{
        function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
        for(var el of document.querySelectorAll('*')){var k=Object.keys(el).filter(x=>x.indexOf('__react')===0);if(!k.length)continue;var s=wF(el[k[0]],0);
          if(s&&s.passwordOptions) return JSON.stringify({pw:s.password,crypto:s.crypto,stage:s.stage});
        }return'none';
      });
      console.log('After click:',after);
      break;
    }
  }
  
  await pBot.screenshot({path:'/tmp/crypto-pw-dom.png'});
  await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
