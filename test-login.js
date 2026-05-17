const { chromium } = require('playwright');

(async () => {
  console.log('Launching browser...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 }
  });
  const page = await context.newPage();
  
  // Step 1: Go to login page
  console.log('1. Navigating to Blooket login...');
  await page.goto('https://id.blooket.com/login', { waitUntil: 'networkidle', timeout: 30000 });
  console.log('   URL:', page.url());
  console.log('   Title:', await page.title());
  
  // Step 2: Fill in login form  
  console.log('2. Filling login form...');
  const emailInput = await page.$('input[type="email"], input[name="email"]');
  const passInput = await page.$('input[type="password"], input[name="password"]');
  
  if (emailInput) {
    console.log('   Found email input');
    await emailInput.fill('fred11zyh@outlook.com');
  } else {
    console.log('   WARNING: No email input found');
    // Try all inputs
    const inputs = await page.$$('input');
    console.log('   Found', inputs.length, 'inputs');
    for (let i = 0; i < inputs.length; i++) {
      const type = await inputs[i].getAttribute('type');
      const name = await inputs[i].getAttribute('name');
      const placeholder = await inputs[i].getAttribute('placeholder');
      console.log(`   Input ${i}: type=${type} name=${name} placeholder=${placeholder}`);
    }
  }
  
  if (passInput) {
    console.log('   Found password input');
    await passInput.fill('ZYH11fred@blooket');
  } else {
    console.log('   WARNING: No password input found');
  }
  
  // Step 3: Click login button
  console.log('3. Clicking login...');
  const loginBtn = await page.$('button[type="submit"], button:has-text("Log in"), button:has-text("Sign in")');
  if (loginBtn) {
    await loginBtn.click();
    console.log('   Clicked login button');
  } else {
    const buttons = await page.$$('button');
    console.log('   Found', buttons.length, 'buttons');
    for (let i = 0; i < buttons.length; i++) {
      const text = await buttons[i].textContent();
      console.log(`   Button ${i}: "${text?.trim()}"`);
    }
  }
  
  // Wait for navigation
  await page.waitForTimeout(5000);
  console.log('   After login URL:', page.url());
  
  // Take screenshot
  await page.screenshot({ path: '/tmp/blooket-test-login.png' });
  console.log('4. Screenshot saved to /tmp/blooket-test-login.png');
  
  // Check if logged in
  const loggedIn = !page.url().includes('login');
  console.log('Logged in:', loggedIn ? 'YES' : 'NO/POSSIBLY');
  
  await browser.close();
  console.log('Done.');
})().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
