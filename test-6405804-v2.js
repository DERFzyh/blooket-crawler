const {chromium}=require('playwright-extra');
const StealthPlugin=require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());
(async()=>{
  const PIN='6405804';
  const b=await chromium.launch({headless:true,args:['--no-sandbox']});
  const ctx=await b.newContext({viewport:{width:1400,height:1000}});
  const p=await ctx.newPage();
  p.on('console', msg => console.log('🌐', msg.text()));
  
  await p.goto('https://play.blooket.com/play',{waitUntil:'domcontentloaded',timeout:15000});
  await p.waitForTimeout(3000);
  await p.evaluate(()=>{document.querySelectorAll('button').forEach(b=>{var t=b.textContent||'';if(t.includes('Accept')||t.includes('Reject'))b.click()})});
  await p.waitForTimeout(2000);
  
  await p.locator('input[name=join-code]').click();
  await p.keyboard.type(PIN,{delay:80});
  console.log('PIN entered');
  
  await p.locator('button[type=submit]:not([disabled])').first().click({timeout:5000});
  await p.waitForTimeout(6000);
  console.log('After submit, URL:', p.url());
  
  // Dump page HTML for the register page
  if(p.url().includes('register')){
    console.log('=== On register page, dumping form HTML ===');
    const html = await p.evaluate(()=>{
      // Find all input, button, and form elements
      var inputs = [...document.querySelectorAll('input')].map(i=>({
        name:i.name,type:i.type,placeholder:i.placeholder,className:i.className,visible:i.offsetHeight>0
      }));
      var buttons = [...document.querySelectorAll('button,[role=button]')].map(b=>({
        text:(b.textContent||'').trim(),className:b.className,visible:b.offsetHeight>0
      }));
      return JSON.stringify({inputs,buttons});
    });
    console.log(html);
    
    // Try to fill name and join
    try{
      const name='Bot'+Math.floor(Math.random()*9000);
      // Find the name input - on crypto hack it might be different
      const inputs = await p.$$('input');
      for(const i of inputs){
        const vis=await i.isVisible();
        const nameAttr=await i.getAttribute('name');
        const typeAttr=await i.getAttribute('type');
        const placeholder=await i.getAttribute('placeholder')||'';
        console.log(`Input: name="${nameAttr}" type="${typeAttr}" placeholder="${placeholder}" visible=${vis}`);
        if(vis && typeAttr!=='hidden' && !nameAttr?.includes('join')){
          await i.click();await i.fill('');await p.keyboard.type(name,{delay:50});
          console.log('Filled name:',name);
          break;
        }
      }
      await p.waitForTimeout(1000);
      // Try clicking join/pay button
      var joined=false;
      for(const sel of ['[class*=joinButton]','[class*=playButton]','[class*=registerButton]','button','[role=button]']){
        try{
          const btns=await p.$$(sel);
          for(const btn of btns){
            const txt=((await btn.textContent())||'').trim().toLowerCase();
            if(txt.includes('join')||txt.includes('play')||txt.includes('enter')||txt.includes('register')||txt.includes('pay')){
              if(await btn.isVisible()){
                await btn.click();joined=true;
                console.log('Clicked:',txt,'(',sel,')');
                break;
              }
            }
          }
        }catch(e){}
        if(joined)break;
      }
      if(!joined)console.log('No join button found, trying Enter');
      await p.keyboard.press('Enter');
      await p.waitForTimeout(5000);
      console.log('After join attempt, URL:', p.url());
    }catch(e){console.log('Join error:',e.message);}
  }
  
  await p.waitForTimeout(10000);
  console.log('=== Final URL:', p.url(), '===');
  
  // Now dump game state and answer structure
  for(let t=0;t<24;t++){
    await p.waitForTimeout(3000);
    const r=await p.evaluate(()=>{
      function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
      var result={stage:'none',url:location.href};
      
      for(var el of document.querySelectorAll('*')){
        var k=Object.keys(el).filter(x=>x.indexOf('__react')===0);if(!k.length)continue;
        var s=wF(el[k[0]],0);if(!s)continue;
        
        if(s.question||s.stage||s.gold!==undefined||s.weight!==undefined||s.crypto!==undefined||s.password!==undefined){
          result.foundReact=true;
          result.stage=s.stage;
          result.gold=s.gold;
          result.weight=s.weight;
          result.crypto=s.crypto;
          result.password=s.password;
          result.correctPassword=s.correctPassword;
          result.passwordOptions=s.passwordOptions?JSON.stringify(s.passwordOptions):undefined;
          
          if(s.question){
            result.questionText=s.question.question||s.question.text;
            result.correctAnswersRaw=JSON.stringify(s.question.correctAnswers);
            result.questionKeys=Object.keys(s.question);
          }
          
          // Dump ALL visible clickable elements
          var all=[];
          document.querySelectorAll('div,p,span,button,[role=button]').forEach(function(c){
            if(!c.offsetHeight||c.offsetHeight>300)return;
            var t=(c.textContent||'').trim();
            if(!t||t.length>80)return;
            all.push({tag:c.tagName,t:t.substring(0,40),cls:(c.className||'').substring(0,60)});
          });
          result.visibleElements=all.slice(0,25);
          
          // Dump answer-related elements specifically
          var ans=[];
          document.querySelectorAll('*').forEach(function(c){
            if(!c.offsetHeight||c.offsetHeight>300)return;
            var cn=c.className||'';
            if(cn.match(/answer|choice|question|option|select/i)){
              var t=(c.textContent||'').trim();
              if(t)ans.push({tag:c.tagName,t:t.substring(0,40),cls:cn.substring(0,60)});
            }
          });
          result.answerEls=ans.slice(0,10);
          break;
        }
      }
      return JSON.stringify(result);
    });
    var d=JSON.parse(r);
    if(d.foundReact){
      console.log(`[${t}] stage:${d.stage} gold:${d.gold} crypto:${d.crypto} password:${d.password} correctPassword:${d.correctPassword}`);
      if(d.questionText)console.log(`       Q: ${d.questionText}`);
      if(d.correctAnswersRaw)console.log(`       A: ${d.correctAnswersRaw}`);
      if(d.questionKeys)console.log(`       Q-keys: ${d.questionKeys.join(',')}`);
      if(d.answerEls&&d.answerEls.length>0)console.log(`       Answer Elms:`, JSON.stringify(d.answerEls));
      if(d.visibleElements&&d.visibleElements.length>0)console.log(`       Visible:`, JSON.stringify(d.visibleElements));
    } else {
      process.stdout.write('.');
    }
  }
  
  await p.screenshot({path:'/tmp/game-6405804-v2.png'});
  console.log('DONE');
  await b.close();
})();
