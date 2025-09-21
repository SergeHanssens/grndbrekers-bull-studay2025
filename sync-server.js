const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const os = require('os');
const fs = require('fs');
const readline = require('readline');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Data file configuration
let DATA_FILE = 'bull-riding-data.json';
let centralState = {
  riders: [],
  leaderboard: [],
  lastUpdated: null,
  createdAt: new Date().toISOString(),
  dataFile: DATA_FILE
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

// Data persistence functions
function saveDataToFile() {
  try {
    const dataToSave = {
      ...centralState,
      savedAt: new Date().toISOString()
    };
    
    fs.writeFileSync(DATA_FILE, JSON.stringify(dataToSave, null, 2));
    console.log(`💾 Data saved to ${DATA_FILE}`);
    console.log(`   📊 ${centralState.riders.length} riders, ${centralState.leaderboard.length} leaderboard entries`);
    return true;
  } catch (error) {
    console.error(`❌ Error saving data to ${DATA_FILE}:`, error);
    return false;
  }
}

function loadDataFromFile(filename) {
  try {
    if (fs.existsSync(filename)) {
      const data = JSON.parse(fs.readFileSync(filename, 'utf8'));
      centralState = {
        riders: data.riders || [],
        leaderboard: data.leaderboard || [],
        lastUpdated: data.lastUpdated,
        createdAt: data.createdAt || new Date().toISOString(),
        dataFile: filename
      };
      
      console.log(`📂 Data loaded from ${filename}`);
      console.log(`   📊 ${centralState.riders.length} riders, ${centralState.leaderboard.length} leaderboard entries`);
      console.log(`   🕒 Last updated: ${centralState.lastUpdated || 'Never'}`);
      return true;
    } else {
      console.log(`📁 File ${filename} does not exist - will create new database`);
      DATA_FILE = filename;
      centralState.dataFile = filename;
      saveDataToFile();
      return false;
    }
  } catch (error) {
    console.error(`❌ Error loading data from ${filename}:`, error);
    return false;
  }
}

function listExistingDataFiles() {
  try {
    const files = fs.readdirSync('.').filter(file => 
      file.endsWith('.json') && file.includes('data')
    );
    return files;
  } catch (error) {
    return [];
  }
}

async function promptForDataFile() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    const existingFiles = listExistingDataFiles();
    
    console.log(`
🐂 =====================================================
📁 GRNDbrekers Bull Riding - Data File Selection
🐂 =====================================================
`);

    if (existingFiles.length > 0) {
      console.log(`📋 Existing data files found:`);
      existingFiles.forEach((file, index) => {
        console.log(`   ${index + 1}. ${file}`);
      });
      console.log('');
    }

    console.log(`Options:
   • Enter filename (e.g., 'studay2025.json')
   • Press Enter for default: ${DATA_FILE}
   • Type 'new' for a new database
`);

    rl.question('Data file to use: ', (answer) => {
      rl.close();
      
      if (!answer.trim()) {
        resolve(DATA_FILE);
      } else if (answer.toLowerCase() === 'new') {
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
        resolve(`bull-riding-${timestamp}.json`);
      } else {
        let filename = answer.trim();
        if (!filename.endsWith('.json')) {
          filename += '.json';
        }
        resolve(filename);
      }
    });
  });
}

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
    dataFile: DATA_FILE,
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
      platform: process.platform,
      dataFile: DATA_FILE
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

// Enhanced broadcast function
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

// State update with file save and broadcast
function updateCentralStateAndBroadcast(newState, sourceSocketId, updateType) {
  console.log(`🔄 State update: ${updateType} from ${sourceSocketId}`);
  
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
    
    // Save to file immediately
    saveDataToFile();
    
    // Broadcast to all clients
    const broadcastData = {
      type: updateType,
      riders: centralState.riders,
      leaderboard: centralState.leaderboard,
      lastUpdated: centralState.lastUpdated,
      source: sourceSocketId
    };
    
    broadcastToAllClients(broadcastData, null);
    
    console.log(`✅ State update complete, saved, and broadcasted`);
  } else {
    console.log(`   ⏭️ No changes detected, skipping save and broadcast`);
  }
  
  return hasChanges;
}

// Auto-save every 5 minutes as backup
setInterval(() => {
  if (centralState.lastUpdated) {
    console.log('🔄 Auto-save backup');
    saveDataToFile();
  }
}, 5 * 60 * 1000);

// Socket.IO connection handling
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
  console.log(`📊 Total clients: ${connectedClients.size}`);

  // IMMEDIATE: Send authoritative server state to client
  socket.emit('syncData', {
    type: 'serverState',
    riders: centralState.riders,
    leaderboard: centralState.leaderboard,
    lastUpdated: centralState.lastUpdated,
    dataFile: DATA_FILE
  });
  console.log(`📤 Authoritative state sent to ${socket.id} (${centralState.riders.length} riders, ${centralState.leaderboard.length} leaderboard)`);

  socket.on('getServerState', () => {
    console.log(`📤 Server state requested by ${socket.id}`);
    socket.emit('syncData', {
      type: 'serverState',
      riders: centralState.riders,
      leaderboard: centralState.leaderboard,
      lastUpdated: centralState.lastUpdated,
      dataFile: DATA_FILE
    });
  });

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

  socket.on('disconnect', (reason) => {
    console.log(`❌ Client disconnected: ${socket.id} (${reason})`);
    connectedClients.delete(socket.id);
    console.log(`📊 Remaining clients: ${connectedClients.size}`);
  });

  socket.on('error', (error) => {
    console.log(`⚠️ Socket error voor ${socket.id}:`, error);
  });
});

// Enhanced startup with data file selection
async function startServer() {
  console.clear();
  
  // Check command line arguments for data file
  const args = process.argv.slice(2);
  if (args.length > 0) {
    DATA_FILE = args[0];
    if (!DATA_FILE.endsWith('.json')) {
      DATA_FILE += '.json';
    }
    console.log(`📁 Using data file from command line: ${DATA_FILE}`);
    loadDataFromFile(DATA_FILE);
  } else {
    // Interactive prompt
    DATA_FILE = await promptForDataFile();
    loadDataFromFile(DATA_FILE);
  }

  const PORT = process.env.PORT || 3000;

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`
🐂 =====================================================
🚀 GRNDbrekers Bull Riding Server Started!
🐂 =====================================================

🌐 Server running on port: ${PORT}
📁 Data file: ${DATA_FILE}
📊 Loaded: ${centralState.riders.length} riders, ${centralState.leaderboard.length} leaderboard entries

🏛️ PERSISTENT DATA SERVER
   ✅ Data automatically saved to file on every change
   ✅ All clients receive same authoritative data
   ✅ Auto-backup every 5 minutes
   ✅ Single source of truth: ${DATA_FILE}

🔥 Hotspot URLs (meest waarschijnlijk):
   http://192.168.137.1:${PORT}
   http://192.168.43.1:${PORT}

🖥️ Local URLs:
   http://localhost:${PORT}
   http://127.0.0.1:${PORT}

📱 Test URLs voor andere devices:`);

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

💡 Command line usage for next time:
   npm start myevent.json
   npm start studay2025.json

🐂 =====================================================
`);
  });
}

// Graceful shutdown with data save
process.on('SIGTERM', () => {
  console.log('🛑 Server shutdown signal ontvangen');
  console.log('💾 Saving final data...');
  saveDataToFile();
  
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
  console.log('💾 Saving final data...');
  saveDataToFile();
  
  server.close(() => {
    console.log('✅ Server gestopt');
    process.exit(0);
  });
});

// Start the server
startServer().catch(console.error);
