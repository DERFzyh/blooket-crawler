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
  await p.waitForTimeout(3000);
  
  // Kill cookie popup via JS
  await p.evaluate(() => {
    document.querySelectorAll('button').forEach(b => {
      if (b.textContent.includes('Accept')) b.click();
    });
  });
  await p.waitForTimeout(500);
  
  await p.fill('input[name="username"]', 'fred11zyh@outlook.com');
  await p.fill('input[name="password"]', 'ZYH11fred@blooket');
  await p.click('button[type="submit"]');
  await p.waitForTimeout(6000);
  console.log('   URL:', p.url());
  
  // Navigate to play page  
  console.log('\n2. Play page...');
  await p.goto('https://play.blooket.com/play', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await p.waitForTimeout(2000);
  
  // AGGRESSIVELY remove cookie consent via JS
  await p.evaluate(() => {
    // Remove all cookie-related elements
    document.querySelectorAll('[class*="cookie"], [class*="Cookie"], [id*="cookie"], [id*="Cookie"]')
      .forEach(el => el.remove());
    document.querySelectorAll('[class*="consent"], [class*="Consent"]')
      .forEach(el => el.remove());
    // Remove modal overlays  
    document.querySelectorAll('[class*="overlay"], [class*="Overlay"], [class*="modal"], [class*="Modal"]')
      .forEach(el => el.remove());
    // Remove fixed/sticky position elements that look like banners
    document.querySelectorAll('div').forEach(el => {
      const style = window.getComputedStyle(el);
      if ((style.position === 'fixed' || style.position === 'sticky') && 
          el.offsetHeight < window.innerHeight && 
          el.offsetHeight > 50 &&
          (el.textContent.includes('cookie') || el.textContent.includes('Cookie') || el.textContent.includes('Accept'))) {
        el.remove();
      }
    });
    document.body.style.overflow = 'auto';
    document.documentElement.style.overflow = 'auto';
    return 'cleaned';
  });
  
  await p.waitForTimeout(1000);
  console.log('   URL:', p.url());
  
  // Take screenshot to verify
  await p.screenshot({ path: '/tmp/play-cleaned.png' });
  
  // Check if PIN input is now accessible
  const hasPin = await p.$('input[placeholder*="Game ID" i], input[placeholder*="PIN" i]');
  console.log('   Has PIN input:', !!hasPin);
  
  if (hasPin) {
    // This is the join page. Let's now check if we're authenticated
    const isAuthed = await p.evaluate(() => {
      // Check if user avatar/menu is visible  
      const hasUserMenu = document.querySelector('[class*="user"], [class*="avatar"], [class*="profile"]');
      // Check saved tokens
      const hasToken = !!localStorage.getItem('token');
      return JSON.stringify({ hasUserMenu: !!hasUserMenu, hasToken });
    });
    console.log('   Auth status:', isAuthed);
    
    // Try entering a dummy PIN to see if name prompt appears
    await hasPin.fill('123456');
    await p.keyboard.press('Enter');
    await p.waitForTimeout(3000);
    console.log('   After entering PIN, URL:', p.url());
    
    const hasNameInput = await p.$('input[placeholder*="name" i], input[placeholder*="Name" i]');
    console.log('   Has name input:', !!hasNameInput);
  }
  
  await browser.close();
  console.log('\nDone!');
})().catch(e => { console.error(e.message); process.exit(1); });
