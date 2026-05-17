const {chromium}=require('playwright-extra');
const StealthPlugin=require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());
(async()=>{
  const b=await chromium.launch({headless:true,args:['--no-sandbox']});
  const ctx=await b.newContext({viewport:{width:1400,height:1000}});
  await ctx.addInitScript(()=>{Object.defineProperty(navigator,'webdriver',{get:()=>false})});
  const p=await ctx.newPage();

  // Login
  await p.goto('https://id.blooket.com/login',{waitUntil:'domcontentloaded',timeout:30000});
  await p.waitForTimeout(4000);
  await p.fill('input[name=username]','fred11zyh@outlook.com');
  await p.fill('input[name=password]','ZYH11fred@blooket');
  await p.click('button[type=submit]');
  await p.waitForTimeout(8000);

  // Host Fishing
  await p.goto('https://play.blooket.com/host?id=685d405f64022b0fbe8ac753',{waitUntil:'domcontentloaded',timeout:30000});
  await p.waitForTimeout(5000);
  await p.click('img[alt="Select Fishing Frenzy"]');await p.waitForTimeout(1000);
  await p.click('button:has-text("Host")');await p.waitForTimeout(6000);
  await p.waitForTimeout(4000);
  await p.click('#hostNow');await p.waitForTimeout(6000);
  const PIN=await p.evaluate(()=>document.querySelector('._idNumberText_1gorp_59')?.textContent.trim());
  console.log('PIN:',PIN);

  // Join 2 bots
  async function join(name){
    const pg=await ctx.newPage();
    await pg.goto('https://play.blooket.com/play',{waitUntil:'domcontentloaded',timeout:30000});
    await pg.waitForTimeout(4000);
    await pg.fill('input[placeholder*="Game ID" i]',PIN);
    await pg.keyboard.press('Enter');await pg.waitForTimeout(4000);
    const ni=await pg.$('input[placeholder*="name" i]');
    if(ni){await ni.fill(name);await pg.keyboard.press('Enter');}
    await pg.waitForTimeout(3000);
    return pg;
  }
  const bot1=await join('Bot1');console.log('Bot1 joined');
  const bot2=await join('Bot2');console.log('Bot2 joined');
  await p.waitForTimeout(3000);

  // Start
  await p.evaluate(()=>{document.querySelectorAll('[role=button]').forEach(e=>{if(e.textContent.trim().includes('Start'))e.click()})});
  await p.waitForTimeout(4000);
  await p.evaluate(()=>{document.querySelectorAll('[role=button]').forEach(e=>{if(e.textContent==='Skip')e.click()})});
  await p.waitForTimeout(6000);
  console.log('Game started. Bot URL:',bot1.url());

  // DOM debug on bot
  const dom=await bot1.evaluate(()=>{
    const r={url:location.href,iframes:document.querySelectorAll('iframe').length};
    // Check all elements for React keys
    const all=document.querySelectorAll('*');
    for(const el of all){
      const keys=Object.keys(el).filter(k=>k.startsWith('__react'));
      if(keys.length>0){
        r.firstReact={tag:el.tagName,keys};
        let node=el[keys[0]];
        for(let i=0;i<30&&node;i++){
          try{const s=node.stateNode?.state;if(s){r.state={stage:s.stage,hasQ:!!s.question,gold:s.gold,n:s.question?.text?.slice(0,50)};break}}catch(e){}
          node=node.return||node.child||node.sibling;
        }
        break;
      }
    }
    return JSON.stringify(r);
  });
  console.log('DOM:',dom);

  await bot1.screenshot({path:'/tmp/fish-dom-debug.png'});
  console.log('Screenshot saved');
  await b.close();
})().catch(e=>{console.error(e.message);process.exit(1);});
