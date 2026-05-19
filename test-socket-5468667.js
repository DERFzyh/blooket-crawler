// Test via Socket.io to the running server
const io=require('socket.io-client');
const socket=io('http://localhost:3458');

socket.on('connect',()=>console.log('Connected'));
socket.on('log',msg=>console.log('📋',msg));
socket.on('status',s=>console.log('📊',s.mode,s.gamePin,s.gameMode,s.autoAnswer));
socket.on('gameState',s=>{
  if(s.questionText) console.log(`❓ ${s.questionText} ✅ ${(s.correctAnswers||[]).join(',')} 💰${s.gold}`);
  else if(s.stage==='intro') console.log('🔑 intro (pw select)',(s.passwordOptions||[]).slice(0,3));
  else if(s.passwordOptions) console.log('🔓 guessing',s.password,s.correctPassword);
  else console.log('📡',s.stage,s.gold,s.weight,s.crypto);
});

setTimeout(()=>{
  console.log('\n🏃 Joining game 5468667...');
  socket.emit('joinGame',{pin:'5468667',name:'UnitTest'});
},500);

setTimeout(()=>{
  socket.emit('screenshot');
},30000);

setTimeout(()=>{
  socket.emit('stop');
  console.log('\n⏹ Test done');
  process.exit(0);
},120000);
