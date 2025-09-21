// 🔗 GRNDbrekers Multi-Device Sync Client
// Complete versie met automatische server detectie en client registratie

class SyncClient {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 1000;
    this.heartbeatInterval = null;
    this.serverHost = null;
    this.clientInfo = this.getClientInfo();
    
    console.log('🚀 GRNDbrekers Sync Client wordt gestart...');
    console.log('📱 Client Info:', this.clientInfo);
    
    this.init();
  }

  // 📱 Detecteer client informatie
  getClientInfo() {
    const ua = navigator.userAgent;
    let deviceName = 'Unknown Device';
    let browser = 'Unknown Browser';
    
    // Detecteer device type
    if (/iPhone/i.test(ua)) deviceName = 'iPhone';
    else if (/iPad/i.test(ua)) deviceName = 'iPad';
    else if (/Android/i.test(ua)) deviceName = 'Android';
    else if (/Windows/i.test(ua)) deviceName = 'Windows PC';
    else if (/Mac/i.test(ua)) deviceName = 'Mac';
    else if (/Linux/i.test(ua)) deviceName = 'Linux PC';
    
    // Detecteer browser
    if (/Chrome/i.test(ua)) browser = 'Chrome';
    else if (/Safari/i.test(ua)) browser = 'Safari';
    else if (/Firefox/i.test(ua)) browser = 'Firefox';
    else if (/Edge/i.test(ua)) browser = 'Edge';
    
    return {
      name: `${deviceName} (${browser})`,
      screen: window.location.pathname,
      browser: browser,
      userAgent: ua,
      screenSize: `${window.screen.width}x${window.screen.height}`,
      timestamp: new Date().toISOString()
    };
  }

  init() {
    // Detecteer server IP en probeer verbinding te maken
    this.detectServerAndConnect();
    
    // Setup event listeners voor localStorage changes
    this.setupLocalStorageListeners();
    
    // Setup heartbeat
    this.setupHeartbeat();
    
    // Update client info bij route changes
    this.setupRouteChangeDetection();
  }

  // 🔄 Detecteer route changes voor SPA behavior
  setupRouteChangeDetection() {
    let currentPath = window.location.pathname;
    setInterval(() => {
      if (window.location.pathname !== currentPath) {
        currentPath = window.location.pathname;
        this.clientInfo.screen = currentPath;
        if (this.isConnected) {
          this.socket.emit('registerClient', this.clientInfo);
        }
      }
    }, 1000);
  }

  // 🔍 Automatische server detectie voor verschillende hotspot types
  async detectServerAndConnect() {
    // Get current host first
    const currentHost = window.location.hostname;
    
    // Lijst van mogelijke server IPs, prioriteit op huidige host
    const possibleHosts = [
      currentHost,              // ⭐ BELANGRIJKSTE: gebruik huidige host EERST!
      '192.168.137.1',         // Windows Mobile Hotspot (meest voorkomend)
      '192.168.43.1',          // Android hotspot / alternatief Windows
      'localhost',             // Voor lokale development
      '127.0.0.1',             // Backup localhost
      '10.0.0.1',              // iOS hotspot / andere ranges
      '192.168.1.1',           // Standaard router IP
      '192.168.0.1',           // Alternative router IP
      '192.168.4.1',           // Linux hotspot (origineel) - LAATSTE
    ].filter((host, index, array) => array.indexOf(host) === index); // Remove duplicates

    console.log('🔍 Zoeken naar GRNDbrekers server...');
    console.log('📋 Te proberen hosts:', possibleHosts);
    
    for (const host of possibleHosts) {
      console.log(`🔎 Proberen: ${host}:3000`);
      
      try {
        // Test of server bereikbaar is met korte timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        
        const response = await fetch(`http://${host}:3000/health`, {
          method: 'GET',
          mode: 'cors',
          cache: 'no-cache',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const healthData = await response.json();
          console.log(`✅ Server gevonden op: ${host}:3000`);
          console.log('📊 Server info:', healthData);
          this.serverHost = host;
          this.connect();
          return;
        }
      } catch (error) {
        console.log(`❌ ${host}:3000 niet bereikbaar:`, error.name);
      }
    }
    
    // Als geen server gevonden, probeer toch de huidige host
    console.log('⚠️ Geen server automatisch gevonden, probeer huidige host...');
    this.serverHost = currentHost || 'localhost';
    this.connect();
  }

  connect() {
    try {
      const port = window.location.port || '3000';
      const serverUrl = `http://${this.serverHost}:${port}`;
      
      console.log('🔗 Verbinding maken met server...', serverUrl);
      
      this.socket = io(serverUrl, {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        forceNew: true,
        upgrade: true
      });

      // ✅ Connection event handlers
      this.socket.on('connect', () => {
        console.log('✅ Verbonden met sync server!', this.serverHost);
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // Registreer client bij server
        this.socket.emit('registerClient', this.clientInfo);
        
        // Vraag meteen de huidige state op
        this.socket.emit('requestState');
        
        // Update UI indicator
        this.updateConnectionStatus(true);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('❌ Verbinding verloren:', reason);
        this.isConnected = false;
        this.updateConnectionStatus(false);
        
        // Only attempt reconnect if not manually disconnected
        if (reason !== 'io client disconnect') {
          this.attemptReconnect();
        }
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ Verbindingsfout:', error.message);
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

      // Heartbeat response
      this.socket.on('pong', () => {
        // Verbinding is actief
      });

    } catch (error) {
      console.error('❌ Socket.IO setup error:', error);
      this.attemptReconnect();
    }
  }

  // 🔄 Intelligente state merging
  mergeCentralState(centralState) {
    try {
      const localLastModified = localStorage.getItem('lastModified');
      const serverLastModified = centralState.lastUpdated;

      console.log('🔄 State merge check:');
      console.log('   📱 Lokaal:', localLastModified || 'geen data');
      console.log('   🖥️ Server:', serverLastModified);

      // Als server nieuwer is, of als we geen lokale data hebben
      if (!localLastModified || !serverLastModified || serverLastModified > localLastModified) {
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
      
      console.log('📤 Syncing lokale data naar server...');
      
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
      
      // Sync relevante changes naar server (maar vermijd loops)
      if (this.isConnected && ['riders', 'leaderboard'].includes(key)) {
        // Small delay to avoid rapid-fire updates
        setTimeout(() => {
          this.handleLocalStorageChange(key, value);
        }, 100);
      }
    };
  }

  handleLocalStorageChange(key, value) {
    try {
      if (key === 'riders') {
        const riders = JSON.parse(value);
        // Only sync the most recent rider to avoid spam
        if (riders.length > 0) {
          const latestRider = riders[riders.length - 1];
          this.socket.emit('addRider', latestRider);
        }
      } else if (key === 'leaderboard') {
        const leaderboard = JSON.parse(value);
        this.socket.emit('updateLeaderboard', leaderboard);
      }
    } catch (error) {
      console.error('❌ Handle localStorage change error:', error);
    }
  }

  // 🔄 Reconnection logic met intelligente backoff
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('❌ Max reconnect attempts bereikt, probeer server opnieuw te detecteren...');
      // Reset en probeer server opnieuw te detecteren
      setTimeout(() => {
        this.reconnectAttempts = 0;
        this.detectServerAndConnect();
      }, 10000); // 10 seconden wachten
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000); // Max 30 sec
    
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

  // 🎨 Geavanceerde connection status indicator
  updateConnectionStatus(connected) {
    let indicator = document.getElementById('connection-status');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'connection-status';
      indicator.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        padding: 8px 16px;
        border-radius: 25px;
        font-size: 11px;
        font-weight: bold;
        z-index: 1000;
        transition: all 0.3s ease;
        cursor: pointer;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        user-select: none;
      `;
      
      // Klik om handmatig te reconnecten of debug info te tonen
      indicator.addEventListener('click', () => {
        if (!connected) {
          console.log('🔄 Handmatige reconnect gestart...');
          this.reconnectAttempts = 0;
          this.detectServerAndConnect();
        } else {
          // Toon debug info
          console.log('🔍 Debug Info:');
          console.log('   Server:', this.serverHost);
          console.log('   Client:', this.clientInfo);
          console.log('   Connected:', this.isConnected);
        }
      });
      
      document.body.appendChild(indicator);
    }

    if (connected) {
      indicator.textContent = `🟢 SYNC (${this.serverHost})`;
      indicator.style.background = 'linear-gradient(45deg, #4CAF50, #45a049)';
      indicator.style.color = 'white';
      indicator.title = `Verbonden met ${this.serverHost}:3000\nKlik voor debug info`;
    } else {
      indicator.textContent = '🔴 OFFLINE (klik om te verbinden)';
      indicator.style.background = 'linear-gradient(45deg, #f44336, #da190b)';
      indicator.style.color = 'white';
      indicator.title = `Niet verbonden\nKlik om opnieuw te proberen\nProbeerde: ${this.serverHost || 'geen server'}`;
    }
  }

  // 🔌 Public methods voor handmatige controle
  manualSync() {
    console.log('🔄 Handmatige sync gestart...');
    if (this.isConnected) {
      this.socket.emit('requestState');
    } else {
      this.detectServerAndConnect();
    }
  }

  broadcastLocalData() {
    console.log('📤 Broadcasting lokale data...');
    if (this.isConnected) {
      this.syncLocalToServer();
    } else {
      console.log('❌ Niet verbonden - kan niet broadcasten');
    }
  }

  // 🔍 Debug method
  getConnectionInfo() {
    return {
      connected: this.isConnected,
      server: this.serverHost,
      client: this.clientInfo,
      reconnectAttempts: this.reconnectAttempts,
      socketId: this.socket?.id
    };
  }
}

// 🚀 Initialize sync client wanneer DOM ready is
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 DOM loaded, starting GRNDbrekers Sync Client...');
  const syncClient = new SyncClient();
  
  // Maak sync client global beschikbaar voor debugging
  window.syncClient = syncClient;
  
  // Helper functions voor console debugging
  window.debugSync = () => console.log('🔍 Sync Info:', syncClient.getConnectionInfo());
  window.manualSync = () => syncClient.manualSync();
  window.reconnectSync = () => {
    syncClient.reconnectAttempts = 0;
    syncClient.detectServerAndConnect();
  };
  
  console.log('✅ Sync client initialized. Debug commands available:');
  console.log('   window.debugSync() - toon connectie info');
  console.log('   window.manualSync() - forceer sync');
  console.log('   window.reconnectSync() - forceer reconnect');
});

// 🚨 Fallback als DOMContentLoaded al gefired is
if (document.readyState === 'loading') {
  // DOM is nog aan het laden, event listener is al geregistreerd
} else {
  // DOM is al geladen, start meteen
  console.log('🚀 DOM already loaded, starting GRNDbrekers Sync Client immediately...');
  const syncClient = new SyncClient();
  window.syncClient = syncClient;
}
