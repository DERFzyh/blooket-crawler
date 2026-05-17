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
  
  // Login
  console.log('1. Login...');
  await p.goto('https://id.blooket.com/login', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await p.waitForTimeout(2000);
  
  const accept = await p.$('button:has-text("Accept All")');
  if (accept) { await accept.click(); await p.waitForTimeout(500); }
  
  await p.fill('input[name="username"]', 'fred11zyh@outlook.com');
  await p.fill('input[name="password"]', 'ZYH11fred@blooket');
  await p.click('button[type="submit"]');
  await p.waitForTimeout(5000);
  console.log('   After login:', p.url());
  
  // Check cookies
  const cookies = await ctx.cookies();
  console.log('   Cookies:', cookies.map(c => `${c.name}@${c.domain}`).join(', '));
  
  // Check localStorage for JWT
  const jwt = await p.evaluate(() => {
    try { return localStorage.getItem('token') || 'none'; } catch(e) { return 'error'; }
  });
  console.log('   JWT token:', jwt ? jwt.slice(0, 80) + '...' : 'none');
  
  // Try navigatng to play.blooket.com
  console.log('\n2. Go to play.blooket.com...');
  await p.goto('https://play.blooket.com/play', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await p.waitForTimeout(3000);
  console.log('   URL:', p.url());
  
  // Check cookies again
  const cookies2 = await ctx.cookies();
  console.log('   Cookies:', cookies2.map(c => `${c.name}@${c.domain} (${c.httpOnly ? 'httpOnly' : 'js'})`).join(', '));
  
  // Host via play.blooket.com
  console.log('\n3. Go to play.blooket.com/host...');
  await p.goto('https://play.blooket.com/host', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await p.waitForTimeout(3000);
  console.log('   URL:', p.url());
  
  const text = await p.$eval('body', el => el.textContent.slice(0, 400));
  console.log('   Text 400:', text);
  
  await p.screenshot({ path: '/tmp/play-blooket.png' });
  
  await browser.close();
  console.log('\nDone!');
})().catch(e => { console.error(e.message); process.exit(1); });
