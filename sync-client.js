// 🔗 GRNDbrekers Multi-Device Sync Client
// Windows-compatible versie met automatische IP detectie

class SyncClient {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.heartbeatInterval = null;
    this.serverHost = null;
    
    this.init();
  }

  init() {
    // Detecteer server IP en probeer verbinding te maken
    this.detectServerAndConnect();
    
    // Setup event listeners voor localStorage changes
    this.setupLocalStorageListeners();
    
    // Setup heartbeat
    this.setupHeartbeat();
  }

  // 🔍 Automatische server detectie voor Windows hotspots
  async detectServerAndConnect() {
    const possibleHosts = [
      window.location.hostname, // Als we al op de juiste host zijn
      'localhost',              // Voor lokale development
      '192.168.137.1',         // Windows Mobile Hotspot (meest voorkomend)
      '192.168.43.1',          // Alternatief Windows hotspot
      '192.168.4.1',           // Linux hotspot (origineel)
      '10.0.0.1',              // Andere mogelijke hotspot range
      '192.168.1.1',           // Standaard router IP
    ];

    console.log('🔍 Zoeken naar GRNDbrekers server...');
    
    for (const host of possibleHosts) {
      console.log(`🔎 Proberen: ${host}:3000`);
      
      try {
        // Test of server bereikbaar is
        const response = await fetch(`http://${host}:3000/health`, {
          method: 'GET',
          mode: 'cors',
          cache: 'no-cache',
          signal: AbortSignal.timeout(3000) // 3 seconden timeout
        });
        
        if (response.ok) {
          console.log(`✅ Server gevonden op: ${host}:3000`);
          this.serverHost = host;
          this.connect();
          return;
        }
      } catch (error) {
        console.log(`❌ ${host}:3000 niet bereikbaar:`, error.message);
      }
    }
    
    // Als geen server gevonden, probeer toch localhost
    console.log('⚠️ Geen server automatisch gevonden, probeer localhost...');
    this.serverHost = 'localhost';
    this.connect();
  }

  connect() {
    try {
      const port = window.location.port || '3000';
      const serverUrl = `http://${this.serverHost}:${port}`;
      
      console.log('🔗 Verbinding maken met server...', serverUrl);
      
      this.socket = io(serverUrl, {
        transports: ['websocket', 'polling'],
        timeout: 5000,
        forceNew: true
      });

      // ✅ Connection event handlers
      this.socket.on('connect', () => {
        console.log('✅ Verbonden met sync server!', this.serverHost);
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // Vraag meteen de huidige state op
        this.socket.emit('requestState');
        
        // Update UI indicator
        this.updateConnectionStatus(true);
      });

      this.socket.on('disconnect', () => {
        console.log('❌ Verbinding verloren');
        this.isConnected = false;
        this.updateConnectionStatus(false);
        this.attemptReconnect();
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ Verbindingsfout:', error);
        this.isConnected = false;
        this.updateConnectionStatus(false);
        this.attemptReconnect();
      });

      // 🔄 Sync event handlers
      this.socket.on('syncFullState', (centralState) => {
        console.log('📥 Volledige state ontvangen van server');
        this.mergeCentralState(centralState);
      });

      this.socket.on('addRider', (data) => {
        console.log('📥 Rider sync ontvangen:', data.name);
        this.updateLocalRider(data);
      });

      this.socket.on('updateLeaderboard', (data) => {
        console.log('📥 Leaderboard sync ontvangen');
        this.updateLocalLeaderboard(data);
      });

      this.socket.on('startTimer', (data) => {
        console.log('📥 Timer start sync:', data.name);
        if (window.handleTimerStart) {
          window.handleTimerStart(data);
        }
      });

      this.socket.on('stopTimer', (data) => {
        console.log('📥 Timer stop sync:', data.name, data.time);
        this.updateLocalRider(data);
        if (window.handleTimerStop) {
          window.handleTimerStop(data);
        }
      });

      this.socket.on('editRider', (data) => {
        console.log('📥 Rider edit sync:', data.name);
        this.updateLocalRider(data);
      });

      this.socket.on('deleteRider', (data) => {
        console.log('📥 Rider delete sync:', data.name);
        this.deleteLocalRider(data.name);
      });

      this.socket.on('pong', () => {
        // Verbinding is actief
      });

    } catch (error) {
      console.error('❌ Socket.IO setup error:', error);
      this.attemptReconnect();
    }
  }

  // 🔄 Verbeterde state merging
  mergeCentralState(centralState) {
    try {
      const localLastModified = localStorage.getItem('lastModified');
      const serverLastModified = centralState.lastUpdated;

      console.log('🔄 State merge - Lokaal:', localLastModified, 'Server:', serverLastModified);

      if (!localLastModified || serverLastModified > localLastModified) {
        console.log('📥 Server state is nieuwer, lokale data wordt overschreven');
        
        if (centralState.riders && centralState.riders.length > 0) {
          localStorage.setItem('riders', JSON.stringify(centralState.riders));
          window.riders = centralState.riders;
        }
        
        if (centralState.leaderboard && centralState.leaderboard.length > 0) {
          localStorage.setItem('leaderboard', JSON.stringify(centralState.leaderboard));
          window.leaderboardData = centralState.leaderboard;
        }
        
        localStorage.setItem('lastModified', centralState.lastUpdated);
        
        // Refresh UI
        if (window.loadData) window.loadData();
        if (window.displayRiders) window.displayRiders();
        if (window.displayLeaderboard) window.displayLeaderboard();
        
      } else {
        console.log('📤 Lokale data is nieuwer, wordt naar server gestuurd');
        this.syncLocalToServer();
      }
    } catch (error) {
      console.error('❌ State merge error:', error);
    }
  }

  syncLocalToServer() {
    try {
      const localRiders = JSON.parse(localStorage.getItem('riders') || '[]');
      const localLeaderboard = JSON.parse(localStorage.getItem('leaderboard') || '[]');
      
      localRiders.forEach(rider => {
        this.socket.emit('addRider', rider);
      });
      
      if (localLeaderboard.length > 0) {
        this.socket.emit('updateLeaderboard', localLeaderboard);
      }
    } catch (error) {
      console.error('❌ Sync lokaal naar server error:', error);
    }
  }

  updateLocalRider(riderData) {
    try {
      let riders = JSON.parse(localStorage.getItem('riders') || '[]');
      
      const existingIndex = riders.findIndex(r => r.name === riderData.name);
      if (existingIndex >= 0) {
        riders[existingIndex] = {...riders[existingIndex], ...riderData};
      } else {
        riders.push(riderData);
      }
      
      localStorage.setItem('riders', JSON.stringify(riders));
      localStorage.setItem('lastModified', new Date().toISOString());
      window.riders = riders;
      
      if (window.displayRiders) window.displayRiders();
    } catch (error) {
      console.error('❌ Update lokale rider error:', error);
    }
  }

  updateLocalLeaderboard(leaderboardData) {
    try {
      localStorage.setItem('leaderboard', JSON.stringify(leaderboardData));
      localStorage.setItem('lastModified', new Date().toISOString());
      window.leaderboardData = leaderboardData;
      
      if (window.displayLeaderboard) window.displayLeaderboard();
    } catch (error) {
      console.error('❌ Update lokale leaderboard error:', error);
    }
  }

  deleteLocalRider(riderName) {
    try {
      let riders = JSON.parse(localStorage.getItem('riders') || '[]');
      let leaderboard = JSON.parse(localStorage.getItem('leaderboard') || '[]');
      
      riders = riders.filter(r => r.name !== riderName);
      leaderboard = leaderboard.filter(r => r.name !== riderName);
      
      localStorage.setItem('riders', JSON.stringify(riders));
      localStorage.setItem('leaderboard', JSON.stringify(leaderboard));
      localStorage.setItem('lastModified', new Date().toISOString());
      
      window.riders = riders;
      window.leaderboardData = leaderboard;
      
      if (window.displayRiders) window.displayRiders();
      if (window.displayLeaderboard) window.displayLeaderboard();
    } catch (error) {
      console.error('❌ Delete lokale rider error:', error);
    }
  }

  setupLocalStorageListeners() {
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = (key, value) => {
      originalSetItem.call(localStorage, key, value);
      
      if (this.isConnected && ['riders', 'leaderboard'].includes(key)) {
        this.handleLocalStorageChange(key, value);
      }
    };
  }

  handleLocalStorageChange(key, value) {
    try {
      if (key === 'riders') {
        const riders = JSON.parse(value);
        riders.forEach(rider => {
          this.socket.emit('addRider', rider);
        });
      } else if (key === 'leaderboard') {
        const leaderboard = JSON.parse(value);
        this.socket.emit('updateLeaderboard', leaderboard);
      }
    } catch (error) {
      console.error('❌ Handle localStorage change error:', error);
    }
  }

  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('❌ Max reconnect attempts bereikt');
      // Probeer server opnieuw te detecteren
      setTimeout(() => {
        this.reconnectAttempts = 0;
        this.detectServerAndConnect();
      }, 10000); // 10 seconden wachten
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`🔄 Reconnect poging ${this.reconnectAttempts}/${this.maxReconnectAttempts} over ${delay}ms`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  setupHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected && this.socket) {
        this.socket.emit('ping');
      }
    }, 30000);
  }

  updateConnectionStatus(connected) {
    let indicator = document.getElementById('connection-status');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'connection-status';
      indicator.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        padding: 8px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: bold;
        z-index: 1000;
        transition: all 0.3s ease;
        cursor: pointer;
      `;
      
      // Klik om handmatig te reconnecten
      indicator.addEventListener('click', () => {
        if (!connected) {
          this.reconnectAttempts = 0;
          this.detectServerAndConnect();
        }
      });
      
      document.body.appendChild(indicator);
    }

    if (connected) {
      indicator.textContent = `🟢 SYNC (${this.serverHost})`;
      indicator.style.background = '#4CAF50';
      indicator.style.color = 'white';
      indicator.title = `Verbonden met ${this.serverHost}:3000`;
    } else {
      indicator.textContent = '🔴 OFFLINE (klik om opnieuw te proberen)';
      indicator.style.background = '#f44336';
      indicator.style.color = 'white';
      indicator.title = 'Klik om opnieuw verbinding te maken';
    }
  }

  manualSync() {
    if (this.isConnected) {
      this.socket.emit('requestState');
    } else {
      this.detectServerAndConnect();
    }
  }

  broadcastLocalData() {
    if (this.isConnected) {
      this.syncLocalToServer();
    }
  }
}

// 🚀 Initialize sync client
console.log('🚀 GRNDbrekers Sync Client wordt gestart...');
const syncClient = new SyncClient();

// Maak sync client global beschikbaar
window.syncClient = syncClient;
