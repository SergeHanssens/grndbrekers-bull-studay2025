// 🔗 GRNDbrekers Multi-Device Sync Client
// Verbeterde versie met state management en reconnection logic

class SyncClient {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.heartbeatInterval = null;
    
    this.init();
  }

  init() {
    // Probeer verbinding te maken
    this.connect();
    
    // Setup event listeners voor localStorage changes
    this.setupLocalStorageListeners();
    
    // Setup heartbeat
    this.setupHeartbeat();
  }

  connect() {
    try {
      // Connectie naar server (automatisch detectie van host)
      const host = window.location.hostname === 'localhost' ? 'localhost' : '192.168.4.1';
      const port = window.location.port || '3000';
      
      console.log('🔗 Verbinding maken met server...', `${host}:${port}`);
      
      this.socket = io(`http://${host}:${port}`, {
        transports: ['websocket', 'polling'],
        timeout: 5000,
        forceNew: true
      });

      // ✅ Connection event handlers
      this.socket.on('connect', () => {
        console.log('✅ Verbonden met sync server!');
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
        // Timer events zijn meestal real-time, geen lokale opslag nodig
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

      // Heartbeat response
      this.socket.on('pong', () => {
        // Verbinding is actief
      });

    } catch (error) {
      console.error('❌ Socket.IO setup error:', error);
      this.attemptReconnect();
    }
  }

  // 🔄 Verbeterde state merging - dit was het hoofdprobleem!
  mergeCentralState(centralState) {
    try {
      // Check of we lokale changes hebben die nieuwer zijn
      const localLastModified = localStorage.getItem('lastModified');
      const serverLastModified = centralState.lastUpdated;

      console.log('🔄 State merge - Lokaal:', localLastModified, 'Server:', serverLastModified);

      // Als server nieuwer is, of als we geen lokale data hebben, use server data
      if (!localLastModified || serverLastModified > localLastModified) {
        console.log('📥 Server state is nieuwer, lokale data wordt overschreven');
        
        // Update localStorage met server data
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
        // Stuur lokale data naar server
        this.syncLocalToServer();
      }
    } catch (error) {
      console.error('❌ State merge error:', error);
    }
  }

  // 🆕 Sync lokale data naar server
  syncLocalToServer() {
    try {
      const localRiders = JSON.parse(localStorage.getItem('riders') || '[]');
      const localLeaderboard = JSON.parse(localStorage.getItem('leaderboard') || '[]');
      
      // Stuur alle riders naar server
      localRiders.forEach(rider => {
        this.socket.emit('addRider', rider);
      });
      
      // Stuur leaderboard naar server
      if (localLeaderboard.length > 0) {
        this.socket.emit('updateLeaderboard', localLeaderboard);
      }
    } catch (error) {
      console.error('❌ Sync lokaal naar server error:', error);
    }
  }

  // 🔄 Lokale data update functies
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
      
      // Refresh UI
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
      
      // Refresh UI
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
      
      // Refresh UI
      if (window.displayRiders) window.displayRiders();
      if (window.displayLeaderboard) window.displayLeaderboard();
    } catch (error) {
      console.error('❌ Delete lokale rider error:', error);
    }
  }

  // 🔄 Setup localStorage monitoring
  setupLocalStorageListeners() {
    // Override localStorage setItem om automatisch te syncen
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = (key, value) => {
      originalSetItem.call(localStorage, key, value);
      
      // Sync relevante changes naar server
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

  // 🔄 Reconnection logic
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('❌ Max reconnect attempts bereikt');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`🔄 Reconnect poging ${this.reconnectAttempts}/${this.maxReconnectAttempts} over ${delay}ms`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  // 💓 Heartbeat om connection te monitoren
  setupHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected && this.socket) {
        this.socket.emit('ping');
      }
    }, 30000); // Elke 30 seconden
  }

  // 🎨 Connection status indicator
  updateConnectionStatus(connected) {
    // Voeg visuele indicator toe aan UI
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
      `;
      document.body.appendChild(indicator);
    }

    if (connected) {
      indicator.textContent = '🟢 SYNC ACTIEF';
      indicator.style.background = '#4CAF50';
      indicator.style.color = 'white';
    } else {
      indicator.textContent = '🔴 OFFLINE';
      indicator.style.background = '#f44336';
      indicator.style.color = 'white';
    }
  }

  // 🔌 Public methods voor handmatige sync
  manualSync() {
    if (this.isConnected) {
      this.socket.emit('requestState');
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
