/**
 * 研究：不答题直接获得奖励
 * 探索Blooket游戏内部机制，寻找可能的绕过方式
 */
const {chromium}=require('playwright-extra');
const StealthPlugin=require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

const PIN = '7386727';
const NAME = 'Research' + Math.floor(Math.random() * 9000);

(async ()=>{
  console.log(`\n🔬 研究模式: PIN=${PIN} NAME=${NAME}`);
  const b = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const ctx = await b.newContext({ viewport: { width: 1400, height: 1000 } });

  // Intercept network requests to find answer submission API
  await ctx.route('**/*', (route, req) => {
    const url = req.url();
    if (url.includes('/api/') || url.includes('answer') || url.includes('question') || url.includes('ws') || url.includes('socket')) {
      console.log(`🌐 ${req.method()} ${url.slice(0,120)}`);
    }
    route.continue();
  });

  const p = await ctx.newPage();

  // Hook WebSocket on page
  await ctx.addInitScript(() => {
    const origWS = window.WebSocket;
    window.WebSocket = function(...args) {
      const ws = new origWS(...args);
      console.log('[WS-HOOK] Connected to:', args[0]);
      const origSend = ws.send;
      ws.send = function(data) {
        console.log('[WS-SEND]', typeof data === 'string' ? data.slice(0,200) : '[binary]');
        return origSend.call(this, data);
      };
      ws.addEventListener('message', (e) => {
        const d = typeof e.data === 'string' ? e.data.slice(0,200) : '[binary]';
        console.log('[WS-RECV]', d);
      });
      return ws;
    };
    Object.defineProperty(window.WebSocket.prototype, 'send', {});
  });

  await p.goto('https://play.blooket.com/play', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await p.waitForTimeout(3000);
  await p.evaluate(() => {
    document.querySelectorAll('button').forEach(b => {
      if ((b.textContent || '').includes('Accept')) b.click();
    });
  });
  await p.waitForTimeout(2000);

  // Enter PIN
  await p.locator('input[name=join-code]').click();
  await p.keyboard.type(PIN, { delay: 80 });
  await p.locator('button.FormSubmitButton_submitButton__MK2LJ').click();
  await p.waitForTimeout(8000);

  // Enter name
  try {
    const inputs = await p.$$('input');
    for (const i of inputs) {
      if (await i.isVisible()) {
        await i.click();
        await p.keyboard.type(NAME, { delay: 50 });
        break;
      }
    }
    const joinBtns = await p.$$('[class*=joinButton],[class*=playButton],button');
    for (const btn of joinBtns) {
      const t = ((await btn.textContent()) || '').trim().toLowerCase();
      if ((t.includes('join') || t.includes('play') || t.includes('enter')) && await btn.isVisible()) {
        await btn.click();
        break;
      }
    }
    await p.waitForTimeout(5000);
  } catch(e) { console.log('Name step skipped:', e.message); }

  console.log('URL:', p.url());
  await p.waitForTimeout(5000);

  // Dump complete React state and function references
  const analysis = await p.evaluate(() => {
    const results = [];

    function wF(n, d) {
      if (!n || d > 50) return null;
      try { var s = n.stateNode?.state; if (s) return s; } catch(e) {}
      return wF(n.child, d+1) || wF(n.sibling, d+1) || wF(n.return, d+1);
    }

    // Find all React state objects
    const states = [];
    for (var el of document.querySelectorAll('*')) {
      var k = Object.keys(el).filter(x => x.indexOf('__react') === 0);
      if (!k.length) continue;
      var s = wF(el[k[0]], 0);
      if (s && Object.keys(s).length > 0) {
        states.push(s);
      }
    }

    // Try to find game-relevant functions and properties
    const gameState = states.find(s => s.question || s.stage || s.gold !== undefined);
    
    if (gameState) {
      results.push('=== GAME STATE KEYS ===');
      results.push(Object.keys(gameState).join(', '));
      
      // Check for submit/answer related functions
      for (const key of Object.keys(gameState)) {
        const val = gameState[key];
        if (typeof val === 'function') {
          results.push(`FUNCTION: ${key} = ${val.toString().slice(0, 100)}`);
        }
      }

      // Check question object
      if (gameState.question) {
        results.push('\n=== QUESTION KEYS ===');
        results.push(Object.keys(gameState.question).join(', '));
        // Check if there's a submitAnswer or similar function
        for (const key of Object.keys(gameState.question)) {
          const val = gameState.question[key];
          if (typeof val === 'function') {
            results.push(`QUESTION FUNCTION: ${key} = ${val.toString().slice(0, 100)}`);
          }
        }
      }
    }

    // Try to find answer submission buttons
    const submitBtns = document.querySelectorAll('button[type="submit"], [class*="submit"], [class*="Submit"]');
    results.push(`\n=== SUBMIT BUTTONS: ${submitBtns.length} ===`);

    // Try to find event listeners on answer elements
    const answerEls = document.querySelectorAll('[class*="answer"]');
    results.push(`=== ANSWER ELEMENTS: ${answerEls.length} ===`);

    return results.join('\n');
  });

  console.log('\n📊 ANALYSIS:\n' + analysis);

  // Dump all intercepted network URLs
  console.log('\n⏳ Waiting 10s for network activity...');
  await p.waitForTimeout(10000);

  // Try to dump WebSocket messages by listening on page console
  p.on('console', msg => {
    if (msg.text().includes('[WS-') || msg.text().includes('answer') || msg.text().includes('submit')) {
      console.log(`📢 ${msg.text().slice(0, 300)}`);
    }
  });

  await p.waitForTimeout(15000);
  
  const screenshot = await p.screenshot({ path: '/tmp/test-bypass.png' });
  console.log('📸 Screenshot saved to /tmp/test-bypass.png');
  
  await b.close();
  console.log('\n✅ Research complete');
})();
