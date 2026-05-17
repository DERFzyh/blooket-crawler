const io=require('socket.io-client');
const s=io('http://localhost:3458');
const PIN='1627236';
let lastQ='',lastGold=undefined,questionsSeen=0,answersClicked=0;
s.on('connect',()=>{
  s.on('gameState',st=>{
    if(st.questionText){
      if(st.questionText!==lastQ){questionsSeen++;lastQ=st.questionText}
      console.log('📝',st.questionText,'✅',st.correctAnswers,'💰',st.gold);
      if(st.gold!==lastGold){lastGold=st.gold;console.log('🪙 金币变化!',lastGold)}
    }
    if(st.stage&&!['none','?'].includes(st.stage)&&!st.questionText)console.log('🎮',st.stage);
  });
  s.on('log',m=>{if(m.includes('✅')||m.includes('PIN')||m.includes('作弊'))console.log('📋',m)});

  s.emit('joinGame',{pin:PIN,name:'Bot'});
  setTimeout(()=>s.emit('startAutoAnswer'),13000);

  let t=0;
  const iv=setInterval(()=>{
    t++;s.emit('getState');
    if(t>=40){console.log('\n📊 统计: 题目='+questionsSeen+' | 金币='+lastGold);s.disconnect();process.exit(0)}
  },1500);
});
