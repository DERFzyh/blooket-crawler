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
    // Try to suppress cookie alerts via JavaScript
    window.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        const btns = document.querySelectorAll('button');
        btns.forEach(b => { if (b.textContent.includes('Accept All')) b.click(); });
      }, 1000);
    }, { once: true });
  });
  const p = await ctx.newPage();
  
  // Login
  console.log('1. Login...');
  await p.goto('https://id.blooket.com/login', { waitUntil: 'networkidle', timeout: 30000 });
  await p.waitForTimeout(2000);
  
  // Try clicking Accept All via multiple methods
  try { await p.click('text="Accept All"', { timeout: 3000 }); console.log('   Clicked Accept All'); } catch(e) {}
  await p.waitForTimeout(500);
  try { await p.click('button:has-text("Accept")', { timeout: 3000 }); console.log('   Clicked Accept fallback'); } catch(e) {}
  await p.waitForTimeout(500);
  
  await p.fill('input[name="username"]', 'fred11zyh@outlook.com');
  await p.fill('input[name="password"]', 'ZYH11fred@blooket');
  await p.click('button[type="submit"]');
  await p.waitForTimeout(5000);
  console.log('   After login:', p.url());
  
  // Wait for dashboard to fully load
  await p.waitForTimeout(3000);
  try { await p.click('text="Accept All"', { timeout: 3000 }); await p.waitForTimeout(1000); } catch(e) {}
  
  // Go to create page
  console.log('\n2. Create page...');
  await p.goto('https://dashboard.blooket.com/create', { waitUntil: 'networkidle', timeout: 30000 });
  await p.waitForTimeout(3000);
  try { await p.click('text="Accept All"', { timeout: 3000 }); await p.waitForTimeout(1000); } catch(e) {}
  console.log('   URL:', p.url());
  
  // Now try to directly create a game via API  
  console.log('\n3. Checking available sets...');
  
  // Evaluate: check if we're authenticated by accessing API
  const authCheck = await p.evaluate(async () => {
    try {
      const res = await fetch('https://api.blooket.com/api/users/verify-token', {
        headers: { 'Authorization': localStorage.getItem('token') || '' }
      });
      const data = await res.json();
      return JSON.stringify({ status: res.status, name: data.name });
    } catch(e) { return JSON.stringify({ error: e.message }); }
  });
  console.log('   Auth check:', authCheck);
  
  // Try hosting a game via direct navigation to a set
  console.log('\n4. Looking for Discover sets to host...');
  await p.goto('https://dashboard.blooket.com/discover', { waitUntil: 'networkidle', timeout: 30000 });
  await p.waitForTimeout(3000);
  try { await p.click('text="Accept All"', { timeout: 3000 }); await p.waitForTimeout(1000); } catch(e) {}
  
  const discoverText = await p.$eval('body', el => {
    // Find all set cards/links
    const sets = [];
    document.querySelectorAll('a').forEach(a => {
      if (a.href.includes('/set/')) sets.push(a.textContent.trim().slice(0, 50));
    });
    return JSON.stringify({ url: location.href, sets: sets.slice(0, 10) });
  });
  console.log('   Discover:', discoverText);
  
  // Directly host: navigate to a specific game set and host it
  // Common public fishing set ID
  console.log('\n5. Trying direct host of fishing set...');
  await p.goto('https://dashboard.blooket.com/set/6624ea89dc2cfb0bc07cf0a2', { waitUntil: 'networkidle', timeout: 30000 });
  await p.waitForTimeout(3000);
  try { await p.click('text="Accept All"', { timeout: 3000 }); await p.waitForTimeout(1000); } catch(e) {}
  console.log('   URL:', p.url());
  
  // Look for Host/Solo button
  const hostBtn = await p.$('button:has-text("Host"), button:has-text("Solo"), a:has-text("Host"), a:has-text("Solo")');
  if (hostBtn) {
    console.log('   Found host button, clicking...');
    await hostBtn.click();
    await p.waitForTimeout(5000);
    console.log('   After clicking host:', p.url());
  }
  
  await p.screenshot({ path: '/tmp/host-attempt.png' });
  
  await browser.close();
  console.log('\nDone!');
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
