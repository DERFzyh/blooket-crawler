const io=require('socket.io-client');
const s=io('http://localhost:3458');
s.on('connect',()=>{
  s.on('log',m=>console.log(m));
  s.on('status',st=>console.log('MODE:',st.mode,'| 答题:',st.autoAnswer,'| PIN:',st.gamePin,'| 模式:',st.gameMode));
  s.on('gameState',st=>{
    const q=st.questionText?' Q:'+st.questionText.slice(0,40):'';
    const a=st.correctAnswers?' A:'+st.correctAnswers:'';
    console.log('GAME: stage='+st.stage+q+a);
  });
  s.on('cheatResult',d=>console.log('CHEAT',d.cheatType,'=',d.result));
  
  s.emit('joinGame',{pin:'6331767',name:'Bot'});
  setTimeout(()=>s.emit('startAutoAnswer'),10000);
  setTimeout(()=>{s.emit('getState');s.emit('screenshot')},15000);
  
  let t=0;
  setInterval(()=>{t++;s.emit('getState');if(t>=10){s.disconnect();process.exit(0)}},2000);
});
