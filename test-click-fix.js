const {chromium}=require('playwright-extra');
const StealthPlugin=require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());
(async()=>{
  const PIN='6405804';
  const b=await chromium.launch({headless:true,args:['--no-sandbox']});
  const ctx=await b.newContext({viewport:{width:1400,height:1000}});
  const p=await ctx.newPage();
  await p.goto('https://play.blooket.com/play',{waitUntil:'domcontentloaded',timeout:15000});await p.waitForTimeout(2000);
  await p.evaluate(()=>{document.querySelectorAll('button').forEach(b=>{var t=b.textContent||'';if(t.includes('Accept')||t.includes('Reject'))b.click()})});
  await p.waitForTimeout(2000);
  await p.locator('input[name=join-code]').click();await p.keyboard.type(PIN,{delay:80});
  await p.locator('button[type=submit]:not([disabled])').first().click({timeout:5000});await p.waitForTimeout(6000);
  try{const inputs=await p.$$('input');for(const i of inputs){const vis=await i.isVisible();if(vis){await i.click();await p.keyboard.type('C'+Math.floor(Math.random()*9000),{delay:50});await p.keyboard.press('Enter');break}}await p.waitForTimeout(3000)}catch(e){}
  await p.waitForTimeout(10000);
  console.log('URL:',p.url());
  
  // Ultra-aggressive answer click: click ANY element with text "b"
  for(let t=0;t<20;t++){
    await p.waitForTimeout(1000);
    const result=await p.evaluate(()=>{
      function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
      var hasQ=false,correct=[];
      for(var el of document.querySelectorAll('*')){var k=Object.keys(el).filter(x=>x.indexOf('__react')===0);if(!k.length)continue;var s=wF(el[k[0]],0);if(s&&s.question&&s.question.correctAnswers){hasQ=true;correct=Array.isArray(s.question.correctAnswers)?s.question.correctAnswers:[s.question.correctAnswers];break}}
      
      if(!hasQ)return JSON.stringify({noq:true});
      
      // Click ANY element with exact matching text  
      var clicked=false,clickedText='';
      document.querySelectorAll('*').forEach(function(el){
        if(clicked)return;
        var txt=(el.textContent||'').trim();
        if(txt===correct[0]&&el.offsetHeight>0&&el.offsetHeight<200){
          el.click();clicked=true;clickedText=txt;
        }
      });
      return JSON.stringify({q:true,correct:correct[0],clicked:clickedText});
    });
    const d=JSON.parse(result);
    if(d.q)console.log('ANSWER CLICK:',d.correct,'→',d.clicked);
    else process.stdout.write('.');
  }
  await p.screenshot({path:'/tmp/crypto-click-fix.png'});
  await b.close();
})();
