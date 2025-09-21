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

// ENHANCED: Centralized broadcast function
function broadcastToAllClients(data, excludeSocketId = null) {
  const connectedSockets = Array.from(connectedClients.keys());
  let broadcastCount = 0;
  
  console.log(`📡 Broadcasting ${data.type} to ${connectedSockets.length} clients`);
  
  connectedSockets.forEach(socketId => {
    if (socketId !== excludeSocketId) {
      const socket = io.sockets.sockets.get(socketId);
      if (socket && socket.connected) {
        socket.emit('syncData', data);
        broadcastCount++;
        console.log(`   ✅ Sent to ${socketId} (${connectedClients.get(socketId)?.ip})`);
      } else {
        console.log(`   ⚠️ Socket ${socketId} not connected, removing from clients`);
        connectedClients.delete(socketId);
      }
    }
  });
  
  console.log(`📊 Broadcast complete: ${broadcastCount} clients updated`);
  return broadcastCount;
}

// ENHANCED: State update with guaranteed broadcast
function updateCentralStateAndBroadcast(newState, sourceSocketId, updateType) {
  console.log(`🔄 State update: ${updateType} from ${sourceSocketId}`);
  
  // Update central state
  let hasChanges = false;
  
  if (newState.riders !== undefined) {
    if (JSON.stringify(centralState.riders) !== JSON.stringify(newState.riders)) {
      centralState.riders = newState.riders;
      hasChanges = true;
      console.log(`   👥 Riders updated: ${centralState.riders.length} total`);
    }
  }
  
  if (newState.leaderboard !== undefined) {
    if (JSON.stringify(centralState.leaderboard) !== JSON.stringify(newState.leaderboard)) {
      centralState.leaderboard = newState.leaderboard;
      hasChanges = true;
      console.log(`   🏆 Leaderboard updated: ${centralState.leaderboard.length} entries`);
    }
  }
  
  if (hasChanges) {
    centralState.lastUpdated = new Date().toISOString();
    
    // GUARANTEED BROADCAST TO ALL CLIENTS
    const broadcastData = {
      type: updateType,
      riders: centralState.riders,
      leaderboard: centralState.leaderboard,
      lastUpdated: centralState.lastUpdated,
      source: sourceSocketId
    };
    
    // Broadcast to all clients INCLUDING the sender for confirmation
    broadcastToAllClients(broadcastData, null); // null = include all clients
    
    console.log(`✅ State update complete and broadcasted`);
  } else {
    console.log(`   ⏭️ No changes detected, skipping broadcast`);
  }
  
  return hasChanges;
}

// Periodic sync to ensure all clients stay synchronized
function periodicSync() {
  if (connectedClients.size > 0) {
    console.log(`🔄 Periodic sync check (${connectedClients.size} clients)`);
    
    const syncData = {
      type: 'periodicSync',
      riders: centralState.riders,
      leaderboard: centralState.leaderboard,
      lastUpdated: centralState.lastUpdated
    };
    
    broadcastToAllClients(syncData);
  }
}

// Start periodic sync every 30 seconds
setInterval(periodicSync, 30000);

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
  console.log(`📊 Total clients: ${connectedClients.size}`);
  console.log(`📋 Centrale state: ${centralState.riders.length} riders, ${centralState.leaderboard.length} leaderboard`);

  // IMMEDIATE: Send current state to new client
  socket.emit('syncData', {
    type: 'serverState',
    riders: centralState.riders,
    leaderboard: centralState.leaderboard,
    lastUpdated: centralState.lastUpdated
  });
  console.log(`📤 Initial state sent to ${socket.id}`);

  // Handle request for server state
  socket.on('getServerState', () => {
    console.log(`📤 Server state requested by ${socket.id}`);
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
        updateCentralStateAndBroadcast(
          { riders: data.riders }, 
          socket.id, 
          'ridersUpdate'
        );
        
      } else if (data.type === 'leaderboardUpdate') {
        updateCentralStateAndBroadcast(
          { leaderboard: data.leaderboard }, 
          socket.id, 
          'leaderboardUpdate'
        );
        
      } else if (data.type === 'fullStateSync') {
        updateCentralStateAndBroadcast(
          {
            riders: data.riders || [],
            leaderboard: data.leaderboard || []
          }, 
          socket.id, 
          'fullStateSync'
        );
        
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
    
    // Notify remaining clients about disconnection
    if (connectedClients.size > 0) {
      broadcastToAllClients({
        type: 'clientDisconnected',
        disconnectedClientId: socket.id,
        remainingClients: connectedClients.size
      });
    }
  });

  // Handle errors
  socket.on('error', (error) => {
    console.log(`⚠️ Socket error voor ${socket.id}:`, error);
  });
  
  // Send heartbeat every 10 seconds to maintain connection
  const heartbeat = setInterval(() => {
    if (socket.connected) {
      socket.emit('heartbeat', { timestamp: new Date().toISOString() });
    } else {
      clearInterval(heartbeat);
    }
  }, 10000);
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

🏛️ ENHANCED SYNC SERVER
   ✅ Guaranteed broadcast on every data change
   ✅ All clients receive immediate updates
   ✅ Periodic sync every 30 seconds
   ✅ Heartbeat monitoring
   ✅ Automatic client cleanup

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

💡 Real-time sync features:
   🔄 Every data change broadcasts to ALL clients
   📡 Periodic sync every 30 seconds
   💓 Heartbeat monitoring
   🔗 Immediate state sync for new connections

🐂 =====================================================
`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Server shutdown signal ontvangen');
  console.log(`📊 Final state: ${centralState.riders.length} riders, ${centralState.leaderboard.length} leaderboard entries`);
  
  // Notify all clients of server shutdown
  broadcastToAllClients({
    type: 'serverShutdown',
    message: 'Server is shutting down'
  });
  
  server.close(() => {
    console.log('✅ Server gestopt');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n🛑 Server stop via Ctrl+C');
  console.log(`📊 Final state: ${centralState.riders.length} riders, ${centralState.leaderboard.length} leaderboard entries`);
  
  // Notify all clients of server shutdown
  broadcastToAllClients({
    type: 'serverShutdown',
    message: 'Server is shutting down'
  });
  
  server.close(() => {
    console.log('✅ Server gestopt');
    process.exit(0);
  });
});
