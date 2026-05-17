const io=require('socket.io-client');
const s=io('http://localhost:3458');
const PIN='8487995';
s.on('connect',()=>{
  let lastQ='',lastGold=undefined;
  s.on('gameState',st=>{
    if(st.questionText&&st.questionText!==lastQ){
      lastQ=st.questionText;
      console.log('\n📝 题目:',st.questionText);
      console.log('✅ 答案:',st.correctAnswers);
    }
    if(st.gold!==undefined&&st.gold!==lastGold){lastGold=st.gold;console.log('💰 金币:',st.gold)}
    if(st.stage&&!['none','?'].includes(st.stage)&&!st.questionText)console.log('🎮',st.stage,'|',st.pathname);
  });
  s.on('log',m=>{if(m.includes('答题')||m.includes('✅')||m.includes('PIN')||m.includes('作弊'))console.log('📋',m)});
  s.on('status',st=>{if(st.mode==='playing')console.log('▶️ 游戏中!')});

  s.emit('joinGame',{pin:PIN,name:'Bot'});
  setTimeout(()=>s.emit('startAutoAnswer'),13000);

  let t=0;
  setInterval(()=>{t++;s.emit('getState');if(t>=35){console.log('\n⏰ 50秒结束');s.disconnect();process.exit(0)}},1500);
});
