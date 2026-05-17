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
  
  // On dashboard - click "Create" or go to discover
  console.log('\n2. Dashboard actions...');
  console.log('   Title:', await p.title());
  
  // Look for create/new game buttons
  const links = await p.$$('a, button');
  for (let i = 0; i < links.length; i++) {
    const text = await links[i].textContent();
    const href = await links[i].getAttribute('href');
    if (text && (text.includes('Create') || text.includes('Host') || text.includes('Play') || text.includes('Discover') || text.includes('New'))) {
      console.log(`   [${i}] "${text.trim()}" href=${href}`);
    }
  }
  
  // Try clicking "Create" 
  const createBtn = await p.$('a:has-text("Create"), button:has-text("Create"), a:has-text("Discover")');
  if (createBtn) {
    console.log('\n3. Clicking Create/Discover...');
    await createBtn.click();
    await p.waitForTimeout(4000);
    console.log('   URL:', p.url());
    
    // Look for game mode selection
    const pageText = await p.$eval('body', el => el.textContent.slice(0, 500));
    console.log('   Text:', pageText);
    
    // Check for game mode options
    const modes = ['Fishing', 'Gold', 'Crypto', 'Factory', 'Racing'];
    for (const mode of modes) {
      const modeEl = await p.$(`:has-text("${mode}")`);
      if (modeEl) console.log(`   Found: ${mode}`);
    }
    
    await p.screenshot({ path: '/tmp/dashboard-create.png' });
  }
  
  // Try directly navigating to host from dashboard  
  console.log('\n4. Trying dashboard.blooket.com/host...');
  await p.goto('https://dashboard.blooket.com/host', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await p.waitForTimeout(3000);
  console.log('   URL:', p.url());
  
  await browser.close();
  console.log('\nDone!');
})().catch(e => { console.error(e.message); process.exit(1); });
