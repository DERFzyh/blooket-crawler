const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

(async () => {
  const PIN = process.argv[2] || '123456';  // Game PIN from command line
  const PLAYER_NAME = process.argv[3] || 'BotPlayer';
  
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });
  const p = await ctx.newPage();
  
  // Helper: kill cookie consent
  async function killConsent() {
    await p.evaluate(() => {
      document.querySelectorAll('button').forEach(b => {
        if (b.textContent?.includes('Accept') && b.offsetHeight > 0) b.click();
      });
    });
    await p.waitForTimeout(500);
  }
  
  // Step 1: Go to play page
  console.log('1. Navigating to Blooket Play...');
  await p.goto('https://play.blooket.com/play', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await p.waitForTimeout(2000);
  await killConsent();
  console.log('   URL:', p.url());
  
  // Step 2: Enter PIN
  console.log(`\n2. Joining game with PIN: ${PIN}`);
  const pinInput = await p.$('input[placeholder*="Game ID" i], input[placeholder*="PIN" i], input[placeholder*="code" i]');
  if (!pinInput) {
    console.log('   ❌ No PIN input found');
    await p.screenshot({ path: '/tmp/join-fail.png' });
    await browser.close();
    return;
  }
  
  await pinInput.fill(PIN);
  await p.keyboard.press('Enter');
  await p.waitForTimeout(3000);
  console.log('   After PIN:', p.url());
  
  // Step 3: Enter name (if prompted)
  const nameInput = await p.$('input[placeholder*="name" i], input[placeholder*="Name" i], input:not([readonly]):not([type="hidden"])');
  if (nameInput) {
    console.log(`   Entering name: ${PLAYER_NAME}`);
    await nameInput.fill(PLAYER_NAME);
    await p.keyboard.press('Enter');
    await p.waitForTimeout(5000);
  }
  console.log('   After name:', p.url());
  await p.screenshot({ path: '/tmp/joined-game.png' });
  
  // Step 4: Check game state and auto-answer
  console.log('\n3. Checking game state...');
  
  const gameState = await p.evaluate(() => {
    try {
      // Find React fiber
      const allEls = document.querySelectorAll('*');
      let fiberNode = null;
      for (const el of allEls) {
        const key = Object.keys(el).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
        if (key) {
          let node = el[key];
          for (let i = 0; i < 30 && node; i++) {
            try {
              if (node.stateNode?.state) {
                const s = node.stateNode.state;
                if (s.question || s.stage || s.gold !== undefined) {
                  fiberNode = node.stateNode;
                  break;
                }
              }
            } catch(e) {}
            node = node.return || node.child;
          }
          if (fiberNode) break;
        }
      }
      
      if (!fiberNode) return JSON.stringify({ error: 'no-fiber', pathname: location.pathname });
      const s = fiberNode.state || {};
      return JSON.stringify({
        stage: s.stage,
        questionText: s.question?.text || s.question?.question,
        answers: s.question?.answers,
        correctAnswers: s.question?.correctAnswers,
        gold: s.gold,
        weight: s.weight,
        crypto: s.crypto,
        gameMode: location.pathname
      });
    } catch(e) {
      return JSON.stringify({ error: e.message, pathname: location.pathname });
    }
  });
  console.log('   State:', gameState);
  
  // Step 5: If in question stage, auto-answer
  const parsed = JSON.parse(gameState);
  if (parsed.questionText && parsed.correctAnswers) {
    console.log('\n4. AUTO-ANSWERING...');
    console.log(`   Question: ${parsed.questionText}`);
    console.log(`   Correct: ${parsed.correctAnswers}`);
    
    // Inject auto-answer
    await p.evaluate(() => {
      function autoAnswerOnce() {
        const allEls = document.querySelectorAll('*');
        let fiberNode = null;
        for (const el of allEls) {
          const key = Object.keys(el).find(k => k.startsWith('__reactFiber$'));
          if (key) {
            let node = el[key];
            for (let i = 0; i < 30 && node; i++) {
              if (node.stateNode?.state?.question?.correctAnswers) {
                fiberNode = node.stateNode;
                break;
              }
              node = node.return;
            }
          }
        }
        if (!fiberNode) return;
        const q = fiberNode.state.question;
        const correct = Array.isArray(q.correctAnswers) ? q.correctAnswers : [q.correctAnswers];
        
        // Click the correct answer
        const answerEls = document.querySelectorAll('[class*="answer"]');
        for (const el of answerEls) {
          const text = el.textContent?.trim();
          if (correct.some(c => c?.toString().trim() === text) && el.offsetHeight > 0) {
            el.click();
            break;
          }
        }
      }
      autoAnswerOnce();
      // Set interval to keep answering
      window.__aaInterval = setInterval(autoAnswerOnce, 500);
    });
    console.log('   ✅ Auto-answer active!');
    await p.waitForTimeout(5000);
    await p.screenshot({ path: '/tmp/auto-answering.png' });
  }
  
  // Keep alive for testing
  console.log('\n   Bot is running. Press Ctrl+C to stop.');
  await new Promise(() => {});  // Keep alive indefinitely
  
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
