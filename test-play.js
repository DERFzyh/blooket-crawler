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
  
  // Helper to dismiss cookie consent
  async function dismissConsent() {
    try {
      const accept = await p.$('button:has-text("Accept All")');
      if (accept) { await accept.click(); await p.waitForTimeout(500); return true; }
    } catch(e) {}
    return false;
  }
  
  // Login
  console.log('1. Login...');
  await p.goto('https://id.blooket.com/login', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await p.waitForTimeout(2000);
  await dismissConsent();
  await p.fill('input[name="username"]', 'fred11zyh@outlook.com');
  await p.fill('input[name="password"]', 'ZYH11fred@blooket');
  await p.click('button[type="submit"]');
  await p.waitForTimeout(5000);
  console.log('   After login:', p.url());
  
  // Go to play.blooket.com (this is where Blooket games are played)
  console.log('\n2. Going to play.blooket.com...');
  await p.goto('https://play.blooket.com/play', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await p.waitForTimeout(3000);
  await dismissConsent();
  console.log('   URL:', p.url());
  
  // Check if logged in on play page
  const playText = await p.$eval('body', el => el.textContent.slice(0, 300));
  console.log('   Text:', playText);
  
  // Check for host/solo buttons
  const hostButtons = await p.$$('button:has-text("Host"), button:has-text("Solo"), button:has-text("Create")');
  console.log(`   Host/Solo buttons: ${hostButtons.length}`);
  
  // Look for any game-related links
  const allLinks = await p.$$('a');
  for (const link of allLinks) {
    const href = await link.getAttribute('href');
    const text = await link.textContent();
    if (href && (href.includes('host') || href.includes('solo') || text?.includes('Host') || text?.includes('Solo'))) {
      console.log(`   Link: "${text?.trim()}" -> ${href}`);
    }
  }
  
  // Try going to solo game directly
  console.log('\n3. Trying solo/host game...');
  // Blooket solo game URL
  await p.goto('https://play.blooket.com/play?host=true', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await p.waitForTimeout(3000);
  console.log('   URL:', p.url());
  
  // Try the host API approach - look at what the flooder uses
  // From BlooketFlooder: POST to play.blooket.com/play with form data
  // The host creates a game that generates a PIN, then players join
  
  await p.screenshot({ path: '/tmp/play-page.png' });
  console.log('\n   Screenshot saved');
  
  // Summary: The BlooketFlooder uses a completely different approach:
  // Direct HTTP/WS requests to Blooket API without a browser at all
  // It uses Bun to bypass Cloudflare
  
  await browser.close();
  console.log('Done!');
})().catch(e => { console.error(e.message); process.exit(1); });
