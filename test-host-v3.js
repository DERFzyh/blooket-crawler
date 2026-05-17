const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  
  // Auto-dismiss cookie consent and hide webdriver
  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    
    // Auto-dismiss cookie popup
    const observer = new MutationObserver(() => {
      const btns = document.querySelectorAll('button');
      for (const b of btns) {
        if (b.textContent.includes('Accept All') || b.textContent.includes('Accept')) {
          b.click();
          observer.disconnect();
          return;
        }
      }
    });
    observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
    
    // Also try immediate
    setTimeout(() => {
      document.querySelectorAll('button').forEach(b => {
        if (b.textContent.includes('Accept')) b.click();
      });
    }, 1500);
  });
  
  const p = await ctx.newPage();
  
  // Login
  console.log('1. Login...');
  await p.goto('https://id.blooket.com/login', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await p.waitForTimeout(3000);
  
  await p.fill('input[name="username"]', 'fred11zyh@outlook.com');
  await p.fill('input[name="password"]', 'ZYH11fred@blooket');
  await p.click('button[type="submit"]');
  await p.waitForTimeout(6000);
  console.log('   URL:', p.url());
  
  if (!p.url().includes('dashboard')) {
    console.log('   ❌ Login may have failed');
    await p.screenshot({ path: '/tmp/login-fail.png' });
    await browser.close();
    return;
  }
  console.log('   ✅ Logged in');
  
  // Navigate to discover sets, search for fishing
  console.log('\n2. Discover sets...');
  await p.goto('https://dashboard.blooket.com/discover?search=fishing+frenzy', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await p.waitForTimeout(4000);
  console.log('   URL:', p.url());
  
  // Find and click a set
  const setLinks = await p.$$('a[href*="/set/"]');
  console.log(`   Found ${setLinks.length} set links`);
  if (setLinks.length > 0) {
    const linkText = await setLinks[0].textContent();
    console.log(`   Clicking: "${linkText?.trim()?.slice(0, 60)}"`);
    await setLinks[0].click();
    await p.waitForTimeout(4000);
    console.log('   Set page URL:', p.url());
    
    // Look for Host button
    const hostBtn = await p.$('button:has-text("Host"), a:has-text("Host"), button:has-text("Solo")');
    if (hostBtn) {
      console.log('   Found Host button!');
      const btnText = await hostBtn.textContent();
      console.log(`   Button text: "${btnText?.trim()}"`);
      await hostBtn.click();
      await p.waitForTimeout(3000);
      console.log('   After clicking Host:', p.url());
      
      // Check for game mode selection
      const modeButtons = await p.$$('button');
      for (const btn of modeButtons) {
        const t = await btn.textContent();
        if (t && (t.includes('Fishing') || t.includes('Gold') || t.includes('Host'))) {
          console.log(`   Mode button: "${t.trim().slice(0, 40)}"`);
        }
      }
      
      // Select Fishing Frenzy if available
      const fishingBtn = await p.$('button:has-text("Fishing Frenzy")');
      if (fishingBtn) {
        await fishingBtn.click();
        await p.waitForTimeout(2000);
        console.log('   Selected Fishing Frenzy');
      }
      
      // Click final Host
      const finalHost = await p.$('button:has-text("Host Game"), button:has-text("Host Now")');
      if (finalHost) {
        await finalHost.click();
        await p.waitForTimeout(5000);
        console.log('   After final host:', p.url());
        
        // Look for PIN
        const bodyText = await p.$eval('body', el => el.textContent);
        const pinMatch = bodyText.match(/\b\d{6,7}\b/);
        if (pinMatch) console.log(`   🎯 GAME PIN: ${pinMatch[0]}`);
      }
    }
  }
  
  await p.screenshot({ path: '/tmp/final-host.png' });
  console.log('\n   Screenshot saved');
  
  await browser.close();
  console.log('Done!');
})().catch(e => { console.error(e.message); process.exit(1); });
