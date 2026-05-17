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
  
  // Set the cookie consent cookie BEFORE first navigation
  await ctx.addCookies([{
    name: 'cookieyes-consent',
    value: 'consentid:Z2xOMXpOWUdHaUNiMUtUUU1tZnkxa0VkYWhydHBmSHc,consent:yes,action:yes,necessary:yes,functional:yes,analytics:yes,performance:yes,advertisement:yes,other:yes',
    domain: '.blooket.com',
    path: '/'
  }]);
  
  // Login
  console.log('1. Login...');
  await p.goto('https://id.blooket.com/login', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await p.waitForTimeout(2000);
  
  await p.fill('input[name="username"]', 'fred11zyh@outlook.com');
  await p.fill('input[name="password"]', 'ZYH11fred@blooket');
  await p.click('button[type="submit"]');
  await p.waitForTimeout(5000);
  console.log('   URL:', p.url());
  
  // Now try to create a set/game  
  console.log('\n2. Going to Create page...');
  await p.goto('https://dashboard.blooket.com/create', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await p.waitForTimeout(4000);
  console.log('   URL:', p.url());
  console.log('   Title:', await p.title());
  
  // Try to dismiss any remaining consent
  try {
    const accept = await p.$('button:has-text("Accept All")');
    if (accept) { await accept.click(); await p.waitForTimeout(1000); }
  } catch(e) {}
  
  // Check what's on the create page
  const text = await p.$eval('body', el => el.textContent.slice(0, 500));
  console.log('   Text:', text);
  
  // Look for game mode selection
  const gameModes = await p.$$('[class*="game"], [class*="mode"], [class*="option"]');
  console.log(`   Game mode elements: ${gameModes.length}`);
  
  // Try clicking on a game set or searching
  const searchInput = await p.$('input[type="text"], input[placeholder*="search" i], input[placeholder*="Search" i]');
  if (searchInput) {
    console.log('   Found search input');
    await searchInput.fill('fishing');
    await p.keyboard.press('Enter');
    await p.waitForTimeout(3000);
    console.log('   URL after search:', p.url());
    
    const buttons = await p.$$('button');
    for (let i = 0; i < Math.min(buttons.length, 10); i++) {
      const t = await buttons[i].textContent();
      if (t?.trim()) console.log(`   Button ${i}: "${t.trim().slice(0, 60)}"`);
    }
  }
  
  await p.screenshot({ path: '/tmp/dashboard-create2.png' });
  
  await browser.close();
  console.log('\nDone!');
})().catch(e => { console.error(e.message); process.exit(1); });
