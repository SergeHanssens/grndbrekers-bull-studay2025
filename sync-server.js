const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const os = require('os');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// 🧠 Centrale state opslag
let centralState = {
  riders: [],
  leaderboard: [],
  lastUpdated: new Date().toISOString()
};

// 🔍 Functie om alle lokale IP-adressen te vinden
function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  
  Object.keys(interfaces).forEach((interfaceName) => {
    interfaces[interfaceName].forEach((interface) => {
      if (interface.family === 'IPv4' && !interface.internal) {
        ips.push({
          name: interfaceName,
          ip: interface.address
        });
      }
    });
  });
  
  return ips;
}

// Serve static files
app.use(express.static(path.join(__dirname)));

// Basic routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/leaderboard.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'leaderboard.html'));
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('🔗 Nieuwe client verbonden:', socket.id);
  
  // Stuur huidige state naar nieuwe clients
  socket.emit('syncFullState', centralState);
  
  // Event handlers met state persistence
  socket.on('addRider', (data) => {
    console.log('👤 Rider toegevoegd:', data.name);
    
    const existingIndex = centralState.riders.findIndex(r => r.name === data.name);
    if (existingIndex >= 0) {
      centralState.riders[existingIndex] = data;
    } else {
      centralState.riders.push(data);
    }
    centralState.lastUpdated = new Date().toISOString();
    
    io.emit('addRider', data);
  });

  socket.on('updateLeaderboard', (data) => {
    console.log('🏆 Leaderboard update ontvangen');
    centralState.leaderboard = data;
    centralState.lastUpdated = new Date().toISOString();
    io.emit('updateLeaderboard', data);
  });

  socket.on('startTimer', (data) => {
    console.log('⏱️ Timer gestart voor:', data.name);
    io.emit('startTimer', data);
  });

  socket.on('stopTimer', (data) => {
    console.log('⏹️ Timer gestopt voor:', data.name, 'Tijd:', data.time);
    
    const riderIndex = centralState.riders.findIndex(r => r.name === data.name);
    if (riderIndex >= 0) {
      centralState.riders[riderIndex] = {...centralState.riders[riderIndex], ...data};
    }
    centralState.lastUpdated = new Date().toISOString();
    
    io.emit('stopTimer', data);
  });

  socket.on('editRider', (data) => {
    console.log('✏️ Rider bewerkt:', data.name);
    
    const riderIndex = centralState.riders.findIndex(r => r.name === data.originalName);
    if (riderIndex >= 0) {
      centralState.riders[riderIndex] = {...centralState.riders[riderIndex], ...data};
    }
    centralState.lastUpdated = new Date().toISOString();
    
    io.emit('editRider', data);
  });

  socket.on('deleteRider', (data) => {
    console.log('🗑️ Rider verwijderd:', data.name);
    
    centralState.riders = centralState.riders.filter(r => r.name !== data.name);
    centralState.leaderboard = centralState.leaderboard.filter(r => r.name !== data.name);
    centralState.lastUpdated = new Date().toISOString();
    
    io.emit('deleteRider', data);
  });

  socket.on('requestState', () => {
    console.log('📋 State opgevraagd door client:', socket.id);
    socket.emit('syncFullState', centralState);
  });

  socket.on('ping', () => {
    socket.emit('pong');
  });

  socket.on('disconnect', () => {
    console.log('❌ Client ontkoppeld:', socket.id);
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  const localIPs = getLocalIPs();
  res.json({
    status: 'OK',
    clients: io.engine.clientsCount,
    lastUpdated: centralState.lastUpdated,
    ridersCount: centralState.riders.length,
    leaderboardCount: centralState.leaderboard.length,
    availableAt: localIPs.map(ip => `http://${ip.ip}:${PORT}`)
  });
});

// API endpoint voor state backup
app.get('/api/state', (req, res) => {
  res.json(centralState);
});

const PORT = process.env.PORT || 3000;

// 🚀 Start server op ALLE interfaces (0.0.0.0)
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 GRNDbrekers Bull Riding Server draait op poort ${PORT}`);
  console.log(`🏠 Lokaal toegankelijk op: http://localhost:${PORT}`);
  
  // 🔍 Toon alle beschikbare IP-adressen
  const localIPs = getLocalIPs();
  console.log(`📱 Toegankelijk via deze IP-adressen:`);
  
  localIPs.forEach(ip => {
    console.log(`   📶 ${ip.name}: http://${ip.ip}:${PORT}`);
    
    // Highlight waarschijnlijk hotspot IP
    if (ip.ip.startsWith('192.168.137') || ip.ip.startsWith('192.168.43') || ip.ip.startsWith('10.0.0')) {
      console.log(`   🔥 ⭐ HOTSPOT IP (gebruik deze): http://${ip.ip}:${PORT} ⭐`);
    }
  });
  
  console.log(`\n💡 Test op je telefoon met alle bovenstaande IP-adressen!`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Server wordt afgesloten...');
  server.close(() => {
    console.log('✅ Server afgesloten');
    process.exit(0);
  });
});
