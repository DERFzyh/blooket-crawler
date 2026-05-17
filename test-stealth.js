const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

(async () => {
  console.log('Launching stealth browser...');
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled'
    ]
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'
  });
  
  // Override navigator.webdriver
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });
  
  const page = await context.newPage();
  
  console.log('Navigating to Blooket play page...');
  try {
    await page.goto('https://play.blooket.com/play', { 
      waitUntil: 'domcontentloaded', 
      timeout: 20000 
    });
    console.log('Success! URL:', page.url());
    console.log('Title:', await page.title());
    await page.screenshot({ path: '/tmp/blooket-stealth-test.png' });
    console.log('Screenshot saved.');
  } catch(e) {
    console.log('Navigation error:', e.message);
    // Check what we got
    console.log('Current URL after error:', page.url());
    await page.screenshot({ path: '/tmp/blooket-stealth-error.png' });
  }
  
  await browser.close();
})().catch(e => {
  console.error('Fatal error:', e.message);
  process.exit(1);
});
