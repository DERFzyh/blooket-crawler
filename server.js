#!/usr/bin/env node
/**
 * Blooket Crawler v2.6 — 远程控制自动答题爬虫（支持 Gold Quest + Fishing Frenzy + Crypto Hack）
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

// Any game state
if(s.stage)return{stage:s.stage,gold:s.gold,weight:s.weight,crypto:s.crypto,pathname:location.pathname}
}
return{stage:'none',pathname:location.pathname}
})()`;

// ====== AUTO ANSWER JS (identical to run5.js logic) ======
const AUTO_ANSWER_JS = `(function(){
if(window.__aaId)clearInterval(window.__aaId);
window.__aaId=setInterval(function(){
try{
function wF(n,d){if(!n||d>50)return null;try{var s=n.stateNode?.state;if(s)return s}catch(e){}return wF(n.child,d+1)||wF(n.sibling,d+1)||wF(n.return,d+1)}
for(var el of document.querySelectorAll('*')){
var k=Object.keys(el).filter(function(x){return x.indexOf('__react')===0});if(!k.length)continue;
var s=wF(el[k[0]],0);if(!s)continue;
var hasGame=Object.keys(s).some(function(k){return k==='question'||k==='stage'||k==='gold'||k==='choices'||k==='weight'||k==='lure'||k==='crypto'||k==='password'||k==='correctPassword'});
if(!hasGame)continue;
var qt=s.question&&(s.question.question||s.question.text);
var weight=s.weight,lure=s.lure,isFrenzy=s.isFrenzy;
var cr=s.crypto,pw=s.password,pwOpts=s.passwordOptions;

// 1. Answer question
if(qt&&s.question.correctAnswers){
var ca=Array.isArray(s.question.correctAnswers)?s.question.correctAnswers:[s.question.correctAnswers];
var clicked=false;
document.querySelectorAll('[class*="answerContainer"]').forEach(function(c){
if(clicked)return;
var t=(c.textContent||'').trim();
if(ca.some(function(a){return(a||'').toString().trim()===t})&&c.offsetHeight>0){c.click();clicked=true;console.log('[Bot] answered: '+t)}
});
// Fallback: click any visible div with matching text
if(!clicked){
document.querySelectorAll('div').forEach(function(d){
if(clicked)return;
var t=(d.textContent||'').trim();
if(ca.some(function(a){return(a||'').toString().trim()===t})&&d.offsetHeight>0&&d.offsetHeight<200){d.click();clicked=true;console.log('[Bot] fallback-clicked: '+t)}
});
}
}

// 2. CHEST SELECTION - pick best
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

// 3. Fishing auto-click (cast/fish/reel during fishing phase)
if((weight!==undefined||lure!==undefined)&&!qt){
document.querySelectorAll('[class*="fishingRod"],[class*="_fishingRod"],[class*="pageButton"],[class*="_pageButton"],[class*="cast"],[class*="reel"]').forEach(function(c){
if(c.offsetHeight>0){c.click();console.log('[Bot] fishing click')}
});
}

// 4. Crypto password guessing — try ALL options
if(pwOpts&&pwOpts.length>0&&!qt){
// Cycle through password options: if current password matches one, try next
var curPw=s.password||'';
var tryIdx=0;
for(var pi=0;pi<pwOpts.length;pi++){if(curPw===pwOpts[pi]){tryIdx=(pi+1)%pwOpts.length;break}}
var correctPw=s.correctPassword||pwOpts[tryIdx];
// Click element matching the password
var pwClicked=false;
document.querySelectorAll('[class*="button"],[role=button]').forEach(function(c){
if(pwClicked)return;
var t=(c.textContent||'').trim();
if(correctPw&&t===correctPw&&c.offsetHeight>0){c.click();pwClicked=true;console.log('[Bot] crypto guessed: '+t)}
});
// React override fallback
if(!pwClicked&&s.password!==undefined){s.password=correctPw;if(s.forceUpdate)s.forceUpdate();console.log('[Bot] crypto override: '+correctPw)}
}

// 5. Click ALL buttons/clickables to advance
document.querySelectorAll('button:not([disabled])').forEach(function(c){if(c.offsetHeight>0)c.click()});
document.querySelectorAll('[role=button]').forEach(function(c){if(c.offsetHeight>0)c.click()});
break;
}
}catch(e){}
},600)})()`;

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

  await gamePage.goto('https://play.blooket.com/play', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await gamePage.waitForTimeout(2000);
  // Dismiss cookie consent with aggressive evaluate + wait
  await gamePage.evaluate(() => {
    var btns=document.querySelectorAll('button');
    for(var i=0;i<btns.length;i++){var t=btns[i].textContent||'';if(t.includes('Accept')||t.includes('Reject'))btns[i].click()}
  });
  await gamePage.waitForTimeout(2000);
  // Try again with Playwright click as fallback
  try { await gamePage.click('button:has-text("Accept")', { timeout: 3000 }); await gamePage.waitForTimeout(1000); } catch(e) {}
  await gamePage.locator('input[name="join-code"]').click();
  await gamePage.keyboard.type(pin, { delay: 80 });
  log('   ✅ PIN 已输入');
  await gamePage.locator('button[type="submit"]:not([disabled])').first().click({ timeout: 5000 });
  await gamePage.waitForTimeout(8000);

  try {
    // Type name into the first visible text input
    const inputs = await gamePage.$$('input');
    for (const i of inputs) { const vis = await i.isVisible(); const nameAttr = await i.getAttribute('name'); const typeAttr = await i.getAttribute('type'); if (vis && typeAttr !== 'hidden' && nameAttr !== 'join-code') { await i.click(); await gamePage.keyboard.type(name, { delay: 50 }); break; } }
    await gamePage.keyboard.press("Enter");
    await gamePage.waitForTimeout(2000);
    try { await gamePage.locator("[class*=joinButton]").first().click({timeout:2000}); } catch(e) {}
    // Click join button (try multiple selectors)
    try { await gamePage.locator('[class*="joinButton"], [class*="join"]').first().click({timeout:3000}); } catch(e) {}
    await gamePage.waitForTimeout(3000);
    // Also try pressing Enter
    try { await gamePage.keyboard.press('Enter'); } catch(e) {}
    await gamePage.waitForTimeout(3000);
    log(`   ✅ 名字已提交: ${gamePage.url()}`);
  } catch (e) { log('   ℹ️ 跳过名字'); }

  log(`✅ 已加入: ${gamePage.url()}`);
  startMonitor(); 
  // Auto-start auto-answer after joining
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
  log('✅ 自动答题已激活（答题+最优宝箱+钓鱼+密码猜测+前进）');
}

function stopAutoAnswer() {
  botStatus.autoAnswer = false;
  if (gamePage && !gamePage.isClosed()) {
    gamePage.frames().forEach(f => f.evaluate('clearInterval(window.__aaId)').catch(() => {}));
  }
  io.emit('status', botStatus);
}

// ====== Cheats ======
async function injectCheat(gameMode, cheatType, value) {
  if (!gamePage || gamePage.isClosed()) return 'no-page';
  const c = {
    gold: { setGold: `(function(){try{for(var e of document.querySelectorAll('*')){var k=Object.keys(e).find(function(x){return x.indexOf('__react')===0});if(!k)continue;function w(n,d){if(!n||d>50)return;try{var s=n.stateNode?.state;if(s&&s.gold!==undefined){s.gold=${value||9999};s.forceUpdate&&s.forceUpdate()}}catch(e){}w(n.child,d+1);w(n.sibling,d+1);w(n.return,d+1)}w(e[k],0)}return'ok'})()` },
    fishing: {
      frenzy: `(function(){try{for(var e of document.querySelectorAll('*')){var k=Object.keys(e).find(function(x){return x.indexOf('__react')===0});if(!k)continue;function w(n,d){if(!n||d>50)return;try{var s=n.stateNode?.state;if(s&&s.isFrenzy!==undefined){s.isFrenzy=true;forceUpdate&&s.forceUpdate()}}catch(e){}w(n.child,d+1);w(n.sibling,d+1);w(n.return,d+1)}w(e[k],0)}return'ok'})()`,
      weight: `(function(){try{for(var e of document.querySelectorAll('*')){var k=Object.keys(e).find(function(x){return x.indexOf('__react')===0});if(!k)continue;function w(n,d){if(!n||d>50)return;try{var s=n.stateNode?.state;if(s&&s.weight!==undefined){s.weight=${value||999};s.forceUpdate&&s.forceUpdate()}}catch(e){}w(n.child,d+1);w(n.sibling,d+1);w(n.return,d+1)}w(e[k],0)}return'ok'})()`,
      lure: `(function(){try{for(var e of document.querySelectorAll('*')){var k=Object.keys(e).find(function(x){return x.indexOf('__react')===0});if(!k)continue;function w(n,d){if(!n||d>50)return;try{var s=n.stateNode?.state;if(s&&s.lure!==undefined){s.lure=${value||4};s.forceUpdate&&s.forceUpdate()}}catch(e){}w(n.child,d+1);w(n.sibling,d+1);w(n.return,d+1)}w(e[k],0)}return'ok'})()`
    },
    crypto: {
      setCrypto: `(function(){try{for(var e of document.querySelectorAll('*')){var k=Object.keys(e).find(function(x){return x.indexOf('__react')===0});if(!k)continue;function w(n,d){if(!n||d>50)return;try{var s=n.stateNode?.state;if(s&&s.crypto!==undefined){s.crypto=${value||99999};s.forceUpdate&&s.forceUpdate()}}catch(e){}w(n.child,d+1);w(n.sibling,d+1);w(n.return,d+1)}w(e[k],0)}return'ok'})()`,
      guessPassword: `(function(){try{for(var e of document.querySelectorAll('*')){var k=Object.keys(e).find(function(x){return x.indexOf('__react')===0});if(!k)continue;function w(n,d){if(!n||d>50)return;try{var s=n.stateNode?.state;if(s&&s.password!==undefined&&s.passwordOptions&&s.passwordOptions.length>0){s.password=s.passwordOptions[0];s.forceUpdate&&s.forceUpdate();return'guessed='+s.passwordOptions[0]}}catch(e){}w(n.child,d+1);w(n.sibling,d+1);var r=w(n.return,d+1);if(r)return r}var r=w(e[k],0);if(r)return r}return'no-state'})()`
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
