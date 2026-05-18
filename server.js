#!/usr/bin/env node
/**
 * Blooket Crawler v2.6.1 — 远程控制自动答题爬虫（Gold Quest + Fishing Frenzy + Crypto Hack）
 * 部署: https://blooket.derfzyh.xyz  |  文档: /docs
 * 代码与 run5.js 同步 — 唯一权威版本
 */
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');
const { GOLD_QUEST_CHEST_HACK } = require('./gold-quest-chest-hack');

chromium.use(StealthPlugin());
const PORT = process.env.PORT || 3458;
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.get('/', (req, res) => {
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.send(fs.readFileSync(path.join(__dirname, 'public', 'control.html'), 'utf8'));
});
app.get('/docs', (req, res) => {
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.send(fs.readFileSync(path.join(__dirname, 'public', 'docs.html'), 'utf8'));
});
app.use(express.static(path.join(__dirname, 'public')));

// ====== State ======
let browser = null, gamePage = null, monitorInterval = null;
let botStatus = { mode: 'idle', gameMode: '', gamePin: '', autoAnswer: false, logs: [] };

function log(msg) {
  const e = `[${new Date().toLocaleTimeString('zh-CN')}] ${msg}`;
  console.log(e); botStatus.logs.push(e);
  if (botStatus.logs.length > 200) botStatus.logs.shift();
  io.emit('log', e); io.emit('status', botStatus);
}

// ====== GAME STATE JS (identical to run5.js) ======
const GAME_STATE_JS = `(function(){
function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
for(var el of document.querySelectorAll('*')){
var k=Object.keys(el).filter(function(x){return x.indexOf('__react')===0});if(!k.length)continue;
var s=wF(el[k[0]],0);if(!s)continue;
var hasGame=Object.keys(s).some(function(k){return k==='question'||k==='stage'||k==='gold'||k==='choices'||k==='weight'||k==='lure'||k==='crypto'||k==='password'||k==='correctPassword'});
if(!hasGame)continue;
var qt=s.question&&(s.question.question||s.question.text);

// Question phase
if(qt&&s.question.correctAnswers){
var ca=Array.isArray(s.question.correctAnswers)?s.question.correctAnswers:[s.question.correctAnswers];
return{stage:s.stage||'question',questionText:qt,correctAnswers:ca,gold:s.gold,weight:s.weight,isFrenzy:s.isFrenzy,lure:s.lure,crypto:s.crypto,password:s.password,passwordOptions:s.passwordOptions,correctPassword:s.correctPassword,pathname:location.pathname}
}

// Prize phase
if(s.stage==='prize'&&s.choices&&s.choices.length>=3){
var opts=s.choices.map(function(c){var t=c.text||'';return t});
return{stage:'prize',choices:opts,gold:s.gold,pathname:location.pathname}
}

// Fishing state (weight/lure present, no question)
if(s.weight!==undefined||s.lure!==undefined){
return{stage:s.stage||'fishing',weight:s.weight,isFrenzy:s.isFrenzy,lure:s.lure,gold:s.gold,pathname:location.pathname}
}

// Crypto guessing state (passwordOptions present, no question)
if(s.password!==undefined&&s.passwordOptions&&s.passwordOptions.length>0){
return{stage:s.stage||'guessing',crypto:s.crypto,password:s.password,passwordOptions:s.passwordOptions,correctPassword:s.correctPassword,gold:s.gold,pathname:location.pathname}
}

// Intro / password selection (Crypto Hack new user)
if(s.stage==='intro'&&s.passwordOptions&&s.passwordOptions.length>0){
return{stage:'intro',passwordOptions:s.passwordOptions,gold:s.gold,crypto:s.crypto,pathname:location.pathname}
}

// Any game state
if(s.stage)return{stage:s.stage,gold:s.gold,weight:s.weight,crypto:s.crypto,pathname:location.pathname}
}
return{stage:'none',pathname:location.pathname}
})()`;

// ====== AUTO ANSWER JS (e3c4c81 base + intro tracking + answer dedup) ======
// ====== AUTO ANSWER JS (fixed: no early break, always step 5) ======
// ====== AUTO ANSWER JS (cc41e2b base + crypto + fishing) ======
const AUTO_ANSWER_JS = `(function(){
if(window.__aaId)clearInterval(window.__aaId);
window.__aaLastQ='';window.__aaLastPw='';
window.__aaId=setInterval(function(){
try{
function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
for(var el of document.querySelectorAll('*')){
var k=Object.keys(el).filter(function(x){return x.indexOf('__react')===0});if(!k.length)continue;
var s=wF(el[k[0]],0);if(!s)continue;
var hasGame=Object.keys(s).some(function(k){return k==='question'||k==='stage'||k==='gold'||k==='choices'||k==='weight'||k==='lure'||k==='crypto'||k==='password'||k==='correctPassword'});
if(!hasGame)continue;
var qt=s.question&&(s.question.question||s.question.text);
var weight=s.weight,lure=s.lure,pwOpts=s.passwordOptions;

// 0. Crypto Hack intro password selection
if(s.stage==='intro'&&pwOpts&&pwOpts.length>0&&!qt){
var pc=false;
document.querySelectorAll('div[class*="button"]').forEach(function(c){
if(pc)return;var t=(c.textContent||'').trim();
if(t.length>2&&t.length<40&&c.offsetHeight>0&&c.offsetHeight<100&&!window.__aaLastPw){
c.click();window.__aaLastPw=t;console.log('[Bot] picked password: '+t);pc=true;
}});break;
}

// 1. Answer question (cc41e2b style)
if(qt&&s.question.correctAnswers){
var ca=Array.isArray(s.question.correctAnswers)?s.question.correctAnswers:[s.question.correctAnswers];
document.querySelectorAll('[class*="answerContainer"]').forEach(function(c){
var t=(c.textContent||'').trim();
if(ca.some(function(a){return(a||'').toString().trim()===t})&&c.offsetHeight>0){c.click();console.log('[Bot] answered: '+t)}
});
}

// 2. CHEST SELECTION
if(s.stage==='prize'&&s.choices&&s.choices.length>=3){
var bestVal=-1,bestIdx=0;
s.choices.forEach(function(c,i){
var txt=c.text||c.question||'';
var m=txt.match(/\\+?\\s*(\\d+)/);var v=m?parseInt(m[1]):0;
if(txt.indexOf('Triple')>=0)v=999;if(txt.indexOf('Double')>=0)v=666;
if(v>bestVal){bestVal=v;bestIdx=i}
});
var ce=document.querySelectorAll('[class*="chest"],[class*="Chest"],[class*="prize"]');
if(ce.length>bestIdx&&ce[bestIdx].offsetHeight>0){ce[bestIdx].click();console.log('[Bot] picked chest #'+bestIdx+' ('+bestVal+')')}
}

// 3. Fishing auto-click
if((weight!==undefined||lure!==undefined)&&!qt){
document.querySelectorAll('[class*="cast"],[class*="Cast"],[class*="fish"],[class*="Fish"],[class*="reel"],[class*="Reel"]').forEach(function(c){
if(c.offsetHeight>0){c.click();console.log('[Bot] fishing click')}
});
}

// 4. Crypto password guessing
if(pwOpts&&pwOpts.length>0&&!qt){
var correctPw=s.correctPassword||(pwOpts[0]||'').toString().trim();
var clicked=false;
document.querySelectorAll('[class*="button"],[role=button]').forEach(function(c){
var t=(c.textContent||'').trim();
if(!clicked&&correctPw&&t===correctPw&&c.offsetHeight>0){c.click();console.log('[Bot] crypto guessed: '+t);clicked=true}
});
if(!clicked&&s&&s.password!==undefined&&s.passwordOptions){
s.password=s.correctPassword||s.passwordOptions[0];
if(s.forceUpdate)s.forceUpdate();
console.log('[Bot] crypto state override: '+(s.correctPassword||s.passwordOptions[0]))
}
}

// 5. Click ALL buttons/clickables to advance
document.querySelectorAll('button:not([disabled])').forEach(function(c){if(c.offsetHeight>0)c.click()});
document.querySelectorAll('[role=button]').forEach(function(c){if(c.offsetHeight>0)c.click()});
break;
}
}catch(e){}
},600)})()`;



// Wait until URL changes from current (handles slow network)
async function waitForNav(page, timeoutMs = 15000) {
  const startUrl = page.url();
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await new Promise(r => setTimeout(r, 300));
    try {
      if (page.isClosed()) return false;
      if (page.url() !== startUrl) return true;
    } catch(e) { return false; }
  }
  return false;
}

// Wait for an element to be visible with retries
async function waitForVisible(page, selector, timeoutMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      if (page.isClosed()) return null;
      const el = page.locator(selector).first();
      if (await el.isVisible({ timeout: 500 }).catch(() => false)) return el;
    } catch(e) {}
    await new Promise(r => setTimeout(r, 500));
  }
  return null;
}

// ====== Core Actions ======
async function joinGame(pin, playerName) {
  stopAutoAnswer(); if (monitorInterval) clearInterval(monitorInterval);
  botStatus.mode = 'joining'; botStatus.gamePin = pin; io.emit('status', botStatus);

  // Fresh browser
  if (browser?.isConnected()) try { await browser.close(); } catch(e) {}
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  await ctx.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => false }); });
  gamePage = await ctx.newPage();
  
  const name = (playerName || 'Bot') + Math.floor(Math.random() * 9000 + 1000);
  log(`🏃 加入 PIN:${pin} (${name})`);

  // Step 1: Load play page
  await gamePage.goto('https://play.blooket.com/play', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await gamePage.waitForTimeout(1000);
  log(`   📄 页面已加载: ${gamePage.url()}`);

  // Dismiss cookie consent
  try {
    await gamePage.evaluate(() => { document.querySelectorAll('button').forEach(b => { var t = b.textContent || ''; if (t.includes('Accept') || t.includes('Reject')) b.click(); }); });
    await gamePage.waitForTimeout(1500);
    try { await gamePage.click('button:has-text("Accept")', { timeout: 2000 }); } catch(e) {}
    log('   🍪 Cookie 已处理');
  } catch(e) { log(`   ℹ️ Cookie 跳过: ${e.message}`); }

  // Step 2: Enter PIN and submit, then WAIT for navigation
  log('   ⌨️ 输入 PIN...');
  try {
    const pinInput = await waitForVisible(gamePage, 'input[name="join-code"]');
    if (!pinInput) throw new Error('PIN输入框未找到');
    await pinInput.click();
    await gamePage.keyboard.type(pin, { delay: 80 });
    
    let submitted = false;
    await gamePage.keyboard.press('Enter');
    await new Promise(r => setTimeout(r, 2000));
    try {
      const submitBtn = await waitForVisible(gamePage, 'button[type="submit"]:not([disabled])', 5000);
      if (submitBtn) { await submitBtn.click(); submitted = true; log('   ✅ PIN 已提交 (click)'); }
    } catch(e) {}
    if (!submitted) log('   ✅ PIN 已提交 (Enter)');
    
    // Wait for URL to change (navigate to name/register page)
    const urlBefore = gamePage.url();
    log(`   ⏳ 等待跳转... (当前: ${urlBefore})`);
    const navOk = await waitForNav(gamePage, 15000);
    if (navOk) { log(`   ✅ 已跳转: ${gamePage.url()}`); }
    else { log(`   ⚠️ 未跳转，当前: ${gamePage.url()}`); }
    await gamePage.waitForTimeout(2000);
  } catch(e) { log(`   ❌ PIN提交失败: ${e.message}`); }

  // Step 3: Enter name (if prompted), then WAIT for navigation
  try {
    const nameEl = await waitForVisible(gamePage, 'input:not([type="hidden"]):not([name="join-code"])', 10000);
    if (nameEl) {
      log('   ⌨️ 填写名字...');
      try {
        await nameEl.click();
        await nameEl.fill('');
        await gamePage.keyboard.type(name, { delay: 50 });
        await gamePage.keyboard.press('Enter');
        await new Promise(r => setTimeout(r, 2000));
        
        const nameNavOk = await waitForNav(gamePage, 15000);
        if (nameNavOk) {
          log(`   ✅ 名字已提交: ${gamePage.url()}`);
        } else {
          log('   ⚠️ 未跳转，尝试点击加入按钮...');
          try {
            for (const sel of ['[class*=joinButton]', '[class*=playButton]', '[class*=registerButton]', 'button', '[role=button]']) {
              const btns = await gamePage.$$(sel);
              for (const btn of btns) {
                const txt = ((await btn.textContent()) || '').trim().toLowerCase();
                if ((txt.includes('join') || txt.includes('play') || txt.includes('enter') || txt.includes('register') || txt.includes('pay')) && await btn.isVisible()) {
                  await btn.click();
                  await waitForNav(gamePage, 10000);
                  log(`   ✅ 加入按钮已点击: ${gamePage.url()}`);
                  break;
                }
              }
            }
          } catch(e) {}
        }
      } catch(e) { log(`   ⚠️ 名字输入异常: ${e.message}`); }
    } else {
      log('   ℹ️ 无需输入名字（可能直接加入）');
    }
  } catch(e) { log(`   ℹ️ 名字步骤跳过: ${e.message}`); }

  log(`✅ 已加入: ${gamePage.url()}`);
  startMonitor(); 
  setTimeout(async () => { if (gamePage && !gamePage.isClosed()) await startAutoAnswer(); }, 2000);
  io.emit('status', botStatus);
  return true;
}

function startMonitor() {
  if (monitorInterval) clearInterval(monitorInterval);
  monitorInterval = setInterval(async () => {
    if (!gamePage || gamePage.isClosed()) { clearInterval(monitorInterval); return; }
    try {
      let state = null;
      for (const f of gamePage.frames()) { try { state = await f.evaluate(GAME_STATE_JS); if (state) break; } catch(e) {} }
      if (!state) try { state = await gamePage.evaluate(GAME_STATE_JS); } catch(e) {}
      if (state) {
        io.emit('gameState', state);
        if (state.questionText) {
          botStatus.mode = 'playing';
          var parts = ['📝 题目: '+state.questionText, '✅ '+(state.correctAnswers||[]).join(','), '💰 '+(state.gold||0)];
          if (state.pathname?.includes('fishing')) { parts.push('🐟 重量:'+state.weight+' 狂:'+(state.isFrenzy?'是':'否')); botStatus.gameMode = 'fishing'; }
          else if (state.pathname?.includes('gold')) { botStatus.gameMode = 'gold'; }
          else if (state.pathname?.includes('hack')) { parts.push('🔐 加密币:'+state.crypto+(state.correctPassword?' 正确密码:'+state.correctPassword:'')); botStatus.gameMode = 'crypto'; }
          log(parts.join(' | '));
          if (state.pathname?.includes('fishing')) botStatus.gameMode = 'fishing';
          else if (state.pathname?.includes('gold')) botStatus.gameMode = 'gold';
          else if (state.pathname?.includes('hack')) botStatus.gameMode = 'crypto';
        } else if (state.weight!==undefined) {
          botStatus.mode = 'fishing';
          botStatus.gameMode = 'fishing';
          log('🎣 钓鱼中 | 🐟 重量:'+state.weight+' | 💰 '+state.gold+' | 狂:'+(state.isFrenzy?'是':'否')+' | 饵:'+state.lure);
        } else if (state.stage==='intro'&&state.passwordOptions&&state.passwordOptions.length>0) {
          botStatus.mode = 'playing';
          botStatus.gameMode = 'crypto';
          log('🔑 密码选择 | 选项:'+(state.passwordOptions||[]).slice(0,5).join(', '));
        } else if (state.passwordOptions&&state.passwordOptions.length>0) {
          botStatus.mode = 'guessing';
          botStatus.gameMode = 'crypto';
          log('🔓 密码猜测 | 🔐 加密币:'+state.crypto+' | 密码:'+state.password+' | 正确:'+state.correctPassword+' | 选项:'+(state.passwordOptions||[]).slice(0,3).join(',')+'');
        }
        io.emit('status', botStatus);
      }
    } catch(e) {}
  }, 1500);
}

async function startAutoAnswer() {
  if (!gamePage || gamePage.isClosed()) { log('❌ 无活跃游戏'); return; }
  botStatus.autoAnswer = true; io.emit('status', botStatus);
  log('🤖 自动答题启动');
  for (const f of gamePage.frames()) { try { await f.evaluate(AUTO_ANSWER_JS); } catch(e) {} }
  try { await gamePage.evaluate(AUTO_ANSWER_JS); } catch(e) {}
  // Also inject Gold Quest chest hack
  if (botStatus.gameMode === 'gold') {
    await injectGQChestHack();
    await gqStartAuto('worst'); // default: pick worst to stay under 10000
  }
  log('✅ 自动答题已激活（答题+最优宝箱+钓鱼+密码猜测+前进）');
}

function stopAutoAnswer() {
  botStatus.autoAnswer = false;
  if (gamePage && !gamePage.isClosed()) {
    gamePage.frames().forEach(f => f.evaluate('clearInterval(window.__aaId)').catch(() => {}));
  }
  io.emit('status', botStatus);
}

// ====== Gold Quest Chest Manipulation ======
async function injectGQChestHack() {
  if (!gamePage || gamePage.isClosed()) return 'no-page';
  try {
    for (const f of gamePage.frames()) { try { await f.evaluate(GOLD_QUEST_CHEST_HACK); } catch(e) {} }
    try { await gamePage.evaluate(GOLD_QUEST_CHEST_HACK); } catch(e) {}
    log('🎁 Gold Quest 宝箱操控模块已注入');
    return 'ok';
  } catch(e) { return 'err:' + e.message; }
}

async function gqGetChestInfo() {
  if (!gamePage || gamePage.isClosed()) return null;
  try {
    for (const f of gamePage.frames()) {
      const r = await f.evaluate('window.gqGetChestInfo?window.gqGetChestInfo():null').catch(()=>null);
      if (r) return r;
    }
    return await gamePage.evaluate('window.gqGetChestInfo?window.gqGetChestInfo():null').catch(()=>null);
  } catch(e) { return null; }
}

async function gqPickChest(strategy) {
  if (!gamePage || gamePage.isClosed()) return 'no-page';
  try {
    const s = typeof strategy === 'string' ? JSON.stringify(strategy) : strategy;
    for (const f of gamePage.frames()) {
      const r = await f.evaluate('window.gqPickChest?window.gqPickChest('+s+'):null').catch(()=>null);
      if (r) return r;
    }
    return await gamePage.evaluate('window.gqPickChest?window.gqPickChest('+s+'):null').catch(()=>null);
  } catch(e) { return 'err:' + e.message; }
}

async function gqStartAuto(strategy) {
  if (!gamePage || gamePage.isClosed()) return 'no-page';
  try {
    const opts = JSON.stringify({chestStrategy: strategy||'worst'});
    for (const f of gamePage.frames()) { try { await f.evaluate('window.gqStartAuto?window.gqStartAuto('+opts+'):null') } catch(e) {} }
    try { await gamePage.evaluate('window.gqStartAuto?window.gqStartAuto('+opts+'):null'); } catch(e) {}
    log('🤖 GQ自动模式启动 (strategy:'+(strategy||'worst')+')');
    return 'ok';
  } catch(e) { return 'err:' + e.message; }
}

// ====== Cheats ======
async function injectCheat(gameMode, cheatType, value) {
  if (!gamePage || gamePage.isClosed()) return 'no-page';
  const c = {
    gold: { setGold: `(function(){try{for(var e of document.querySelectorAll('*')){var k=Object.keys(e).find(function(x){return x.indexOf('__react')===0});if(!k)continue;function w(n,d){if(!n||d>50)return;try{var s=n.stateNode?.state;if(s&&s.gold!==undefined){s.gold=${value||9999};s.forceUpdate&&s.forceUpdate()}}catch(e){}w(n.child,d+1);w(n.sibling,d+1);w(n.return,d+1)}w(e[k],0)}return'ok'})()` },
    fishing: {
      frenzy: `(function(){try{for(var e of document.querySelectorAll('*')){var k=Object.keys(e).find(function(x){return x.indexOf('__react')===0});if(!k)continue;function w(n,d){if(!n||d>50)return;try{var s=n.stateNode?.state;if(s&&s.isFrenzy!==undefined){s.isFrenzy=true;forceUpdate&&s.forceUpdate()}}catch(e){}w(n.child,d+1);w(n.sibling,d+1);w(n.return,d+1)}w(e[k],0)}return'ok'})()`,
      weight: `(function(){try{for(var e of document.querySelectorAll('*')){var k=Object.keys(e).find(function(x){return x.indexOf('__react')===0});if(!k)continue;function w(n,d){if(!n||d>50)return;try{var s=n.stateNode?.state;if(s&&s.weight!==undefined){s.weight=${value||999};s.forceUpdate&&s.forceUpdate()}}catch(e){}w(n.child,d+1);w(n.sibling,d+1);w(n.return,d+1)}w(e[k],0)}return'ok'})()`,
      lure: `(function(){try{for(var e of document.querySelectorAll('*')){var k=Object.keys(e).find(function(x){return x.indexOf('__react')===0});if(!k)continue;function w(n,d){if(!n||d>50)return;try{var s=n.stateNode?.state;if(s&&s.lure!==undefined){s.lure=${value||4};s.forceUpdate&&s.forceUpdate()}}catch(e){}w(n.child,d+1);w(n.sibling,d+1);w(n.return,d+1)}w(e[k],0)}return'ok'})()`,
      fishSize: `(function(){if(window.__bfsHooked)return 'already-hooked';window.__bfsHooked=true;var _r=Math.random;Math.random=function(){return 0.8+_r()*0.2};var _si=setInterval(function(){try{function w(n,d){if(!n||d>50)return;try{var s=n.stateNode?.state;if(s&&s.weight!==undefined){s.weight=9999;s.forceUpdate&&s.forceUpdate()}}catch(e){}w(n.child,d+1);w(n.sibling,d+1);w(n.return,d+1)}for(var el of document.querySelectorAll('*')){var k=Object.keys(el).find(function(x){return x.indexOf('__react')===0});if(k)w(el[k],0)}}catch(e){}},500);return'ok'})()`
    },
    crypto: {
      setCrypto: `(function(){try{for(var e of document.querySelectorAll('*')){var k=Object.keys(e).find(function(x){return x.indexOf('__react')===0});if(!k)continue;function w(n,d){if(!n||d>50)return;try{var s=n.stateNode?.state;if(s&&s.crypto!==undefined){s.crypto=${value||99999};s.forceUpdate&&s.forceUpdate()}}catch(e){}w(n.child,d+1);w(n.sibling,d+1);w(n.return,d+1)}w(e[k],0)}return'ok'})()`,
      guessPassword: `(function(){try{for(var e of document.querySelectorAll('*')){var k=Object.keys(e).find(function(x){return x.indexOf('__react')===0});if(!k)continue;function w(n,d){if(!n||d>50)return;try{var s=n.stateNode?.state;if(s&&s.password!==undefined&&s.passwordOptions&&s.passwordOptions.length>0){s.password=s.passwordOptions[0];s.forceUpdate&&s.forceUpdate();return'guessed='+s.passwordOptions[0]}}catch(e){}w(n.child,d+1);w(n.sibling,d+1);var r=w(n.return,d+1);if(r)return r}var r=w(e[k],0);if(r)return r}return'no-state'})()`,
      drawRig: `(function(){if(window.__chDrawRig)return 'already-rigged';window.__chDrawRig=true;var _r=Math.random;var bias=1.0;Math.random=function(){var v=_r()+bias*0.3;return v>0.9999?0.9999:v};return 'draw-rigged: biased+'+bias})()`,
      getPassword: `(function(){for(var e of document.querySelectorAll('*')){var k=Object.keys(e).find(function(x){return x.indexOf('__react')===0});if(!k)continue;function w(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s&&s.correctPassword!==undefined)return s.correctPassword;if(s&&s.password!==undefined&&s.passwordOptions&&s.passwordOptions.length>0)return s.passwordOptions[0]}catch(e){}var r=w(n.child,d+1);if(r)return r;r=w(n.sibling,d+1);if(r)return r;return w(n.return,d+1)}var r=w(e[k],0);if(r)return'pw:'+r}return'no-password'})()`,
      passwordCheck: `(function(){for(var e of document.querySelectorAll('*')){var k=Object.keys(e).find(function(x){return x.indexOf('__react')===0});if(!k)continue;function w(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s&&s.passwordOptions&&s.passwordOptions.length>0){var cp=s.correctPassword||s.passwordOptions[0];var pwOpts=s.passwordOptions;var idx=pwOpts.indexOf(cp);var rank=idx>=0?'# '+(idx+1)+'/'+pwOpts.length:'not-in-list';var weak=(idx===0)?'⚠️ FIRST (极易被猜中!)':(idx===1)?'⚠️ SECOND (容易被猜中!)':(idx===pwOpts.length-1)?'✅ LAST (最安全)':'✓ OK (位置'+ (idx+1)+')';return JSON.stringify({correctPw:cp,position:rank,vulnerability:weak,allOptions:pwOpts})}}catch(e){}var r=w(n.child,d+1);if(r)return r;r=w(n.sibling,d+1);if(r)return r;return w(n.return,d+1)}var r=w(e[k],0);if(r)return r}return'no-state'})()`
    }
  };
  const code = c[gameMode]?.[cheatType];
  if (!code) return 'unknown-cheat';
  try { for (const f of (gamePage?.frames() || [])) { try { return await f.evaluate(code); } catch(e) {} } } catch(e) {}
  try { return await gamePage.evaluate(code); } catch(e) { return 'err:' + e.message; }
  return 'no-frames';
}

// ====== Socket.IO ======
io.on('connection', socket => {
  log('🔌 面板连接');
  socket.emit('status', botStatus); socket.emit('logs', botStatus.logs);

  socket.on('joinGame', async d => { try { await joinGame(d.pin, d.name); } catch(e) { log('❌ joinGame错误: '+e.message); } });
  socket.on('startAutoAnswer', async () => { try { await startAutoAnswer(); } catch(e) { log('❌ startAA错误: '+e.message); } });

  socket.on('stop', async () => {
    stopAutoAnswer();
    if (monitorInterval) { clearInterval(monitorInterval); monitorInterval = null; }
    botStatus.mode = 'idle'; io.emit('status', botStatus);
    log('⏹️ 已停止');
  });

  socket.on('cheat', async d => {
    const r = await injectCheat(d.gameMode, d.cheatType, d.value);
    log(`🎯 [${d.cheatType}] → ${r}`);
    socket.emit('cheatResult', { cheatType: d.cheatType, result: r });
  });

  socket.on('getState', async () => {
    if (gamePage && !gamePage.isClosed()) {
      let state = null;
      for (const f of gamePage.frames()) { try { state = await f.evaluate(GAME_STATE_JS); if (state) break; } catch(e) {} }
      if (!state) try { state = await gamePage.evaluate(GAME_STATE_JS); } catch(e) {}
      if (state) socket.emit('gameState', state);
    }
  });

  socket.on('screenshot', async () => {
    if (gamePage && !gamePage.isClosed()) {
      const fn = '/screenshots/screen-' + Date.now() + '.png';
      fs.mkdirSync(path.dirname(path.join(__dirname, 'public', fn)), { recursive: true });
      await gamePage.screenshot({ path: path.join(__dirname, 'public', fn), timeout: 10000 }).catch(() => {});
      socket.emit('screenshot', fn);
    }
  });

  // ====== Gold Quest Chest Commands ======
  socket.on('gqInjectChestHack', async () => {
    const r = await injectGQChestHack();
    socket.emit('gqResult', { action: 'injectChestHack', result: r });
  });
  socket.on('gqGetChestInfo', async () => {
    const r = await gqGetChestInfo();
    socket.emit('gqResult', { action: 'getChestInfo', result: r });
    log('🎁 宝箱信息: ' + JSON.stringify(r).slice(0, 200));
  });
  socket.on('gqPickChest', async d => {
    const r = await gqPickChest(d?.strategy || 'worst');
    socket.emit('gqResult', { action: 'pickChest', strategy: d?.strategy, result: r });
    log('🎯 选宝箱 (strategy:' + (d?.strategy || 'worst') + '): ' + JSON.stringify(r).slice(0, 200));
  });
  socket.on('gqStartAuto', async d => {
    const r = await gqStartAuto(d?.strategy || 'worst');
    socket.emit('gqResult', { action: 'startAuto', strategy: d?.strategy, result: r });
  });
  socket.on('gqManipulateSwitch', async () => {
    if (gamePage && !gamePage.isClosed()) {
      try {
        let r = null;
        for (const f of gamePage.frames()) { r = await f.evaluate('window.gqManipulateSwitch?window.gqManipulateSwitch():null').catch(()=>null); if(r)break }
        if (!r) r = await gamePage.evaluate('window.gqManipulateSwitch?window.gqManipulateSwitch():null').catch(()=>null);
        socket.emit('gqResult', { action: 'manipulateSwitch', result: r });
        log('🔄 Switch操控: ' + r);
      } catch(e) { socket.emit('gqResult', { action: 'manipulateSwitch', result: 'err:' + e.message }); }
    }
  });

  socket.on('reset', async () => {
    stopAutoAnswer();
    if (monitorInterval) clearInterval(monitorInterval);
    botStatus.mode = 'idle'; botStatus.gamePin = ''; io.emit('status', botStatus);
    log('🔄 已重置');
  });
});

server.listen(PORT, () => log(`🌐 v2.5 已启动 :${PORT} | 代码与 run5.js 同步`));

process.on('SIGINT', async () => {
  stopAutoAnswer();
  if (monitorInterval) clearInterval(monitorInterval);
  if (browser) await browser.close();
  process.exit(0);
});
