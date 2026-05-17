const io=require('socket.io-client');
const s=io('http://localhost:3458');
const PIN='8224222';
s.on('connect',()=>{
  s.on('log',m=>console.log(m));
  s.on('status',st=>console.log('MODE:',st.mode,'| 答题:',st.autoAnswer,'| PIN:',st.gamePin));
  s.on('gameState',st=>{
    const parts=['stage='+st.stage];
    if(st.questionText) parts.push('Q:'+st.questionText.slice(0,60));
    if(st.correctAnswers) parts.push('✓:'+st.correctAnswers);
    if(st.gold!==undefined) parts.push('💰:'+st.gold);
    console.log('GAME',parts.join(' '));
  });
  
  s.emit('joinGame',{pin:PIN,name:'Bot'});
  setTimeout(()=>{s.emit('startAutoAnswer');console.log('AA started')},12000);
  
  let t=0;
  setInterval(()=>{t++;s.emit('getState');if(t>=20){s.emit('screenshot');s.disconnect();process.exit(0)}},2000);
});
