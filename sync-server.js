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

// 🔧 Configuratie voor correcte IP detectie
app.set('trust proxy', true);

// 🧠 Centrale state opslag
let centralState = {
  riders: [],
  leaderboard: [],
  lastUpdated: new Date().toISOString()
};

// 📊 Connected clients tracking
let connectedClients = {};

// 🔍 Functie om alle lokale IP-adressen te vinden
function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  
  Object.keys(interfaces).forEach((interfaceName) => {
    interfaces[interfaceName].forEach((interface) => {
      if (interface.family === 'IPv4' && !interface.internal) {
        ips.push({
          name: interfaceName,
          ip: interface.address,
          isHotspot: interface.address.startsWith('192.168.137') || 
                     interface.address.startsWith('192.168.43') || 
                     interface.address.startsWith('10.0.0')
        });
      }
    });
  });
  
  return ips;
}

// 🎯 Serve static files
app.use(express.static(path.join(__dirname)));

// 🏠 Basic routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/leaderboard.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'leaderboard.html'));
});

// 🔍 Debug endpoint - toon verbonden clients
app.get('/clients', (req, res) => {
  res.json({
    totalClients: Object.keys(connectedClients).length,
    clients: connectedClients,
    serverIPs: getLocalIPs()
  });
});

// 💉 Health check endpoint
app.get('/health', (req, res) => {
  const localIPs = getLocalIPs();
  res.json({
    status: 'OK',
    clients: io.engine.clientsCount,
    lastUpdated: centralState.lastUpdated,
    ridersCount: centralState.riders.length,
    leaderboardCount: centralState.leaderboard.length,
    connectedClients: Object.keys(connectedClients).length,
    availableAt: localIPs.map(ip => `http://${ip.ip}:${PORT}`),
    serverIPs: localIPs
  });
});

// 🔄 Socket.IO connection handling
io.on('connection', (socket) => {
  // 🌐 Get client IP address (clean up IPv6 prefix if present)
  const ipRaw = socket.handshake.headers['x-forwarded-for'] || 
                socket.handshake.headers['x-real-ip'] || 
                socket.handshake.address;
  const clientIP = ipRaw.startsWith('::ffff:') ? ipRaw.substring(7) : ipRaw;
  
  // 📊 Initialize client tracking
  connectedClients[socket.id] = {
    ip: clientIP,
    name: 'Unknown Device',
    screen: 'Unknown Page',
    connectedAt: new Date().toISOString(),
    userAgent: socket.handshake.headers['user-agent'] || 'Unknown'
  };
  
  console.log(`✅ 🔗 Nieuwe client verbonden:`);
  console.log(`   📱 Socket ID: ${socket.id}`);
  console.log(`   🌐 IP Address: ${clientIP}`);
  console.log(`   🕐 Connected at: ${new Date().toLocaleTimeString()}`);
  
  // 🆕 Client registration from sync-client.js
  socket.on('registerClient', (data) => {
    connectedClients[socket.id] = {
      ...connectedClients[socket.id],
      name: data.name || 'Unknown Device',
      screen: data.screen || 'Unknown Page',
      browser: data.browser || 'Unknown Browser'
    };
    
    console.log(`🆕 📋 Client geregistreerd:`);
    console.log(`   📱 Device: ${connectedClients[socket.id].name}`);
    console.log(`   📄 Pagina: ${connectedClients[socket.id].screen}`);
    console.log(`   🌐 IP: ${connectedClients[socket.id].ip}`);
    console.log(`   🔗 Socket: ${socket.id}`);
  });
  
  // 🔄 Stuur huidige state naar nieuwe clients
  socket.emit('syncFullState', centralState);
  
  // 👤 Add/Update Rider
  socket.on('addRider', (data) => {
    const clientName = connectedClients[socket.id]?.name || 'Unknown';
    console.log(`👤 Rider toegevoegd door ${clientName}:`, data.name);
    
    // Update centrale state
    const existingIndex = centralState.riders.findIndex(r => r.name === data.name);
    if (existingIndex >= 0) {
      centralState.riders[existingIndex] = data;
    } else {
      centralState.riders.push(data);
    }
    centralState.lastUpdated = new Date().toISOString();
    
    // Broadcast naar alle clients
    io.emit('addRider', data);
  });

  // 🏆 Update Leaderboard
  socket.on('updateLeaderboard', (data) => {
    const clientName = connectedClients[socket.id]?.name || 'Unknown';
    console.log(`🏆 Leaderboard update door ${clientName}`);
    
    // Update centrale state
    centralState.leaderboard = data;
    centralState.lastUpdated = new Date().toISOString();
    
    // Broadcast naar alle clients
    io.emit('updateLeaderboard', data);
  });

  // ⏱️ Start Timer
  socket.on('startTimer', (data) => {
    const clientName = connectedClients[socket.id]?.name || 'Unknown';
    console.log(`⏱️ Timer gestart door ${clientName} voor:`, data.name);
    io.emit('startTimer', data);
  });

  // ⏹️ Stop Timer
  socket.on('stopTimer', (data) => {
    const clientName = connectedClients[socket.id]?.name || 'Unknown';
    console.log(`⏹️ Timer gestopt door ${clientName} voor:`, data.name, 'Tijd:', data.time);
    
    // Update rider in centrale state
    const riderIndex = centralState.riders.findIndex(r => r.name === data.name);
    if (riderIndex >= 0) {
      centralState.riders[riderIndex] = {...centralState.riders[riderIndex], ...data};
    }
    centralState.lastUpdated = new Date().toISOString();
    
    io.emit('stopTimer', data);
  });

  // ✏️ Edit Rider
  socket.on('editRider', (data) => {
    const clientName = connectedClients[socket.id]?.name || 'Unknown';
    console.log(`✏️ Rider bewerkt door ${clientName}:`, data.name);
    
    // Update centrale state
    const riderIndex = centralState.riders.findIndex(r => r.name === data.originalName);
    if (riderIndex >= 0) {
      centralState.riders[riderIndex] = {...centralState.riders[riderIndex], ...data};
    }
    centralState.lastUpdated = new Date().toISOString();
    
    io.emit('editRider', data);
  });

  // 🗑️ Delete Rider
  socket.on('deleteRider', (data) => {
    const clientName = connectedClients[socket.id]?.name || 'Unknown';
    console.log(`🗑️ Rider verwijderd door ${clientName}:`, data.name);
    
    // Update centrale state
    centralState.riders = centralState.riders.filter(r => r.name !== data.name);
    centralState.leaderboard = centralState.leaderboard.filter(r => r.name !== data.name);
    centralState.lastUpdated = new Date().toISOString();
    
    io.emit('deleteRider', data);
  });

  // 📋 Request State
  socket.on('requestState', () => {
    const clientName = connectedClients[socket.id]?.name || 'Unknown';
    console.log(`📋 State opgevraagd door ${clientName} (${socket.id})`);
    socket.emit('syncFullState', centralState);
  });

  // 💓 Heartbeat
  socket.on('ping', () => {
    socket.emit('pong');
  });

  // ❌ Disconnect
  socket.on('disconnect', () => {
    const clientInfo = connectedClients[socket.id];
    if (clientInfo) {
      console.log(`❌ 🔗 Client ontkoppeld:`);
      console.log(`   📱 Device: ${clientInfo.name}`);
      console.log(`   🌐 IP: ${clientInfo.ip}`);
      console.log(`   📄 Was op: ${clientInfo.screen}`);
      console.log(`   🕐 Disconnected at: ${new Date().toLocaleTimeString()}`);
      delete connectedClients[socket.id];
    } else {
      console.log(`❌ Client ontkoppeld: ${socket.id}`);
    }
  });
});

// 🆕 API endpoint voor state backup
app.get('/api/state', (req, res) => {
  res.json(centralState);
});

// 🆕 API endpoint voor debug info
app.get('/api/debug', (req, res) => {
  res.json({
    server: {
      port: PORT,
      uptime: process.uptime(),
      nodeVersion: process.version,
      platform: process.platform
    },
    network: {
      interfaces: getLocalIPs(),
      clients: connectedClients
    },
    state: centralState,
    stats: {
      totalConnections: Object.keys(connectedClients).length,
      ridersCount: centralState.riders.length,
      leaderboardCount: centralState.leaderboard.length
    }
  });
});

const PORT = process.env.PORT || 3000;

// 🚀 Start server op ALLE interfaces (0.0.0.0) - dit is cruciaal!
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🐂 =====================================================`);
  console.log(`🚀 GRNDbrekers Bull Riding Server ACTIEF op poort ${PORT}`);
  console.log(`🐂 =====================================================`);
  console.log(`🏠 Lokaal toegankelijk op: http://localhost:${PORT}`);
  console.log(``);
  
  // 🔍 Toon alle beschikbare IP-adressen
  const localIPs = getLocalIPs();
  console.log(`📱 Toegankelijk via deze IP-adressen:`);
  
  localIPs.forEach(ip => {
    if (ip.isHotspot) {
      console.log(`   🔥 ⭐ HOTSPOT IP: http://${ip.ip}:${PORT} ⭐`);
      console.log(`   📶 Interface: ${ip.name}`);
    } else {
      console.log(`   📶 ${ip.name}: http://${ip.ip}:${PORT}`);
    }
  });
  
  console.log(``);
  console.log(`💡 Test URL's op je telefoon:`);
  localIPs.forEach(ip => {
    if (ip.isHotspot) {
      console.log(`   🏠 Hoofdpagina: http://${ip.ip}:${PORT}`);
      console.log(`   🏆 Leaderboard: http://${ip.ip}:${PORT}/leaderboard.html`);
      console.log(`   🔍 Health Check: http://${ip.ip}:${PORT}/health`);
      console.log(`   👥 Clients Debug: http://${ip.ip}:${PORT}/clients`);
    }
  });
  
  console.log(``);
  console.log(`🔧 Debug commando's:`);
  console.log(`   curl http://localhost:${PORT}/health`);
  console.log(`   curl http://localhost:${PORT}/clients`);
  console.log(`🐂 =====================================================`);
});

// 🛡️ Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Server wordt afgesloten...');
  server.close(() => {
    console.log('✅ Server afgesloten');
    process.exit(0);
  });
});

// 🚨 Error handling
process.on('uncaughtException', (err) => {
  console.error('🚨 Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
});
