const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// In-memory storage die localStorage structuur nabootst
let sharedStorage = {};

// API endpoints die localStorage interface spiegelen
app.get('/sync/:key', (req, res) => {
  const key = req.params.key;
  res.json({ key, value: sharedStorage[key] || null });
});

app.post('/sync/:key', (req, res) => {
  const key = req.params.key;
  const value = req.body.value;
  
  sharedStorage[key] = value;
  
  // Broadcast naar alle verbonden clients behalve sender
  req.app.get('io').emit('storageUpdate', { key, value });
  
  res.json({ success: true });
});

// WebSocket verbindingen
io.on('connection', (socket) => {
  console.log('Device verbonden:', socket.id);
  
  // Stuur huidige data naar nieuwe client
  socket.emit('initialSync', sharedStorage);
  
  socket.on('disconnect', () => {
    console.log('Device losgekoppeld:', socket.id);
  });
});

app.set('io', io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`GRNDbrekers Bull Server draait op http://localhost:${PORT}`);
  console.log(`Mobiele devices: http://192.168.4.1:${PORT}`);
});
