const io=require('socket.io-client');
const s=io('http://localhost:3458');
s.on('connect',()=>{
  s.on('log',m=>console.log(m));
  s.on('status',st=>console.log('MODE:',st.mode,'| 答题:',st.autoAnswer));
  s.on('gameState',st=>{
    const parts=['stage='+st.stage];
    if(st.questionText) parts.push('Q:'+st.questionText.slice(0,50));
    if(st.correctAnswers) parts.push('✓:'+st.correctAnswers);
    if(st.gold!==undefined) parts.push('💰:'+st.gold);
    console.log('GAME',parts.join(' '));
  });
  
  // Start auto answer fresh
  s.emit('startAutoAnswer');
  
  let t=0;
  setInterval(()=>{
    t++;
    s.emit('getState');
    if(t%5===0) s.emit('screenshot');
    if(t>=15){s.disconnect();process.exit(0)}
  },2000);
});
