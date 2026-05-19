/**
 * Gold Quest 宝箱操控模块 - 技术路径验证
 * 
 * 核心原理:
 * 1. ESP读取: 从 React Fiber 遍历读取 state.choices 看到每个宝箱内容
 * 2. 主动选择: 根据策略(Math.random hook或直接点击)选择宝箱
 * 3. 金币控制: 选最低价值宝箱保金币<10000，或选特定效果(Swap/Steal)
 * 
 * 使用方式: 注入到 Gold Quest 游戏页面即可
 *   await page.evaluate(GOLD_QUEST_CHEST_HACK);
 */

const GOLD_QUEST_CHEST_HACK = `(function(){
if(window.__gqChestHack)return;window.__gqChestHack=true;

// ====== React Fiber 状态读取 ======
function walkFiber(n,d){
if(!n||d>50)return null;
try{var s=n.stateNode?.state;if(s)return s}catch(e){}
return walkFiber(n.child,d+1)||walkFiber(n.sibling,d+1)||walkFiber(n.return,d+1);
}

function findState(){
for(var el of document.querySelectorAll('*')){
var k=Object.keys(el).find(x=>x.indexOf('__react')===0);if(!k)continue;
var s=walkFiber(el[k],0);if(!s)continue;
if(s.question||s.stage||s.gold!==undefined||s.choices)return s;
}
return null;
}

// ====== Hook Math.random (宝箱结果操控) ======
var _origRandom=Math.random;
var _rigQueue=[];

Math.random=function(){
if(_rigQueue.length>0)return _rigQueue.shift();
return _origRandom.call(Math);
};

// 设置下一次 random 返回值 (范围0-1)
window.gqRigRandom=function(v){_rigQueue.push(v);};

// 批量设置
window.gqRigRandomMulti=function(vs){vs.forEach(function(v){_rigQueue.push(v)});};

/**
 * 宝箱选择策略:
 * @param {string} strategy - "worst"(最低金币) | "best"(最高金币) | "swap"(偷/换) | "index:N"(指定索引)
 * @returns {object} 宝箱信息
 */
window.gqGetChestInfo=function(){
var s=findState();
if(!s||s.stage!=='prize'||!s.choices||s.choices.length<2)return null;

return {
gold:s.gold,
gold2:s.gold2,
choices:s.choices.map(function(c,i){
// Deep inspect each choice
var info={index:i,className:(c.className||''),rawProps:{}};
try{for(var k in c){if(c.hasOwnProperty(k)){var v=c[k];if(typeof v!=='function')info.rawProps[k]=v}}}catch(e){}
info.text=c.text||c.question||null;
// Detect reward type
if(info.text){
if(info.text.match(/swap|swp/i))info.type='swap';
else if(info.text.match(/steal|stl/i))info.type='steal'; 
else if(info.text.match(/triple/i))info.type='triple';
else if(info.text.match(/double/i))info.type='double';
else if(info.text.match(/lose|los/i))info.type='lose';
else{var m=info.text.match(/\\+?\\s*(\\d+)/);if(m)info.type='gold';info.amount=parseInt(m[1])||0;}
}
return info;
})
};
};

/**
 * 选择指定策略的宝箱
 */
window.gqPickChest=function(strategy){
var info=window.gqGetChestInfo();
if(!info)return null;

var idx=0;

if(strategy==='worst'||!strategy){
var minV=99999;
info.choices.forEach(function(c,i){
var v=c.amount||0;
if(c.type==='swap'||c.type==='steal')v=5;
if(c.type==='lose')v=-999;
if(c.type==='double')v=10000; // avoid double unless forced
if(c.type==='triple')v=20000;
if(v<minV){minV=v;idx=i}
});
}else if(strategy==='best'){
var maxV=-1;
info.choices.forEach(function(c,i){
var v=c.amount||0;
if(c.type==='triple')v=99999;
if(c.type==='double')v=50000;
if(v>maxV){maxV=v;idx=i}
});
}else if(strategy==='swap'||strategy==='steal'){
info.choices.forEach(function(c,i){if(c.type==='swap')idx=i});
}else if(typeof strategy==='number'){
idx=strategy;
}else if(strategy&&strategy.indexOf('index:')===0){
idx=parseInt(strategy.split(':')[1])||0;
}

// Click the chest
var ce=document.querySelectorAll('[class*="chest"],[class*="Chest"],[class*="prize"],[class*="chestImage"]');
console.log('[GQ-CHEST] Picking #'+idx+'/'+ce.length+' strategy:'+strategy);
console.log('[GQ-CHEST] Choices:',JSON.stringify(info.choices.map(function(c){
return c.index+':'+c.type+(c.amount?'+'+c.amount:'')+(c.text?' "'+c.text+'"':'');
})));

if(ce.length>idx&&ce[idx].offsetHeight>0){
ce[idx].click();
return {picked:idx,info:info};
}
return null;
};

// ====== Switch/Swap 操控 (偷最富玩家) ======
window.gqManipulateSwitch=function(){
var s=findState();
if(!s)return null;

// 尝试获取排行榜
var standings=null;
for(var el of document.querySelectorAll('*')){
var k=Object.keys(el).find(x=>x.indexOf('__react')===0);if(!k)continue;
var st=walkFiber(el[k],0);if(!st)continue;
if(st.standings){standings=st.standings;break}
}

if(!standings)return null;
console.log('[GQ-SWITCH] Standings:',JSON.stringify(standings));

var richest=null,maxGold=0;
for(var name in standings){
var g=standings[name].gold||standings[name].score||0;
if(g>maxGold){maxGold=g;richest=name}
}

if(richest){
var players=Object.keys(standings);
var idx=players.indexOf(richest);
if(idx>=0){
var rigVal=(idx+0.5)/players.length;
window.gqRigRandom(rigVal);
console.log('[GQ-SWITCH] Rigged to steal from:'+richest+' (gold:'+maxGold+') idx='+idx+'/'+players.length+' rig='+rigVal.toFixed(3));
}
}
return richest;
};

// ====== 宝箱结果 rig (设random=0.001得最高奖励 / 0.999得最低) ======
window.gqRigChest=function(quality){
// quality: 'best'(0.001) / 'worst'(0.999) / 具体数值
if(quality==='best'||quality===undefined)window.gqRigRandom(0.001);
else if(quality==='worst')window.gqRigRandom(0.999);
else window.gqRigRandom(quality||0.001);
};

// ====== 持续监控循环 (自动答题+选最差宝箱) ======
window.gqStartAuto=function(options){
var o=options||{};
var chestStrategy=o.chestStrategy||'worst'; // 默认选最差保金币<10000
var lastQ='';

window.__gqLoop=setInterval(function(){
try{
var s=findState();
if(!s)return;

var qt=s.question&&(s.question.question||s.question.text);

// 自动答题
if(qt&&s.question.correctAnswers&&qt!==lastQ){
var ca=Array.isArray(s.question.correctAnswers)?s.question.correctAnswers:[s.question.correctAnswers];
document.querySelectorAll('[class*="answerContainer"]').forEach(function(c){
var t=(c.textContent||'').trim();
if(ca.some(function(a){return(a||'').toString().trim()===t})&&c.offsetHeight>0){
c.click();lastQ=qt;console.log('[GQ-AUTO] ANSWERED:'+t);
}
});
}

// 宝箱选择
if(s.stage==='prize'&&s.choices&&s.choices.length>=2){
window.gqPickChest(chestStrategy);
// 选完后2秒点Next
setTimeout(function(){
document.querySelectorAll('button,[role=button]').forEach(function(b){
if((b.textContent||'').match(/next|continue|ok/i))b.click();
});
},2000);
}

// Feedback -> Next
if(s.stage==='feedback'){
document.querySelectorAll('button,[role=button]').forEach(function(b){
if((b.textContent||'').match(/next|continue|ok|done/i))b.click();
});
}
}catch(e){}
},o.interval||600);
};

window.gqStopAuto=function(){
clearInterval(window.__gqLoop);
};

// 输出模块已加载
console.log('[GQ-HACK] Gold Quest Chest Hack Module loaded.');
console.log('[GQ-HACK] APIs: gqGetChestInfo(), gqPickChest(strategy), gqRigChest(quality), gqManipulateSwitch(), gqStartAuto({chestStrategy}), gqStopAuto()');
})()`;

module.exports = { GOLD_QUEST_CHEST_HACK };
