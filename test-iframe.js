const {chromium}=require('playwright-extra');
const StealthPlugin=require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());
(async()=>{
  const b=await chromium.launch({headless:true,args:['--no-sandbox']});
  const ctx=await b.newContext({viewport:{width:1400,height:1000}});
  await ctx.addInitScript(()=>{Object.defineProperty(navigator,'webdriver',{get:()=>false})});
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

  // Host Fishing
  console.log('Hosting...');
  await p.goto('https://play.blooket.com/host?id=685d405f64022b0fbe8ac753',{waitUntil:'domcontentloaded',timeout:20000});
  await p.waitForTimeout(4000);
  await p.click('img[alt="Select Fishing Frenzy"]');await p.waitForTimeout(1000);
  await p.click('button:has-text("Host")');await p.waitForTimeout(5000);
  await p.waitForTimeout(3000);
  await p.click('div[id="hostNow"]');  
  await p.waitForTimeout(5000);
  const PIN=await p.evaluate(()=>document.querySelector('._idNumberText_1gorp_59')?.textContent?.trim());
  console.log('PIN:',PIN);

  // Join 2 bots
  async function join(name){
    const pg=await ctx.newPage();
    await pg.goto('https://play.blooket.com/play',{waitUntil:'domcontentloaded',timeout:20000});
    await pg.waitForTimeout(3000);
    const inputs=await pg.$$('input');
    if(inputs.length>0){await inputs[0].fill(PIN);await pg.keyboard.press('Enter');}
    await pg.waitForTimeout(4000);
    const inputs2=await pg.$$('input');
    if(inputs2.length>0){try{await inputs2[0].fill(name);await pg.keyboard.press('Enter');}catch(e){}}
    await pg.waitForTimeout(2000);
    return pg;
  }
  
  try{const bot1=await join('Bot1');console.log('Bot1 joined');}catch(e){console.log('Bot1 error:',e.message);}
  try{const bot2=await join('Bot2');console.log('Bot2 joined');}catch(e){console.log('Bot2 error:',e.message);}
  
  // Click Start
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

  // Check bot pages for frames
  const pages=ctx.pages();
  console.log('Total pages:',pages.length);
  for(let i=0;i<pages.length;i++){
    const pg=pages[i];
    console.log(`Page ${i}: ${pg.url().slice(0,80)}`);
    const frames=pg.frames();
    console.log(`  Frames: ${frames.length}`);
    for(let j=0;j<frames.length;j++){
      const f=frames[j];
      console.log(`  Frame ${j}: ${f.url().slice(0,120)}`);
      try{
        const state=await f.evaluate(()=>{
          try{
            for(const el of document.querySelectorAll('*')){
              const keys=Object.keys(el).filter(k=>k.startsWith('__react'));
              if(keys.length>0){
                let node=el[keys[0]];
                for(let k=0;k<40&&node;k++){
                  const s=node.stateNode?.state;
                  if(s?.question?.correctAnswers){
                    return JSON.stringify({
                      stage:s.stage,
                      q:s.question.text?.slice(0,60)||s.question.question?.slice(0,60),
                      correct:Array.isArray(s.question.correctAnswers)?s.question.correctAnswers.join(','):s.question.correctAnswers,
                      weight:s.weight
                    });
                  }
                  if(s?.stage)return JSON.stringify({stage:s.stage});
                  node=node.return||node.child||node.sibling;
                }
              }
            }
            return JSON.stringify({stage:'none',title:document.title});
          }catch(e){return JSON.stringify({e:e.message});}
        });
        console.log(`    React: ${state}`);
      }catch(e){}
    }
  }

  await b.close();
  console.log('DONE');
})().catch(e=>{console.error(e.message);process.exit(1);});
