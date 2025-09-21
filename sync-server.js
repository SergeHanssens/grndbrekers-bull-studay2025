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

// Verbonden clients
let connectedClients = new Map();

// ✅ Correcte CSP (met unsafe-eval tijdens dev)
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https://raw.githubusercontent.com https://*.githubusercontent.com; " +
    "connect-src 'self' ws: wss:; " +
    "font-src 'self' data:; " +
    "manifest-src 'self'"
  );
  next();
});

app.use(express.static(path.join(__dirname, '.')));
app.use(express.json());

// ✅ Pagina routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/leaderboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'leaderboard.html'));
});

// ✅ Debug endpoints
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

// ✅ Helper: netwerk info
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

// ✅ WebSocket handlers
io.on('connection', (socket) => {
  const clientIP = socket.handshake.address || socket.request.connection.remoteAddress;
  const userAgent = socket.handshake.headers['user-agent'] || 'Unknown';

  connectedClients.set(socket.id, {
    id: socket.id,
    ip: clientIP,
    userAgent: userAgent,
    connected: true,
    connectedAt: new Date().toISOString()
  });

  console.log(`🔗 Nieuwe client verbonden: ${socket.id}`);
  console.log(`🌐 IP: ${clientIP}`);

  // ✅ Sync huidige state
  if (centralState.riders.length > 0 || centralState.leaderboard.length > 0) {
    console.log(`📤 Sync volledige state naar ${socket.id}`);
    socket.emit('syncData', {
      type: 'fullState',
      data: centralState
    });
  }

  // ✅ Ontvangen riders-update
  socket.on('ridersUpdate', (data) => {
    console.log(`📝 Riders update van ${socket.id}`);
    centralState.riders = data;
    centralState.lastUpdated = new Date().toISOString();

    socket.broadcast.emit('syncData', {
      type: 'riderUpdated',
      rider: data,
      source: socket.id
    });
  });

  // ✅ Ontvangen leaderboard-update
  socket.on('leaderboardUpdate', (data) => {
    console.log(`🏆 Leaderboard update van ${socket.id}`);
    centralState.leaderboard = data;
    centralState.lastUpdated = new Date().toISOString();

    socket.broadcast.emit('syncData', {
      type: 'leaderboardUpdated',
      leaderboard: data,
      source: socket.id
    });
  });

  // ✅ Full state update
  socket.on('fullStateSync', (data) => {
    console.log(`🔄 Volledige state sync van ${socket.id}`);
    centralState = {
      ...data,
      lastUpdated: new Date().toISOString()
    };

    socket.broadcast.emit('syncData', {
      type: 'fullState',
      data: centralState,
      source: socket.id
    });
  });

  // ✅ Client vraagt expliciet state op
  socket.on('getState', () => {
    console.log(`📋 State requested door ${socket.id}`);
    socket.emit('syncData', {
      type: 'fullState',
      data: centralState
    });
  });

  // ✅ Disconnect handler
  socket.on('disconnect', (reason) => {
    console.log(`❌ Client disconnected: ${socket.id} (${reason})`);
    connectedClients.delete(socket.id);
  });

  socket.on('error', (err) => {
    console.log(`⚠️ Socket error bij ${socket.id}:`, err);
  });
});

// ✅ Server opstarten
const PORT = process.env.PORT || 3000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`
🐂 =====================================================
🚀 GRNDbrekers Bull Riding Server Started!
🐂 =====================================================

🌐 Server running on port: ${PORT}
📡 Accessible on all network interfaces
`);

  const interfaces = os.networkInterfaces();
  Object.keys(interfaces).forEach(name => {
    interfaces[name].forEach(iface => {
      if (iface.family === 'IPv4' && !iface.internal) {
        const isHotspot = iface.address.startsWith('192.168.137') || iface.address.startsWith('192.168.43');
        const label = isHotspot ? '🔥 (HOTSPOT)' : '📍';
        console.log(`   ${label} ${name}: http://${iface.address}:${PORT}`);
      }
    });
  });

  console.log(`
📊 Debug endpoints:
   http://<ip>:${PORT}/health
   http://<ip>:${PORT}/clients
   http://<ip>:${PORT}/api/debug

🐂 =====================================================
`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Server shutdown via Ctrl+C');
  server.close(() => {
    console.log('✅ Server gestopt');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('🛑 Server shutdown via SIGTERM');
  server.close(() => {
    console.log('✅ Server gestopt');
    process.exit(0);
  });
});
