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
  
  const pBot=await ctx.newPage();
  await pBot.goto('https://play.blooket.com/play',{waitUntil:'domcontentloaded',timeout:20000});
  await pBot.waitForTimeout(3000);
  try{await pBot.fill('input[placeholder*="Game ID" i]',PIN);await pBot.keyboard.press('Enter');}catch(e){}
  await pBot.waitForTimeout(4000);
  const ni=await pBot.$('input[placeholder*="name" i]');if(ni){await ni.fill('PwTest');await pBot.keyboard.press('Enter');}
  await pBot.waitForTimeout(3000);
  await pHost.evaluate(()=>{document.querySelectorAll('button,[role=button]').forEach(b=>{if(b.textContent?.trim()==='Start')b.click()})});
  await pHost.waitForTimeout(3000);
  await pHost.evaluate(()=>{document.querySelectorAll('button,[role=button]').forEach(b=>{if(b.textContent?.includes('Skip'))b.click()})});
  await pHost.waitForTimeout(5000);
  
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
        if(s&&s.passwordOptions&&s.passwordOptions.length>0&&s.correctPassword){
          // Click the CORRECT password
          var cp=s.correctPassword;
          document.querySelectorAll('[class*="button"],[role=button]').forEach(function(d){
            if(d.offsetHeight>0&&d.textContent?.trim()===cp){d.click()}
          });
          return JSON.stringify({type:'pw-guess',correct:cp,opts:s.passwordOptions.slice(0,3),crypto:s.crypto});
        }
        if(s&&s.stage) return JSON.stringify({type:'stage',stage:s.stage});
      }return JSON.stringify({type:'none'});
    });
    const d=JSON.parse(r);
    console.log(`[${(t+1)*2}s]`,r.slice(0,250));
    if(d.crypto>0||d.type==='pw-guess') console.log('  ✅ GUESS MADE!');
  }
  
  await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
