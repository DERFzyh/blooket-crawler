const io=require('socket.io-client');
const s=io('http://localhost:3458');
let lastQ='';
s.on('connect',()=>{
  s.on('gameState',st=>{
    if(st.questionText&&st.questionText!==lastQ){
      lastQ=st.questionText;
      console.log('\n📝 题目:',st.questionText);
      console.log('✅ 答案:',st.correctAnswers);
      if(st.gold!==undefined) console.log('💰 金币:',st.gold);
    }
    if(st.stage&&st.stage!=='none'&&!st.questionText){
      console.log('🎮 阶段:',st.stage,'| 路径:',st.pathname);
    }
  });
  s.on('log',m=>{if(m.includes('答题')||m.includes('作弊')||m.includes('题目'))console.log('📋',m)});
  s.on('status',st=>{if(st.mode==='playing')console.log('▶️ 游戏中!')});
  
  // Start auto-answer
  s.emit('startAutoAnswer');
  
  // Poll state every 1.5s for 40 checks (60 seconds)
  let tick=0;
  setInterval(()=>{
    tick++;
    if(tick>40){console.log('\n⏰ 60秒监控结束');s.disconnect();process.exit(0)}
    s.emit('getState');
  },1500);
});
