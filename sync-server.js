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
  },
  transports: ['websocket', 'polling']
});

const PORT = process.env.PORT || 3000;

// 🎯 CENTRALE STATE MANAGEMENT
let appState = {
  riders: [],
  leaderboard: [],
  currentRider: null,
  timerActive: false,
  startTime: null,
  lastUpdated: Date.now()
};

// 👥 CLIENT TRACKING
const connectedClients = {};

// 🌐 MIDDLEWARE
app.set('trust proxy', true);
app.use(express.static('.'));
app.use(express.json());

// 📡 SOCKET.IO EVENT HANDLERS
io.on('connection', (socket) => {
  const clientIP = socket.handshake.headers['x-forwarded-for'] || 
                   socket.handshake.address || 
                   socket.request.connection.remoteAddress || 
                   'unknown';

  console.log(`\n🔗 Nieuwe client verbonden: ${socket.id}`);
  console.log(`🌐 IP: ${clientIP.replace('::ffff:', '')}`);

  // 📝 CLIENT REGISTRATIE
  socket.on('registerClient', (clientData) => {
    const deviceInfo = parseUserAgent(clientData.name || 'Unknown Device');
    connectedClients[socket.id] = {
      id: socket.id,
      ip: clientIP.replace('::ffff:', ''),
      device: deviceInfo,
      screen: clientData.screen || 'unknown',
      connectedAt: new Date().toISOString(),
      lastSeen: new Date().toISOString()
    };

    console.log(`🆕 Client geregistreerd:`);
    console.log(`   📱 Device: ${deviceInfo}`);
    console.log(`   📄 Screen: ${clientData.screen}`);
    console.log(`   🌐 IP: ${clientIP.replace('::ffff:', '')}`);

    // 🔄 STUUR HUIDIGE STATE NAAR NIEUWE CLIENT
    socket.emit('syncData', {
      type: 'fullState',
      data: appState,
      timestamp: Date.now()
    });
  });

  // 📊 STATE SYNCHRONISATIE
  socket.on('syncData', (data) => {
    console.log(`📥 Data ontvangen van ${socket.id}:`, data.type);
    
    // Update centrale state
    updateAppState(data);
    
    // Broadcast naar alle andere clients
    socket.broadcast.emit('syncData', {
      ...data,
      timestamp: Date.now(),
      fromClient: socket.id
    });
    
    // Update last seen
    if (connectedClients[socket.id]) {
      connectedClients[socket.id].lastSeen = new Date().toISOString();
    }
  });

  // 🔍 STATE OPVRAGEN
  socket.on('getState', () => {
    console.log(`📋 State opgevraagd door client: ${socket.id}`);
    socket.emit('syncData', {
      type: 'fullState',
      data: appState,
      timestamp: Date.now()
    });
  });

  // 💔 DISCONNECTION
  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
    if (connectedClients[socket.id]) {
      console.log(`   📱 Was: ${connectedClients[socket.id].device} op ${connectedClients[socket.id].screen}`);
      delete connectedClients[socket.id];
    }
  });
});

// 🔄 STATE UPDATE FUNCTIE
function updateAppState(data) {
  try {
    switch (data.type) {
      case 'riderAdded':
        if (data.rider && !appState.riders.find(r => r.id === data.rider.id)) {
          appState.riders.push(data.rider);
        }
        break;
      
      case 'riderUpdated':
        if (data.rider) {
          const index = appState.riders.findIndex(r => r.id === data.rider.id);
          if (index !== -1) {
            appState.riders[index] = { ...appState.riders[index], ...data.rider };
          }
        }
        break;
      
      case 'leaderboardUpdated':
        if (Array.isArray(data.leaderboard)) {
          appState.leaderboard = data.leaderboard;
        }
        break;
      
      case 'timerStart':
        appState.timerActive = true;
        appState.startTime = data.startTime;
        appState.currentRider = data.rider;
        break;
      
      case 'timerStop':
        appState.timerActive = false;
        appState.currentRider = null;
        break;
      
      case 'fullState':
        if (data.data) {
          appState = { ...appState, ...data.data };
        }
        break;
    }
    
    appState.lastUpdated = Date.now();
  } catch (error) {
    console.error('❌ Fout bij state update:', error);
  }
}

// 🔍 USER AGENT PARSER
function parseUserAgent(userAgent) {
  if (userAgent.includes('iPhone')) return 'iPhone';
  if (userAgent.includes('iPad')) return 'iPad';
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('Windows')) return 'Windows PC';
  if (userAgent.includes('Macintosh')) return 'Mac';
  if (userAgent.includes('Linux')) return 'Linux';
  return 'Unknown Device';
}

// 🌐 API ENDPOINTS
app.get('/health', (req, res) => {
  res.json({
    status: 'running',
    uptime: process.uptime(),
    clients: Object.keys(connectedClients).length,
    lastStateUpdate: appState.lastUpdated,
    timestamp: Date.now()
  });
});

app.get('/clients', (req, res) => {
  res.json({
    count: Object.keys(connectedClients).length,
    clients: Object.values(connectedClients)
  });
});

app.get('/api/state', (req, res) => {
  res.json({
    state: appState,
    clients: Object.keys(connectedClients).length,
    timestamp: Date.now()
  });
});

app.get('/api/debug', (req, res) => {
  res.json({
    server: {
      port: PORT,
      uptime: process.uptime(),
      platform: os.platform(),
      nodeVersion: process.version
    },
    network: getNetworkInterfaces(),
    state: appState,
    clients: connectedClients,
    timestamp: Date.now()
  });
});

// 🌐 NETWORK INTERFACE HELPER
function getNetworkInterfaces() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  
  for (const name in interfaces) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push({
          name: name,
          address: iface.address,
          isHotspot: iface.address.startsWith('192.168.137.') || iface.address.startsWith('192.168.43.')
        });
      }
    }
  }
  
  return addresses;
}

// 🚀 SERVER START
server.listen(PORT, '0.0.0.0', () => {
  console.log('\n🐂 =====================================================');
  console.log('🔥 GRNDbrekers Bull Riding Server GESTART!');
  console.log('🐂 =====================================================');
  
  console.log(`\n📍 Lokaal: http://localhost:${PORT}`);
  
  const interfaces = getNetworkInterfaces();
  const hotspotInterface = interfaces.find(iface => iface.isHotspot);
  
  if (hotspotInterface) {
    console.log(`\n🔥 ⭐ HOTSPOT IP: http://${hotspotInterface.address}:${PORT} ⭐`);
    console.log(`📱 Test URL's op je telefoon:`);
    console.log(`   🏠 Hoofdpagina: http://${hotspotInterface.address}:${PORT}`);
    console.log(`   📊 Leaderboard: http://${hotspotInterface.address}:${PORT}/leaderboard.html`);
  }
  
  if (interfaces.length > 0) {
    console.log(`\n🌐 Alle beschikbare IP's:`);
    interfaces.forEach(iface => {
      const indicator = iface.isHotspot ? '⭐' : '📍';
      console.log(`   ${indicator} ${iface.name}: http://${iface.address}:${PORT}`);
    });
  }
  
  console.log(`\n🔧 Debug endpoints:`);
  console.log(`   📊 Health: http://localhost:${PORT}/health`);
  console.log(`   👥 Clients: http://localhost:${PORT}/clients`);
  console.log(`   🐛 Debug: http://localhost:${PORT}/api/debug`);
  
  console.log('\n✅ Server gereed voor verbindingen!');
  console.log('🐂 =====================================================\n');
});
