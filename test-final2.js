const {chromium}=require('playwright-extra');
const StealthPlugin=require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());
(async()=>{
  const b=await chromium.launch({headless:true,args:['--no-sandbox']});
  const ctx=await b.newContext({viewport:{width:1400,height:1000}});
  const p=await ctx.newPage();

  // Login
  console.log('Login...');
  await p.goto('https://id.blooket.com/login',{waitUntil:'domcontentloaded',timeout:20000});
  await p.waitForTimeout(3000);
  await p.fill('input[name=username]','fred11zyh@outlook.com');
  await p.fill('input[name=password]','ZYH11fred@blooket');
  await p.click('button[type=submit]');
  await p.waitForTimeout(6000);
  console.log('Logged in');
  console.log('Cookies:',(await ctx.cookies()).map(c=>c.name+'@'+c.domain).join(', '));

  // Host Fishing
  console.log('Hosting...');
  await p.goto('https://play.blooket.com/host?id=685d405f64022b0fbe8ac753',{waitUntil:'domcontentloaded',timeout:20000});
  await p.waitForTimeout(4000);
  await p.click('img[alt="Select Fishing Frenzy"]');await p.waitForTimeout(1000);
  await p.click('button:has-text("Host")');await p.waitForTimeout(5000);
  await p.waitForTimeout(3000);
  await p.click('#hostNow');await p.waitForTimeout(5000);
  const PIN=await p.evaluate(()=>document.querySelector('._idNumberText_1gorp_59')?.textContent?.trim());
  console.log('PIN:',PIN);

  // Join bot - with proper cookie consent handling
  console.log('Joining bot...');
  const pBot=await ctx.newPage();
  
  // Add init script for this page too
  await pBot.addInitScript(()=>{
    setInterval(()=>{
      document.querySelectorAll('button').forEach(b=>{
        if(b.textContent.includes('Accept')&&b.offsetHeight>0)b.click();
      });
    },300);
  });
  
  await pBot.goto('https://play.blooket.com/play',{waitUntil:'domcontentloaded',timeout:20000});
  await pBot.waitForTimeout(4000); // Wait for auto-dismiss
  
  // Force dismiss consent and find PIN input
  const foundPinInput=await pBot.evaluate(()=>{
    // Kill consent
    document.querySelectorAll('button').forEach(b=>{if(b.textContent.includes('Accept'))b.click();});
    // Find first visible input
    const inputs=document.querySelectorAll('input');
    for(const i of inputs){
      if(i.offsetHeight>0&&i.type!=='hidden')return true;
    }
    return false;
  });
  console.log('Found pin input:',foundPinInput);
  
  if(foundPinInput){
    const inputs=await pBot.$$('input');
    for(const inp of inputs){
      try{
        const visible=await inp.isVisible();
        if(visible){
          await inp.fill(PIN);
          await pBot.keyboard.press('Enter');
          break;
        }
      }catch(e){}
    }
  }
  await pBot.waitForTimeout(4000);
  
  // Enter name
  const nameFilled=await pBot.evaluate(({name})=>{
    const inputs=document.querySelectorAll('input');
    for(const i of inputs){
      if(i.offsetHeight>0&&!i.readOnly&&i.type!=='hidden'){
        i.value=name;
        i.dispatchEvent(new Event('input',{bubbles:true}));
        i.dispatchEvent(new Event('change',{bubbles:true}));
        const form=i.closest('form');
        if(form)form.dispatchEvent(new Event('submit',{bubbles:true}));
        return true;
      }
    }
    return false;
  },{name:'Bot'});
  console.log('Name filled:',nameFilled);
  await pBot.waitForTimeout(3000);
  
  if(nameFilled){
    await pBot.keyboard.press('Enter');
    await pBot.waitForTimeout(3000);
  }
  console.log('Bot URL:',pBot.url());

  // Also join second bot quickly
  const pBot2=await ctx.newPage();
  await pBot2.addInitScript(()=>{
    setInterval(()=>{
      document.querySelectorAll('button').forEach(b=>{
        if(b.textContent.includes('Accept')&&b.offsetHeight>0)b.click();
      });
    },300);
  });
  await pBot2.goto('https://play.blooket.com/play',{waitUntil:'domcontentloaded',timeout:20000});
  await pBot2.waitForTimeout(4000);
  
  await pBot2.evaluate(({pin,name})=>{
    document.querySelectorAll('button').forEach(b=>{if(b.textContent.includes('Accept'))b.click();});
    const inputs=document.querySelectorAll('input');
    for(const i of inputs){if(i.offsetHeight>0){i.value=pin;i.dispatchEvent(new Event('input',{bubbles:true}));break}}
    setTimeout(()=>{
      const inputs2=document.querySelectorAll('input');
      for(const i of inputs2){if(i.offsetHeight>0&&!i.readOnly){i.value=name;i.dispatchEvent(new Event('input',{bubbles:true}));break}}
    },3000);
  },{pin:PIN,name:'Bot2'});
  await pBot2.waitForTimeout(3000);
  await pBot2.keyboard.press('Enter');
  await pBot2.waitForTimeout(4000);
  await pBot2.keyboard.press('Enter');
  await pBot2.waitForTimeout(2000);
  console.log('Bot2 URL:',pBot2.url());

  // Start game
  await p.waitForTimeout(3000);
  await p.evaluate(()=>{
    document.querySelectorAll('[role=button], button').forEach(e=>{
      if(e.textContent.trim().includes('Start'))e.click();
    });
  });
  await p.waitForTimeout(4000);
  await p.evaluate(()=>{
    document.querySelectorAll('[role=button], button').forEach(e=>{
      if(e.textContent.trim()==='Skip')e.click();
    });
  });
  await p.waitForTimeout(6000);
  console.log('Game running!');

  // Check frames on bot1
  const frames=pBot.frames();
  console.log('Bot1 frames:',frames.length);
  for(let j=0;j<frames.length;j++){
    const f=frames[j];
    console.log(`Frame ${j}: ${f.url().slice(0,100)}`);
    try{
      const state=await f.evaluate(()=>{
        for(const el of document.querySelectorAll('*')){
          const keys=Object.keys(el).filter(k=>k.startsWith('__react'));
          if(keys.length>0){let node=el[keys[0]];
            for(let k=0;k<40&&node;k++){
              const s=node.stateNode?.state;
              if(s?.question?.correctAnswers){
                return JSON.stringify({s:s.stage,q:s.question.text?.slice(0,50),correct:Array.isArray(s.question.correctAnswers)?s.question.correctAnswers.join(','):s.question.correctAnswers,w:s.weight});
              }
              if(s?.stage&&s?.stage!=='none')return JSON.stringify({s:s.stage});
              node=node.return||node.child||node.sibling;
            }
          }
        }
        return JSON.stringify({s:'none'});
      });
      console.log(`  State: ${state}`);
    }catch(e){console.log(`  Err: ${e.message.slice(0,100)}`);}
  }

  await pBot.screenshot({path:'/tmp/final-test.png'});
  console.log('Done!');
  await b.close();
})().catch(e=>{console.error('FATAL:',e.message);process.exit(1);});
