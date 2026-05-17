const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 }
  });
  
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });
  
  const page = await context.newPage();
  
  // Login
  console.log('1. Login...');
  await page.goto('https://id.blooket.com/login', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(2000);
  
  // Handle cookie consent - click Accept All
  const acceptBtn = await page.$('button:has-text("Accept All")');
  if (acceptBtn) { await acceptBtn.click(); await page.waitForTimeout(500); }
  
  // Fill form - name=username for email!
  await page.fill('input[name="username"]', 'fred11zyh@outlook.com');
  await page.fill('input[name="password"]', 'ZYH11fred@blooket');
  console.log('   Filled credentials');
  
  // Click submit
  await page.click('button[type="submit"]');
  console.log('   Clicked submit');
  
  await page.waitForTimeout(5000);
  console.log('   After login:', page.url());
  
  if (page.url().includes('blooket.com/play')) {
    console.log('   ✅ LOGGED IN!');
    
    // Step 2: Host Fishing Frenzy
    console.log('\n2. Hosting Fishing Frenzy...');
    await page.goto('https://www.blooket.com/host/fishing', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(3000);
    console.log('   URL:', page.url());
    
    // Find and click host button
    const hostBtn = await page.$('button:has-text("Host"), button:has-text("Assign")');
    if (hostBtn) {
      await hostBtn.click();
      await page.waitForTimeout(3000);
      console.log('   Clicked host button');
    }
    
    // Try to find PIN
    const pinEl = await page.$('[class*="pin" i], [class*="code" i]');
    if (pinEl) {
      const pin = await pinEl.textContent();
      console.log('   Game PIN elements:', pin);
    }
    
    const pageText = await page.$eval('body', el => el.textContent);
    const pinMatch = pageText.match(/\b\d{6,7}\b/);
    if (pinMatch) console.log('   🎯 Game PIN:', pinMatch[0]);
    
    await page.screenshot({ path: '/tmp/blooket-game-hosted.png' });
    console.log('   Screenshot saved');
    
    // Step 3: Extract game state info
    console.log('\n3. Reading game state...');
    const state = await page.evaluate(() => {
      try {
        const root = document.querySelector('#app > div > div');
        if (!root) return JSON.stringify({ error: 'no-root' });
        const fiberKey = Object.keys(root).find(k => k.startsWith('__reactFiber'));
        if (!fiberKey) return JSON.stringify({ error: 'no-fiber' });
        
        function findSN(node, d) {
          if (d > 50 || !node) return null;
          if (node.stateNode && node.stateNode.state) return node.stateNode;
          return findSN(node.child, d+1) || findSN(node.sibling, d+1);
        }
        const sn = findSN(root[fiberKey], 0);
        if (!sn) return JSON.stringify({ error: 'no-statenode' });
        const s = sn.state || {};
        return JSON.stringify({
          stage: s.stage,
          questionText: s.question?.text,
          answers: s.question?.answers,
          correctAnswers: s.question?.correctAnswers,
          gold: s.gold,
          weight: s.weight,
          crypto: s.crypto,
          pathname: window.location.pathname
        });
      } catch(e) { return JSON.stringify({ error: e.message }); }
    });
    console.log('   State:', state);
  }
  
  await browser.close();
  console.log('\n✅ Done!');
})().catch(e => {
  console.error('❌', e.message);
  process.exit(1);
});
