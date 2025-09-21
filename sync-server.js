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

// AUTHORITATIVE CENTRAL STATE - Single source of truth
let centralState = {
  riders: [],
  leaderboard: [],
  lastUpdated: null,
  createdAt: new Date().toISOString()
};

// Verbonden clients tracking
let connectedClients = new Map();

// Trust proxy voor correcte IP detectie
app.set('trust proxy', true);

// CSP uitgeschakeld voor development
app.use((req, res, next) => {
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
      lastUpdated: centralState.lastUpdated,
      createdAt: centralState.createdAt
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
    centralState: centralState
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

// Helper: Update central state and broadcast
function updateCentralState(newState, sourceSocketId) {
  const oldState = JSON.parse(JSON.stringify(centralState));
  
  // Update central state
  if (newState.riders !== undefined) {
    centralState.riders = newState.riders;
  }
  if (newState.leaderboard !== undefined) {
    centralState.leaderboard = newState.leaderboard;
  }
  
  centralState.lastUpdated = new Date().toISOString();
  
  console.log(`📊 Central state updated by ${sourceSocketId}:`);
  console.log(`   Riders: ${centralState.riders.length}`);
  console.log(`   Leaderboard: ${centralState.leaderboard.length}`);
  
  return oldState;
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
  console.log(`📊 Huidige centrale state: ${centralState.riders.length} riders, ${centralState.leaderboard.length} leaderboard`);

  // Handle request for server state
  socket.on('getServerState', () => {
    console.log(`📤 Sending authoritative server state to ${socket.id}`);
    socket.emit('syncData', {
      type: 'serverState',
      riders: centralState.riders,
      leaderboard: centralState.leaderboard,
      lastUpdated: centralState.lastUpdated
    });
  });

  // Handle sync data from clients
  socket.on('syncData', (data) => {
    console.log(`📥 Sync data received from ${socket.id}:`, data.type);
    
    try {
      if (data.type === 'ridersUpdate') {
        updateCentralState({ riders: data.riders }, socket.id);
        
        // Broadcast to all OTHER clients
        socket.broadcast.emit('syncData', {
          type: 'ridersUpdate',
          riders: centralState.riders,
          source: socket.id
        });
        
      } else if (data.type === 'leaderboardUpdate') {
        updateCentralState({ leaderboard: data.leaderboard }, socket.id);
        
        // Broadcast to all OTHER clients
        socket.broadcast.emit('syncData', {
          type: 'leaderboardUpdate',
          leaderboard: centralState.leaderboard,
          source: socket.id
        });
        
      } else if (data.type === 'fullStateSync') {
        updateCentralState({
          riders: data.riders || [],
          leaderboard: data.leaderboard || []
        }, socket.id);
        
        // Broadcast to all OTHER clients
        socket.broadcast.emit('syncData', {
          type: 'fullStateSync',
          riders: centralState.riders,
          leaderboard: centralState.leaderboard,
          source: socket.id
        });
        
      } else {
        console.warn(`⚠️ Unknown sync data type: ${data.type}`);
      }
      
    } catch (error) {
      console.error(`❌ Error processing sync data from ${socket.id}:`, error);
    }
  });

  // Handle disconnect
  socket.on('disconnect', (reason) => {
    console.log(`❌ Client disconnected: ${socket.id} (${reason})`);
    connectedClients.delete(socket.id);
    
    console.log(`📊 Remaining clients: ${connectedClients.size}`);
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

🏛️ AUTHORITATIVE DATA SERVER
   - Single source of truth for all data
   - All clients sync to same central state
   - Real-time synchronization enabled

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
   4. Beide devices werken nu op DEZELFDE data!

🐂 =====================================================
`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Server shutdown signal ontvangen');
  console.log(`📊 Final state: ${centralState.riders.length} riders, ${centralState.leaderboard.length} leaderboard entries`);
  server.close(() => {
    console.log('✅ Server gestopt');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n🛑 Server stop via Ctrl+C');
  console.log(`📊 Final state: ${centralState.riders.length} riders, ${centralState.leaderboard.length} leaderboard entries`);
  server.close(() => {
    console.log('✅ Server gestopt');
    process.exit(0);
  });
});
