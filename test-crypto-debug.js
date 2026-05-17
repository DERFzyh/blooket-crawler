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
  
  // Login & Host
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
  await pHost.waitForTimeout(5000);
  await pHost.waitForTimeout(3000);
  
  const PIN=await pHost.evaluate(()=>{
    const el=document.querySelector('._idNumberText_1gorp_59, [class*="idNumber"]');
    return el?el.textContent.trim():null;
  });
  console.log('PIN:',PIN);
  
  // Join bot
  const pBot=await ctx.newPage();
  await pBot.goto('https://play.blooket.com/play',{waitUntil:'domcontentloaded',timeout:20000});
  await pBot.waitForTimeout(3000);
  try{await pBot.fill('input[placeholder*="Game ID" i]',PIN);await pBot.keyboard.press('Enter');}catch(e){}
  await pBot.waitForTimeout(4000);
  const ni=await pBot.$('input[placeholder*="name" i]');
  if(ni){await ni.fill('CryptoBot');await pBot.keyboard.press('Enter');}
  await pBot.waitForTimeout(3000);
  
  // Start
  await pHost.evaluate(()=>{document.querySelectorAll('button,[role=button]').forEach(b=>{if(b.textContent?.trim()==='Start')b.click()})});
  await pHost.waitForTimeout(3000);
  await pHost.evaluate(()=>{document.querySelectorAll('button,[role=button]').forEach(b=>{if(b.textContent?.includes('Skip'))b.click()})});
  await pHost.waitForTimeout(5000);
  console.log('Game URL:',pBot.url());
  
  // Wait for password guessing phase
  console.log('\nWaiting for password phase...');
  let foundPw=false;
  for(let t=0;t<20&&!foundPw;t++){
    await pBot.waitForTimeout(3000);
    const state=await pBot.evaluate(()=>{
      function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
      for(var el of document.querySelectorAll('*')){var k=Object.keys(el).filter(x=>x.indexOf('__react')===0);if(!k.length)continue;var s=wF(el[k[0]],0);
        if(s&&s.passwordOptions&&s.passwordOptions.length>0)return JSON.stringify({stage:s.stage,password:s.password,passwordOptions:s.passwordOptions});
        if(s&&s.question&&s.question.correctAnswers)return JSON.stringify({stage:'question',q:(s.question.question||s.question.text).slice(0,40)});
      }return JSON.stringify({stage:'none'});
    });
    const parsed=JSON.parse(state);
    console.log(`[${(t+1)*3}s]`,state);
    if(parsed.passwordOptions&&parsed.passwordOptions.length>0){
      foundPw=true;
      console.log('\n🔍 Dumping password screen DOM...');
      
      // Dump all clickable elements
      const dom=await pBot.evaluate(()=>{
        const elements=[];
        document.querySelectorAll('button, [role=button], div[class*="password"], div[class*="Password"], div[class*="option"], div[class*="Option"], div[class*="hack"], div[class*="Hack"], div[class*="guess"], div[class*="Guess"]').forEach(el=>{
          if(el.offsetHeight>0){
            elements.push({
              tag:el.tagName,
              text:el.textContent?.trim().slice(0,80),
              className:el.className?.slice(0,80),
              id:el.id
            });
          }
        });
        return JSON.stringify(elements);
      });
      console.log('Clickable elements:',dom);
      
      // Dump ALL visible elements with text
      const allText=await pBot.evaluate(()=>{
        const items=[];
        document.querySelectorAll('*').forEach(el=>{
          if(el.children.length===0&&el.textContent?.trim()&&el.offsetHeight>0){
            const t=el.textContent.trim();
            if(t.length>0&&t.length<50)items.push(t);
          }
        });
        return JSON.stringify(items.slice(0,30));
      });
      console.log('Text nodes:',allText);
      
      // Try to click password options differently
      console.log('\n🔧 Trying alternative click methods...');
      
      // Method 1: React state-based click
      const method1=await pBot.evaluate(()=>{
        function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
        for(var el of document.querySelectorAll('*')){var k=Object.keys(el).filter(x=>x.indexOf('__react')===0);if(!k.length)continue;var s=wF(el[k[0]],0);
          if(s&&s.passwordOptions&&s.passwordOptions.length>0){
            s.password=s.passwordOptions[0];
            if(s.forceUpdate)s.forceUpdate();
            return 'set pw to: '+s.passwordOptions[0];
          }
        }return'no state found';
      });
      console.log('Method1 (state override):',method1);
      
      // Check if it worked
      await pBot.waitForTimeout(2000);
      const afterState=await pBot.evaluate(()=>{
        function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
        for(var el of document.querySelectorAll('*')){var k=Object.keys(el).filter(x=>x.indexOf('__react')===0);if(!k.length)continue;var s=wF(el[k[0]],0);
          if(s&&s.passwordOptions)return JSON.stringify({pw:s.password,opts:s.passwordOptions,crypto:s.crypto});
        }return'none';
      });
      console.log('After override:',afterState);
    }
  }
  
  await pBot.screenshot({path:'/tmp/crypto-pw-debug.png'});
  await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
