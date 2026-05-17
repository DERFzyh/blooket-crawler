const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  
  // Massive anti-detection + auto dismiss
  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    // Hide ALL overlays and popups aggressively
    const style = document.createElement('style');
    style.textContent = `
      [class*="overlay"], [class*="Overlay"], [class*="modal"], [class*="Modal"],
      [class*="popup"], [class*="Popup"], [class*="cookie"], [class*="Cookie"],
      [class*="consent"], [class*="Consent"], [class*="School"],
      [class*="school"], [class*="identification"],
      [id*="cookie"], [id*="Cookie"] { display: none !important; }
    `;
    document.head?.appendChild(style);
    
    // Click accept buttons constantly
    setInterval(() => {
      document.querySelectorAll('button').forEach(b => {
        const t = b.textContent || '';
        if (t.includes('Accept') || t.includes('Continue') || t.includes('Got it')) b.click();
      });
    }, 1000);
  });
  
  const p = await ctx.newPage();
  
  // Login
  console.log('1. Login...');
  await p.goto('https://id.blooket.com/login', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await p.waitForTimeout(3000);
  
  await p.fill('input[name="username"]', 'fred11zyh@outlook.com');
  await p.fill('input[name="password"]', 'ZYH11fred@blooket');
  await p.click('button[type="submit"]');
  await p.waitForTimeout(6000);
  console.log('   URL:', p.url());
  console.log('   ✅ Logged in');
  
  // Directly go to a known set and host it
  // Use JS navigation to bypass overlays
  console.log('\n2. Hosting game...');
  
  // First, go to Blooket play page which has Host option  
  await p.goto('https://play.blooket.com/play', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await p.waitForTimeout(3000);
  
  // Try to find and click through to host using pure JS
  const result = await p.evaluate(async () => {
    // Try to find PIN input first (for joining)
    const pinInput = document.querySelector('input[placeholder*="Game ID" i], input[placeholder*="PIN" i], input[placeholder*="code" i]');
    
    // Look for host/solo links
    const allLinks = Array.from(document.querySelectorAll('a'));
    const hostLinks = allLinks.filter(a => {
      const text = (a.textContent || '').toLowerCase();
      const href = (a.href || '').toLowerCase();
      return text.includes('host') || href.includes('host') || text.includes('solo');
    });
    
    const allButtons = Array.from(document.querySelectorAll('button'));
    const hostButtons = allButtons.filter(b => {
      const text = (b.textContent || '').toLowerCase();
      return text.includes('host') || text.includes('solo');
    });
    
    return JSON.stringify({
      hasPinInput: !!pinInput,
      hostLinks: hostLinks.map(l => l.textContent?.trim()),
      hostButtons: hostButtons.map(b => b.textContent?.trim()),
      bodyText: document.body.textContent?.slice(0, 200)
    });
  });
  console.log('   Page state:', result);
  
  // Navigate directly to known Blooket URLs
  console.log('\n3. Trying direct game URLs...');
  const testUrls = [
    'https://play.blooket.com/host',
    'https://id.blooket.com/host',
    'https://www.blooket.com/host'
  ];
  
  for (const url of testUrls) {
    try {
      await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await p.waitForTimeout(2000);
      console.log(`   ${url} -> ${p.url()}`);
    } catch(e) {
      console.log(`   ${url} -> TIMEOUT`);
    }
  }
  
  await browser.close();
  console.log('\nDone!');
})().catch(e => { console.error(e.message); process.exit(1); });
