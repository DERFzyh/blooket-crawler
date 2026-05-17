const io = require('socket.io-client');
const socket = io('http://localhost:3458');

socket.on('connect', () => {
  console.log('Connected to server!');
  
  // Listen for all events
  socket.on('log', (msg) => console.log('[LOG]', msg));
  socket.on('status', (s) => console.log('[STATUS]', s.mode, s.gamePin || '', s.gameMode || ''));
  socket.on('gameState', (s) => console.log('[GAME]', JSON.stringify(s).slice(0, 200)));
  
  // Step 1: Login
  console.log('\n=== Login ===');
  socket.emit('login', { 
    email: 'fred11zyh@outlook.com', 
    password: 'ZYH11fred@blooket' 
  });
  
  setTimeout(() => {
    // Step 2: Host Fishing Frenzy
    console.log('\n=== Host Game ===');
    socket.emit('hostGame', { gameMode: 'fishing' });
  }, 10000);
  
  setTimeout(() => {
    // Step 3: Get state
    console.log('\n=== Get State ===');
    socket.emit('getState');
  }, 20000);
  
  setTimeout(() => {
    console.log('\n=== Done ===');
    socket.disconnect();
    process.exit(0);
  }, 25000);
});

socket.on('disconnect', () => console.log('Disconnected'));
