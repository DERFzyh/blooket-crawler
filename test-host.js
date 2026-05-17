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
  
  // Navigate to host fishing directly
  console.log('\n2. Go to host fishing...');
  await p.goto('https://www.blooket.com/host/fishing', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await p.waitForTimeout(4000);
  console.log('   URL:', p.url());
  console.log('   Title:', await p.title());
  
  await p.screenshot({ path: '/tmp/host-fishing.png' });
  
  // Check page content
  const text = await p.$eval('body', el => el.textContent.slice(0, 500));
  console.log('   Body text (500):', text);
  
  // Look for buttons
  const buttons = await p.$$('button');
  for (let i = 0; i < Math.min(buttons.length, 8); i++) {
    const t = await buttons[i].textContent();
    console.log(`   Button ${i}: "${t?.trim()?.slice(0, 60)}"`);
  }
  
  // Try clicking Host/Assign
  const hostBtn = await p.$('button:has-text("Host"), button:has-text("Assign HW"), button:has-text("Host Now")');
  if (hostBtn) {
    console.log('\n3. Clicking host button...');
    await hostBtn.click();
    await p.waitForTimeout(5000);
    console.log('   URL after host:', p.url());
    
    // Check for PIN
    const bodyText = await p.$eval('body', el => el.textContent);
    const pinMatch = bodyText.match(/\b\d{6,7}\b/);
    if (pinMatch) console.log('   🎯 PIN:', pinMatch[0]);
    
    await p.screenshot({ path: '/tmp/host-lobby.png' });
  }
  
  await browser.close();
  console.log('\nDone!');
})().catch(e => { console.error(e.message); process.exit(1); });
