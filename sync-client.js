// 🔄 GRNDbrekers Bull Riding - Smart Sync Client
// Automatische server detectie + localStorage sync + debug tools

(function() {
  'use strict';

  // 🎯 CONFIGURATIE
  const CONFIG = {
    possibleHosts: [
      window.location.hostname,  // ⭐ EERST: huidige host
      '192.168.137.1',          // Windows hotspot  
      '192.168.43.1',           // Android hotspot
      '192.168.4.1',            // Linux hotspot
      'localhost',              // Development
      '127.0.0.1'               // Fallback
    ],
    port: window.location.port || '3000',
    connectionTimeout: 3000,
    maxReconnectAttempts: 10,
    reconnectDelay: 1000,
    debug: window.location.search.includes('debug=true')
  };

  // 🌐 STATE MANAGEMENT
  let socket = null;
  let isConnected = false;
  let reconnectAttempts = 0;
  let reconnectTimer = null;
  let currentHost = null;
  let statusIndicator = null;

  // 📱 DEVICE DETECTION
  function getDeviceInfo() {
    const ua = navigator.userAgent;
    let device = 'Unknown Device';
    
    if (ua.includes('iPhone')) device = 'iPhone';
    else if (ua.includes('iPad')) device = 'iPad';
    else if (ua.includes('Android')) device = 'Android';
    else if (ua.includes('Windows')) device = 'Windows PC';
    else if (ua.includes('Macintosh')) device = 'Mac';
    else if (ua.includes('Linux')) device = 'Linux';
    
    const browser = ua.includes('Chrome') ? 'Chrome' : 
                   ua.includes('Firefox') ? 'Firefox' : 
                   ua.includes('Safari') ? 'Safari' : 'Browser';
    
    return `${device} (${browser})`;
  }

  // 🎨 STATUS INDICATOR
  function createStatusIndicator() {
    if (statusIndicator) return;
    
    statusIndicator = document.createElement('div');
    statusIndicator.id = 'sync-status';
    statusIndicator.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #ff4444;
      border: 2px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      z-index: 9999;
      transition: all 0.3s ease;
      cursor: pointer;
    `;
    
    statusIndicator.title = 'Sync status - Klik voor info';
    statusIndicator.onclick = () => showConnectionInfo();
    
    document.body.appendChild(statusIndicator);
  }

  function updateStatusIndicator(connected, host = null) {
    if (!statusIndicator) createStatusIndicator();
    
    if (connected) {
      statusIndicator.style.background = '#44ff44';
      statusIndicator.title = `✅ Verbonden met ${host || 'server'}`;
    } else {
      statusIndicator.style.background = '#ff4444';
      statusIndicator.title = '❌ Niet verbonden - Klik voor info';
    }
  }

  // 💾 LOCALSTORAGE SYNC
  function syncToLocalStorage(data) {
    try {
      if (!data || !data.type) return;
      
      log('💾 Syncing to localStorage:', data.type);
      
      switch (data.type) {
        case 'fullState':
          if (data.data) {
            localStorage.setItem('bullRiding_appState', JSON.stringify(data.data));
            restoreFromState(data.data);
          }
          break;
          
        case 'riderAdded':
        case 'riderUpdated':
          updateLocalStorageRiders(data);
          break;
          
        case 'leaderboardUpdated':
          if (data.leaderboard) {
            localStorage.setItem('bullRiding_leaderboard', JSON.stringify(data.leaderboard));
            updateLeaderboardDisplay(data.leaderboard);
          }
          break;
          
        case 'timerStart':
        case 'timerStop':
          localStorage.setItem('bullRiding_timerState', JSON.stringify({
            active: data.type === 'timerStart',
            currentRider: data.rider || null,
            startTime: data.startTime || null
          }));
          break;
      }
      
      localStorage.setItem('bullRiding_lastSync', Date.now().toString());
      
    } catch (error) {
      log('❌ Fout bij localStorage sync:', error);
    }
  }

  function updateLocalStorageRiders(data) {
    try {
      const stored = localStorage.getItem('bullRiding_riders');
      let riders = stored ? JSON.parse(stored) : [];
      
      if (data.type === 'riderAdded' && data.rider) {
        const exists = riders.find(r => r.id === data.rider.id);
        if (!exists) {
          riders.push(data.rider);
        }
      } else if (data.type === 'riderUpdated' && data.rider) {
        const index = riders.findIndex(r => r.id === data.rider.id);
        if (index !== -1) {
          riders[index] = { ...riders[index], ...data.rider };
        }
      }
      
      localStorage.setItem('bullRiding_riders', JSON.stringify(riders));
      updateRidersDisplay(riders);
      
    } catch (error) {
      log('❌ Fout bij riders localStorage:', error);
    }
  }

  function restoreFromLocalStorage() {
    try {
      log('📤 Restoring from localStorage...');
      
      const appState = localStorage.getItem('bullRiding_appState');
      if (appState) {
        const state = JSON.parse(appState);
        restoreFromState(state);
        return true;
      }
      
      return false;
    } catch (error) {
      log('❌ Fout bij localStorage restore:', error);
      return false;
    }
  }

  function restoreFromState(state) {
    if (!state) return;
    
    log('🔄 Restoring UI from state...');
    
    if (state.riders) updateRidersDisplay(state.riders);
    if (state.leaderboard) updateLeaderboardDisplay(state.leaderboard);
    if (state.timerActive !== undefined) updateTimerDisplay(state.timerActive, state.currentRider);
  }

  // 🎮 UI UPDATE FUNCTIONS
  function updateRidersDisplay(riders) {
    // Update riders list in UI if elements exist
    const ridersList = document.getElementById('ridersList');
    if (ridersList && Array.isArray(riders)) {
      log(`🏇 Updating riders display: ${riders.length} riders`);
      // Trigger custom event for main app
      window.dispatchEvent(new CustomEvent('ridersUpdated', { detail: riders }));
    }
  }

  function updateLeaderboardDisplay(leaderboard) {
    const leaderboardElement = document.getElementById('leaderboard');
    if (leaderboardElement && Array.isArray(leaderboard)) {
      log(`🏆 Updating leaderboard: ${leaderboard.length} entries`);
      window.dispatchEvent(new CustomEvent('leaderboardUpdated', { detail: leaderboard }));
    }
  }

  function updateTimerDisplay(active, rider) {
    log(`⏱️ Timer ${active ? 'started' : 'stopped'}${rider ? ` for ${rider.name}` : ''}`);
    window.dispatchEvent(new CustomEvent('timerStateChanged', { 
      detail: { active, rider } 
    }));
  }

  // 🔍 LOGGING
  function log(...args) {
    if (CONFIG.debug) {
      console.log('[SyncClient]', ...args);
    }
  }

  // 🔌 CONNECTION LOGIC
  async function tryConnect(host) {
    return new Promise((resolve) => {
      log(`🔌 Proberen te verbinden met ${host}:${CONFIG.port}...`);
      
      const testSocket = io(`http://${host}:${CONFIG.port}`, {
        timeout: CONFIG.connectionTimeout,
        transports: ['websocket', 'polling']
      });

      const timer = setTimeout(() => {
        testSocket.disconnect();
        resolve(false);
      }, CONFIG.connectionTimeout);

      testSocket.on('connect', () => {
        clearTimeout(timer);
        log(`✅ Verbinding gelukt met ${host}`);
        resolve(testSocket);
      });

      testSocket.on('connect_error', () => {
        clearTimeout(timer);
        testSocket.disconnect();
        resolve(false);
      });
    });
  }

  async function findAndConnect() {
    log('🔍 Zoeken naar server...');
    
    for (const host of CONFIG.possibleHosts) {
      if (!host) continue;
      
      const result = await tryConnect(host);
      if (result) {
        currentHost = host;
        return result;
      }
    }
    
    return null;
  }

  function setupSocketEvents(socket) {
    socket.on('connect', () => {
      log(`🎉 Verbonden met server op ${currentHost}`);
      isConnected = true;
      reconnectAttempts = 0;
      updateStatusIndicator(true, currentHost);
      
      // Registreer client bij server
      socket.emit('registerClient', {
        name: getDeviceInfo(),
        screen: window.location.pathname,
        timestamp: Date.now()
      });
      
      // Vraag huidige state op
      socket.emit('getState');
    });

    socket.on('disconnect', (reason) => {
      log(`💔 Verbinding verbroken: ${reason}`);
      isConnected = false;
      updateStatusIndicator(false);
      
      if (reason !== 'io client disconnect') {
        scheduleReconnect();
      }
    });

    socket.on('syncData', (data) => {
      log('📥 Data ontvangen:', data.type);
      
      // Sync naar localStorage
      syncToLocalStorage(data);
      
      // Trigger event voor main app
      window.dispatchEvent(new CustomEvent('syncDataReceived', { detail: data }));
    });

    socket.on('connect_error', (error) => {
      log('❌ Verbindingsfout:', error.message);
      scheduleReconnect();
    });
  }

  function scheduleReconnect() {
    if (reconnectTimer) return;
    
    reconnectAttempts++;
    if (reconnectAttempts > CONFIG.maxReconnectAttempts) {
      log('❌ Maximum reconnect attempts bereikt');
      return;
    }
    
    const delay = Math.min(CONFIG.reconnectDelay * Math.pow(2, reconnectAttempts - 1), 30000);
    log(`🔄 Reconnect over ${delay}ms... (poging ${reconnectAttempts})`);
    
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      initializeConnection();
    }, delay);
  }

  // 🚀 INITIALIZATION
  async function initializeConnection() {
    if (socket && isConnected) return;
    
    if (socket) {
      socket.disconnect();
    }
    
    socket = await findAndConnect();
    
    if (socket) {
      setupSocketEvents(socket);
    } else {
      log('❌ Geen server gevonden');
      updateStatusIndicator(false);
      scheduleReconnect();
    }
  }

  // 📡 PUBLIC API
  window.syncClient = {
    emit: function(event, data) {
      if (socket && isConnected) {
        socket.emit(event, data);
        return true;
      }
      log('⚠️ Kan niet verzenden: niet verbonden');
      return false;
    },
    
    isConnected: function() {
      return isConnected;
    },
    
    reconnect: function() {
      reconnectAttempts = 0;
      initializeConnection();
    },
    
    getStatus: function() {
      return {
        connected: isConnected,
        host: currentHost,
        attempts: reconnectAttempts,
        hasLocalData: !!localStorage.getItem('bullRiding_appState')
      };
    }
  };

  // 🔧 DEBUG TOOLS
  function showConnectionInfo() {
    const status = window.syncClient.getStatus();
    const message = status.connected 
      ? `✅ Verbonden met ${status.host}\n\n🔧 Debug info:\n• Host: ${status.host}:${CONFIG.port}\n• Lokale data: ${status.hasLocalData ? 'Ja' : 'Nee'}`
      : `❌ Niet verbonden\n\n🔧 Debug info:\n• Pogingen: ${status.attempts}/${CONFIG.maxReconnectAttempts}\n• Lokale data: ${status.hasLocalData ? 'Ja' : 'Nee'}\n\nKlik OK om opnieuw te proberen.`;
    
    alert(message);
    
    if (!status.connected) {
      window.syncClient.reconnect();
    }
  }

  window.debugSync = showConnectionInfo;
  window.manualSync = () => {
    if (socket && isConnected) {
      socket.emit('getState');
      log('📋 State opgevraagd');
    }
  };
  window.reconnectSync = () => window.syncClient.reconnect();

  // 🚀 START
  document.addEventListener('DOMContentLoaded', () => {
    log('🚀 SyncClient wordt geïnitialiseerd...');
    createStatusIndicator();
    
    // Probeer eerst localStorage te restoren
    const hasLocalData = restoreFromLocalStorage();
    if (hasLocalData) {
      log('✅ Lokale data hersteld');
    }
    
    // Start verbinding
    initializeConnection();
  });

  // Fallback als DOM al geladen is
  if (document.readyState === 'loading') {
    // DOM wordt nog geladen, event listener is al toegevoegd
  } else {
    // DOM is al geladen
    setTimeout(() => {
      if (!socket) {
        log('🚀 Late SyncClient initialisatie...');
        createStatusIndicator();
        restoreFromLocalStorage();
        initializeConnection();
      }
    }, 100);
  }

})();
