const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });
  const p = await ctx.newPage();
  
  // Helper: kill cookie consent on current page
  async function killConsent() {
    await p.evaluate(() => {
      document.querySelectorAll('button').forEach(b => {
        if (b.textContent.includes('Accept') && b.offsetHeight > 0) b.click();
      });
      // Also remove any overlays
      document.querySelectorAll('[class*="overlay"],[class*="Overlay"],[class*="modal"]').forEach(e => {
        e.style.display = 'none';
      });
    });
    await p.waitForTimeout(300);
  }
  
  // Login
  console.log('1. Login...');
  await p.goto('https://id.blooket.com/login', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await p.waitForTimeout(2000);
  await killConsent();
  
  await p.fill('input[name="username"]', 'fred11zyh@outlook.com');
  await p.fill('input[name="password"]', 'ZYH11fred@blooket');
  await p.click('button[type="submit"]');
  await p.waitForTimeout(6000);
  console.log('   After login:', p.url());
  
  // Dashboard - kill consent
  await killConsent();
  await p.waitForTimeout(1000);
  
  // Navigate to Create page
  console.log('\n2. Create page...');
  await p.goto('https://dashboard.blooket.com/create', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await p.waitForTimeout(3000);
  await killConsent();
  console.log('   URL:', p.url());
  console.log('   Title:', await p.title());
  
  // Search for a set to host
  const searchInput = await p.$('input[type="text"]');
  if (searchInput) {
    console.log('   Found search input');
    await searchInput.fill('fish');
    await p.keyboard.press('Enter');
    await p.waitForTimeout(3000);
    
    // Look for "Host" or "Solo" buttons on search results
    const resultText = await p.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return JSON.stringify(btns.filter(b => {
        const t = b.textContent || '';
        return t.includes('Host') || t.includes('Solo') || t.includes('Play');
      }).map(b => b.textContent.trim()));
    });
    console.log('   Host/Solo buttons:', resultText);
  }
  
  // Try Discover page
  console.log('\n3. Discover page...');
  await p.goto('https://dashboard.blooket.com/discover', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await p.waitForTimeout(4000);
  await killConsent();
  
  // Dump what's visible
  const visible = await p.evaluate(() => {
    const sets = Array.from(document.querySelectorAll('a')).filter(a => a.href && a.href.includes('/set/'));
    return JSON.stringify({
      url: location.href,
      setLinks: sets.slice(0, 5).map(s => s.href.split('/').pop()),
      setNames: sets.slice(0, 5).map(s => s.textContent.trim().slice(0, 30)),
      hostBtns: Array.from(document.querySelectorAll('button')).filter(b => 
        b.textContent.includes('Host') || b.textContent.includes('Solo')).map(b => b.textContent.trim())
    });
  });
  console.log('   Discover:', visible);
  
  // Navigate directly to a specific set that we know exists
  console.log('\n4. Going to specific set...');
  await p.goto('https://dashboard.blooket.com/set/5f8e7b3c9e9a6c7b8d9e0f1a', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await p.waitForTimeout(3000);
  await killConsent();
  console.log('   URL:', p.url());
  
  const hostBtnsOnSet = await p.evaluate(() => {
    return JSON.stringify({
      buttons: Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim().slice(0, 30)),
      links: Array.from(document.querySelectorAll('a')).filter(a => a.textContent.includes('Host') || a.textContent.includes('Solo')).map(a => a.textContent.trim())
    });
  });
  console.log('   Set page:', hostBtnsOnSet);
  
  await p.screenshot({ path: '/tmp/dashboard-full.png' });
  
  await browser.close();
  console.log('\nDone!');
})().catch(e => { console.error(e.message); process.exit(1); });
