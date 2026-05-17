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
  
  // Host
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
  const hasHostNow=await pHost.$('#hostNow');
  if(hasHostNow){await pHost.click('#hostNow');await pHost.waitForTimeout(5000);}
  
  const PIN=await pHost.evaluate(()=>{
    const el=document.querySelector('._idNumberText_1gorp_59, [class*="idNumber"]');
    return el?el.textContent.trim():null;
  });
  if(!PIN){console.log('No PIN');await b.close();return;}
  console.log('PIN:',PIN);
  
  // Join bot
  const pBot=await ctx.newPage();
  await pBot.goto('https://play.blooket.com/play',{waitUntil:'domcontentloaded',timeout:20000});
  await pBot.waitForTimeout(3000);
  try{await pBot.fill('input[placeholder*="Game ID" i]',PIN);await pBot.keyboard.press('Enter');}catch(e){}
  await pBot.waitForTimeout(4000);
  const ni=await pBot.$('input[placeholder*="name" i]');
  if(ni){await ni.fill('DebugBot');await pBot.keyboard.press('Enter');}
  await pBot.waitForTimeout(3000);
  
  // Start
  await pHost.evaluate(()=>{document.querySelectorAll('button,[role=button]').forEach(b=>{if(b.textContent?.trim()==='Start')b.click()})});
  await pHost.waitForTimeout(3000);
  await pHost.evaluate(()=>{document.querySelectorAll('button,[role=button]').forEach(b=>{if(b.textContent?.includes('Skip'))b.click()})});
  await pHost.waitForTimeout(5000);
  console.log('Bot URL:',pBot.url());
  
  // Capture browser console
  pBot.on('console', msg => {
    if(msg.type()==='log') console.log('  [BROWSER]', msg.text());
  });
  
  // Wait for password phase
  let pwDone=false;
  for(let t=0;t<30&&!pwDone;t++){
    await pBot.waitForTimeout(3000);
    
    // Check state with full debug
    const dbg=await pBot.evaluate(()=>{
      function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
      for(var el of document.querySelectorAll('*')){
        var k=Object.keys(el).filter(x=>x.indexOf('__react')===0);if(!k.length)continue;
        var s=wF(el[k[0]],0);if(!s)continue;
        if(s.passwordOptions&&s.passwordOptions.length>0){
          // Found password state - try direct override
          console.log('[DEBUG] Found pw state: pw='+s.password+' opts='+JSON.stringify(s.passwordOptions));
          
          // Method 1: Direct state modification
          s.password = s.passwordOptions[0];
          console.log('[DEBUG] Set pw to: '+s.passwordOptions[0]);
          
          // Find and try to call forceUpdate on the component
          var node = el[k[0]];
          for(var d=0;d<20&&node;d++){
            try{
              if(node.stateNode&&node.stateNode.forceUpdate){
                console.log('[DEBUG] Calling forceUpdate at depth '+d);
                node.stateNode.forceUpdate();
                break;
              }
              if(node.stateNode&&node.stateNode.setState){
                console.log('[DEBUG] Calling setState at depth '+d);
                node.stateNode.setState({});
                break;
              }
            }catch(e){console.log('[DEBUG] forceUpdate err: '+e.message)}
            node = node.return;
          }
          
          // Method 2: Try DOM click with broad approach
          var opts=s.passwordOptions;
          var anyClicked=false;
          document.querySelectorAll('*').forEach(function(el){
            if(anyClicked)return;
            var t=(el.textContent||'').trim();
            for(var i=0;i<opts.length;i++){
              if(t===opts[i]&&el.offsetHeight>0){
                el.click();
                console.log('[DEBUG] Clicked element with text: '+t+' tag:'+el.tagName+' class:'+el.className);
                anyClicked=true;
                return;
              }
            }
          });
          
          return JSON.stringify({
            stage:'guessing',pw:s.password,opts:s.passwordOptions,crypto:s.crypto,
            clicked:anyClicked
          });
        }
        if(s.question&&s.question.correctAnswers){
          var ca=Array.isArray(s.question.correctAnswers)?s.question.correctAnswers:[s.question.correctAnswers];
          document.querySelectorAll('[class*="answerContainer"]').forEach(function(c){
            var t=(c.textContent||'').trim();
            if(ca.some(function(a){return(a||'').toString().trim()===t})&&c.offsetHeight>0){c.click();console.log('[DEBUG] Answered: '+t)}
          });
          return JSON.stringify({stage:'question',q:(s.question.question||s.question.text).slice(0,35),crypto:s.crypto});
        }
      }
      return JSON.stringify({stage:'none'});
    });
    
    const parsed=JSON.parse(dbg);
    console.log(`[${(t+1)*3}s]`,JSON.stringify(parsed));
    
    // Also click any visible buttons to advance
    await pBot.evaluate(()=>{
      document.querySelectorAll('button:not([disabled])').forEach(b=>{if(b.offsetHeight>0)b.click()});
      document.querySelectorAll('[role=button]').forEach(b=>{if(b.offsetHeight>0)b.click()});
    });
    
    if(parsed.crypto>0) pwDone=true;
  }
  
  await pBot.screenshot({path:'/tmp/crypto-debug3.png'});
  await b.close();
  console.log('Done');
})().catch(e=>{console.error(e);process.exit(1);});
