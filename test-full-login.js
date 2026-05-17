const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

(async () => {
  console.log('🚀 Launching browser...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  });
  
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });
  
  const page = await context.newPage();
  
  // Step 1: Login page
  console.log('📄 Loading login page...');
  await page.goto('https://id.blooket.com/login', { waitUntil: 'domcontentloaded', timeout: 20000 });
  console.log('   URL:', page.url());
  console.log('   Title:', await page.title());
  
  await page.waitForTimeout(2000);
  
  // Step 2: Fill credentials
  console.log('📝 Looking for form elements...');
  const inputs = await page.$$('input');
  console.log(`   Found ${inputs.length} inputs`);
  
  for (let i = 0; i < inputs.length; i++) {
    const type = await inputs[i].getAttribute('type');
    const name = await inputs[i].getAttribute('name');
    const id = await inputs[i].getAttribute('id');
    console.log(`   [${i}] type=${type} name=${name} id=${id}`);
  }
  
  // Try to fill email
  const emailSel = 'input[type="email"], input[name="email"], input[id*="email" i]';
  const passSel = 'input[type="password"], input[name="password"], input[id*="password" i]';
  
  const emailEl = await page.$(emailSel);
  const passEl = await page.$(passSel);
  
  if (emailEl) {
    await emailEl.fill('fred11zyh@outlook.com');
    console.log('   ✅ Filled email');
  }
  
  if (passEl) {
    await passEl.fill('ZYH11fred@blooket');
    console.log('   ✅ Filled password');
  }
  
  // Step 3: Click login
  console.log('🔘 Looking for login button...');
  const buttons = await page.$$('button');
  console.log(`   Found ${buttons.length} buttons`);
  for (let i = 0; i < Math.min(buttons.length, 5); i++) {
    const text = await buttons[i].textContent();
    console.log(`   [${i}] "${text?.trim()}"`);
  }
  
  const loginBtn = await page.$('button[type="submit"]');
  if (loginBtn) {
    await loginBtn.click();
    console.log('   ✅ Clicked submit button');
  }
  
  await page.waitForTimeout(5000);
  console.log('📍 After login URL:', page.url());
  
  await page.screenshot({ path: '/tmp/blooket-login-result.png' });
  console.log('📸 Screenshot saved');
  
  // Check current page content
  if (page.url().includes('blooket.com/play')) {
    console.log('✅ Successfully logged in!');
    
    // Try to host a fishing game
    console.log('\n🎣 Testing host game (Fishing Frenzy)...');
    await page.goto('https://www.blooket.com/host/fishing', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(3000);
    console.log('   Host page URL:', page.url());
    console.log('   Title:', await page.title());
    
    await page.screenshot({ path: '/tmp/blooket-host-fishing.png' });
    console.log('📸 Host page screenshot saved');
  }
  
  await browser.close();
  console.log('\n✅ Test complete!');
})().catch(e => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
