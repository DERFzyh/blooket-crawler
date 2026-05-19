/**
 * Quick login debug - check what the login page looks like
 */
const {chromium}=require('playwright-extra');
const StealthPlugin=require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

(async()=>{
const b=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const ctx=await b.newContext({viewport:{width:1400,height:1000}});

const p=await ctx.newPage();
await p.goto('https://id.blooket.com/login',{waitUntil:'domcontentloaded',timeout:30000});
await p.waitForTimeout(5000);

// Dump page info
const info=await p.evaluate(()=>{
const inputs=Array.from(document.querySelectorAll('input')).map(i=>({name:i.name||i.placeholder,type:i.type,id:i.id}));
const btns=Array.from(document.querySelectorAll('button')).map(b=>({text:(b.textContent||'').trim(),disabled:b.disabled}));
return JSON.stringify({title:document.title,url:location.href,inputs,buttons:btns,bodyTop:(document.body.innerText||'').slice(0,300)});
});
console.log(info);

await p.screenshot({path:'/tmp/blooket-login.png'});
console.log('Screenshot saved');

await b.close();
})().catch(e=>console.error('FATAL:',e.message));
