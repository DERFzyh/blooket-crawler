const io=require('socket.io-client');
const socket=io('http://localhost:3458');

socket.on('connect',()=>{
  console.log('Connected');
  console.log('Joining 3824128...');
  socket.emit('joinGame',{pin:'3824128',name:'GQ-HackTest'});
});

socket.on('status',s=>{
  console.log('[status]',s.mode,s.gameMode||'',s.gamePin||'');
  // Only exit if we were previously playing and now idle
  if(s.mode==='idle'&&!s.gamePin&&s.autoAnswer===false){
    // This is initial state, not exit
  }
});

socket.on('log',msg=>{console.log('[log]',msg)});

socket.on('gameState',state=>{
  if(state.questionText){
    console.log('[Q]',state.questionText,'A:',(state.correctAnswers||[]).join(','),'gold:',state.gold);
  }
  if(state.stage==='prize'){
    console.log('[PRIZE] gold:',state.gold,'choices:',state.choices);
    setTimeout(()=>{
      socket.emit('gqInjectChestHack');
      setTimeout(()=>socket.emit('gqGetChestInfo'),500);
    },1000);
  }
});

setTimeout(()=>{socket.emit('gqInjectChestHack')},8000);
setTimeout(()=>{setInterval(()=>{socket.emit('gqGetChestInfo')},5000)},12000);

socket.on('gqResult',r=>{
  console.log('[GQ]',r.action,':',JSON.stringify(r.result).slice(0,300));
});

socket.on('disconnect',()=>{console.log('Disconnected');process.exit(0)});
setTimeout(()=>{console.log('Timeout');process.exit(0)},120000);
