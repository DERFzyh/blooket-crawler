const io=require('socket.io-client');
const s=io('http://localhost:3458');
const PIN='8224222';
let lastQ='';
s.on('connect',()=>{
  s.on('gameState',st=>{
    if(st.questionText&&st.questionText!==lastQ){
      lastQ=st.questionText;
      console.log('\n📝 题目:',st.questionText);
      console.log('✅ 答案:',st.correctAnswers);
      if(st.gold!==undefined) console.log('💰 金币:',st.gold);
    }
    if(st.stage&&!['none','?'].includes(st.stage)&&!st.questionText){
      console.log('🎮 阶段:',st.stage,'|',st.pathname);
    }
  });
  s.on('log',m=>{if(m.includes('答题')||m.includes('作弊')||m.includes('题目')||m.includes('✅ 已'))console.log('📋',m)});
  s.on('status',st=>{if(st.mode==='playing')console.log('▶️ 游戏中!')});
  
  // Join first
  console.log('加入游戏',PIN,'...');
  s.emit('joinGame',{pin:PIN,name:'Bot'});
  
  // Start auto-answer after join completes
  setTimeout(()=>{s.emit('startAutoAnswer')},12000);
  
  // Poll state
  let t=0;
  setInterval(()=>{
    t++;s.emit('getState');
    if(t>=40){console.log('\n监控结束');s.disconnect();process.exit(0)}
  },1500);
});
