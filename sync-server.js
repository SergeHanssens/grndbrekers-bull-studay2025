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

// Centrale state opslag
let centralState = {
  riders: [],
  leaderboard: [],
  lastUpdated: null
};

// Verbonden clients tracking
let connectedClients = new Map();

// Trust proxy voor correcte IP detectie
app.set('trust proxy', true);

// CSP configuratie - GEEN CSP RESTRICTIONS voor development
app.use((req, res, next) => {
  // Tijdelijk alle CSP uitschakelen voor debugging
  res.removeHeader('Content-Security-Policy');
  res.removeHeader('X-Content-Security-Policy');
  res.removeHeader('X-WebKit-CSP');
  next();
});

// Static files serveren
app.use(express.static(path.join(__dirname, '.')));
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/leaderboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'leaderboard.html'));
});

// Debug endpoints
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    connectedClients: connectedClients.size,
    centralState: {
      riders: centralState.riders.length,
      leaderboard: centralState.leaderboard.length,
      lastUpdated: centralState.lastUpdated
    }
  });
});

app.get('/clients', (req, res) => {
  const clients = Array.from(connectedClients.values()).map(client => ({
    id: client.id,
    ip: client.ip,
    userAgent: client.userAgent,
    connected: client.connected,
    connectedAt: client.connectedAt
  }));
  res.json(clients);
});

app.get('/api/debug', (req, res) => {
  res.json({
    server: {
      status: 'running',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      platform: process.platform
    },
    network: getNetworkInfo(),
    clients: connectedClients.size,
    state: centralState
  });
});

// Network info helper
function getNetworkInfo() {
  const interfaces = os.networkInterfaces();
  const info = {};
  
  Object.keys(interfaces).forEach(name => {
    interfaces[name].forEach(iface => {
      if (iface.family === 'IPv4' && !iface.internal) {
        if (!info[name]) info[name] = [];
        info[name].push(iface.address);
      }
    });
  });
  
  return info;
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  const clientIP = socket.handshake.address || socket.request.connection.remoteAddress;
  const userAgent = socket.handshake.headers['user-agent'] || 'Unknown';
  
  // Client info opslaan
  connectedClients.set(socket.id, {
    id: socket.id,
    ip: clientIP,
    userAgent: userAgent,
    connected: true,
    connectedAt: new Date().toISOString()
  });

  console.log(`🔗 Nieuwe client verbonden: ${socket.id}`);
  console.log(`🌐 IP: ${clientIP}`);
  
  // CONSISTENT EVENT: Verstuur huidige state naar nieuwe client via 'syncData'
  if (centralState.riders.length > 0 || centralState.leaderboard.length > 0) {
    console.log(`📤 Verstuur state naar nieuwe client: ${centralState.riders.length} riders, ${centralState.leaderboard.length} leaderboard entries`);
    socket.emit('syncData', {
      type: 'fullStateSync',
      riders: centralState.riders,
      leaderboard: centralState.leaderboard,
      lastUpdated: centralState.lastUpdated
    });
  }

  // CONSISTENT EVENT: Handle riders update via 'syncData'
  socket.on('syncData', (data) => {
    console.log(`📥 Sync data ontvangen van ${socket.id}:`, data.type);
    
    if (data.type === 'ridersUpdate') {
      centralState.riders = data.riders;
      centralState.lastUpdated = new Date().toISOString();
      
      // Broadcast naar alle andere clients
      socket.broadcast.emit('syncData', {
        type: 'ridersUpdate',
        riders: data.riders,
        source: socket.id
      });
    }
    
    if (data.type === 'leaderboardUpdate') {
      centralState.leaderboard = data.leaderboard;
      centralState.lastUpdated = new Date().toISOString();
      
      // Broadcast naar alle andere clients
      socket.broadcast.emit('syncData', {
        type: 'leaderboardUpdate',
        leaderboard: data.leaderboard,
        source: socket.id
      });
    }
    
    if (data.type === 'fullStateSync') {
      centralState.riders = data.riders || [];
      centralState.leaderboard = data.leaderboard || [];
      centralState.lastUpdated = new Date().toISOString();
      
      // Broadcast naar alle andere clients
      socket.broadcast.emit('syncData', {
        type: 'fullStateSync',
        riders: centralState.riders,
        leaderboard: centralState.leaderboard,
        source: socket.id
      });
    }
  });

  // Handle disconnect
  socket.on('disconnect', (reason) => {
    console.log(`❌ Client disconnected: ${socket.id} (${reason})`);
    connectedClients.delete(socket.id);
  });

  // Handle errors
  socket.on('error', (error) => {
    console.log(`⚠️ Socket error voor ${socket.id}:`, error);
  });
});

// Server opstarten
const PORT = process.env.PORT || 3000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`
🐂 =====================================================
🚀 GRNDbrekers Bull Riding Server Started!
🐂 =====================================================

🌐 Server running on port: ${PORT}
📡 Accessible on all network interfaces

🔥 Hotspot URLs (meest waarschijnlijk):
   http://192.168.137.1:${PORT}
   http://192.168.43.1:${PORT}

🖥️ Local URLs:
   http://localhost:${PORT}
   http://127.0.0.1:${PORT}

📱 Test URLs voor andere devices:`);

  // Toon alle beschikbare IP adressen
  const interfaces = os.networkInterfaces();
  Object.keys(interfaces).forEach(name => {
    interfaces[name].forEach(iface => {
      if (iface.family === 'IPv4' && !iface.internal) {
        const isHotspot = iface.address.startsWith('192.168.137') || 
                         iface.address.startsWith('192.168.43') ||
                         name.toLowerCase().includes('hotspot');
        
        if (isHotspot) {
          console.log(`   🔥 (HOTSPOT) ${name}: http://${iface.address}:${PORT}`);
        } else {
          console.log(`   📍 ${name}: http://${iface.address}:${PORT}`);
        }
      }
    });
  });

  console.log(`
📊 Debug endpoints:
   http://192.168.137.1:${PORT}/health
   http://192.168.137.1:${PORT}/clients  
   http://192.168.137.1:${PORT}/api/debug

💡 Voor mobiele toegang:
   1. Zorg dat Windows firewall geconfigureerd is
   2. Verbind telefoon met jouw hotspot
   3. Ga naar hotspot URL in browser

🐂 =====================================================
`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Server shutdown signal ontvangen');
  server.close(() => {
    console.log('✅ Server gestopt');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n🛑 Server stop via Ctrl+C');
  server.close(() => {
    console.log('✅ Server gestopt');
    process.exit(0);
  });
});
