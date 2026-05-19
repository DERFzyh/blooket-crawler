/**
 * 研究：不答题直接获得奖励 - 方法2
 * 自己创建游戏 + 加入 + 深入分析 WebSocket & React 内部
 */
const {chromium}=require('playwright-extra');
const StealthPlugin=require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

const GAME_SET = 'crypto'; // crypto / gold / fishing
const HOST_NAME = 'HostBot' + Math.floor(Math.random() * 9000);
const PLAYER_NAME = 'Player' + Math.floor(Math.random() * 9000);

(async () => {
  console.log(`\n🔬 研究: ${GAME_SET} - 不答题直接获得奖励`);
  
  const b = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  
  // ========== HOST ==========
  console.log('\n📋 Step 1: 登录并创建游戏...');
  const hCtx = await b.newContext({ viewport: { width: 1400, height: 1000 } });
  await hCtx.addInitScript(() => {
    // Hook console for WS message capture
    const origLog = console.log;
    console.log = function(...args) {
      origLog.apply(console, args);
    };
  });
  
  const hp = await hCtx.newPage();
  
  // Intercept ALL network requests on host
  hp.on('request', req => {
    const u = req.url();
    if (u.includes('/api/') || u.includes('answer') || u.includes('ws') || u.includes('socket')) {
      console.log(`[HOST-REQ] ${req.method()} ${u.slice(0,150)}`);
    }
    if (u.includes('socket.io') || u.includes('websocket')) {
      console.log(`[HOST-WS] ${req.method()} ${u.slice(0,150)}`);
    }
  });
  
  hp.on('response', res => {
    const u = res.url();
    if ((u.includes('/api/') || u.includes('game')) && res.status() !== 200 && res.status() !== 304) {
      console.log(`[HOST-RES] ${res.status()} ${u.slice(0,150)}`);
    }
  });
  
  await hp.goto('https://id.blooket.com/login', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await hp.waitForTimeout(3000);
  
  // Cookie consent
  await hp.evaluate(() => {
    document.querySelectorAll('button').forEach(b => {
      if ((b.textContent || '').includes('Accept')) b.click();
    });
  });
  await hp.waitForTimeout(2000);
  
  console.log('URL:', hp.url());
  
  // Check if already logged in (redirected to dashboard)
  if (hp.url().includes('dashboard') || hp.url().includes('blooks') || hp.url().includes('stats')) {
    console.log('✅ Already logged in');
  } else if (hp.url().includes('login')) {
    console.log('⚠️ Login required - checking for stored creds...');
    // Try to auto-fill from localStorage or wait
    // For now, skip - need manual login
    await hp.screenshot({ path: '/tmp/host-login.png' });
    console.log('📸 Login page screenshot saved');
  }
  
  // Navigate to host page for the game mode
  const hostUrls = {
    crypto: 'https://cryptohack.blooket.com/host',
    gold: 'https://play.blooket.com/host/gold',
    fishing: 'https://play.blooket.com/host/fishing'
  };
  
  await hp.goto(hostUrls[GAME_SET] || hostUrls.crypto, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await hp.waitForTimeout(5000);
  console.log('Host URL:', hp.url());
  
  // Check if we need to log in
  if (hp.url().includes('login') || hp.url().includes('sign')) {
    console.log('⚠️ 需要登录。尝试用存储的凭证...');
    
    // Try to use stored auth
    const cookies = await hCtx.cookies();
    const hasAuth = cookies.some(c => c.name.includes('token') || c.name.includes('auth') || c.name.includes('session'));
    
    if (!hasAuth) {
      console.log('❌ 没有存储的认证信息，需要手动登录');
      console.log('📸 当前页面截图: /tmp/host-need-login.png');
      await hp.screenshot({ path: '/tmp/host-need-login.png' });
      await b.close();
      return;
    }
  }
  
  // Try to find "Host Game" or "Create Game" button
  const hostBtn = await hp.$('button:has-text("Host"), button:has-text("host"), [class*=hostButton], [class*=Host]');
  
  if (hostBtn) {
    console.log('Found Host button, clicking...');
    await hostBtn.click();
    await hp.waitForTimeout(5000);
  }
  
  // Look for PIN display
  const pinText = await hp.evaluate(() => {
    const els = document.querySelectorAll('h1,h2,h3,div,span,p');
    for (const el of els) {
      const t = (el.textContent || '').trim();
      if (/^\d{6,7}$/.test(t)) return t;
    }
    return null;
  });
  
  console.log('PIN found:', pinText);
  console.log('Host URL:', hp.url());
  await hp.screenshot({ path: '/tmp/host-page.png' });
  
  // If we got a PIN, let's join as player
  if (!pinText) {
    console.log('❌ No PIN found. Page may need interaction.');
    // Try dumping page state
    const pageState = await hp.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button')).map(b => ({
        text: (b.textContent || '').trim().slice(0, 50),
        className: b.className?.slice(0, 50) || '',
        visible: b.offsetHeight > 0
      }));
      return JSON.stringify(buttons);
    });
    console.log('Buttons:', pageState);
    await b.close();
    return;
  }
  
  console.log('\n✅ PIN obtained, research complete for now');
  await b.close();
})();
