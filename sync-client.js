// GRNDbrekers Bull Riding - Sync Client
// Server as ABSOLUTE source of truth - client is passive receiver

class SyncClient {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.syncIndicator = null;
        this.lastSyncTime = null;
        this.hasReceivedServerState = false;
        this.isReceivingServerData = false;
        
        this.init();
    }
    
    init() {
        console.log('🔄 Sync Client initializing...');
        this.createSyncIndicator();
        this.connectToServer();
        this.setupWindowEvents();
        this.interceptAppFunctions();
    }
    
    createSyncIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'syncIndicator';
        indicator.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background-color: #ff4444;
            z-index: 10000;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            cursor: pointer;
            transition: all 0.3s ease;
        `;
        indicator.title = 'Sync Status: Disconnected';
        indicator.onclick = () => this.handleIndicatorClick();
        
        document.body.appendChild(indicator);
        this.syncIndicator = indicator;
    }
    
    connectToServer() {
        try {
            console.log('🔗 Attempting to connect to server...');
            
            const serverUrl = this.detectServerUrl();
            console.log('🎯 Connecting to:', serverUrl);
            
            this.socket = io(serverUrl, {
                transports: ['websocket', 'polling'],
                timeout: 10000,
                forceNew: true
            });
            
            this.setupSocketEvents();
            
        } catch (error) {
            console.error('❌ Connection error:', error);
            this.updateSyncIndicator(false, 'Connection Error');
        }
    }
    
    detectServerUrl() {
        const hostname = window.location.hostname;
        const port = window.location.port || '3000';
        
        if (hostname === '192.168.137.1' || hostname === 'localhost' || hostname === '127.0.0.1') {
            return `${window.location.protocol}//${hostname}:${port}`;
        }
        
        return 'http://192.168.137.1:3000';
    }
    
    setupSocketEvents() {
        this.socket.on('connect', () => {
            console.log('✅ Connected to server! ID:', this.socket.id);
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.hasReceivedServerState = false;
            this.updateSyncIndicator(true, 'Connected - Waiting for server data');
            
            // DO NOT send local data - just wait for server state
            console.log('⏳ Waiting for authoritative server state...');
        });
        
        this.socket.on('disconnect', (reason) => {
            console.warn('❌ Disconnected from server:', reason);
            this.isConnected = false;
            this.hasReceivedServerState = false;
            this.updateSyncIndicator(false, `Disconnected: ${reason}`);
            
            if (reason === 'io server disconnect') {
                setTimeout(() => this.reconnect(), 2000);
            }
        });
        
        this.socket.on('connect_error', (error) => {
            console.error('🔴 Connection error:', error);
            this.isConnected = false;
            this.updateSyncIndicator(false, 'Connection Error');
            this.scheduleReconnect();
        });
        
        // RECEIVE sync data from server
        this.socket.on('syncData', (data) => {
            console.log('📥 Sync data received:', data.type);
            this.handleSyncData(data);
            this.lastSyncTime = new Date();
        });
        
        this.socket.on('heartbeat', (data) => {
            // Silent heartbeat - just acknowledge
        });
        
        this.socket.on('error', (error) => {
            console.error('⚠️ Socket error:', error);
        });
    }
    
    handleSyncData(data) {
        this.isReceivingServerData = true;
        
        try {
            switch(data.type) {
                case 'serverState':
                    console.log('🏛️ Received authoritative server state');
                    this.applyServerState(data);
                    this.hasReceivedServerState = true;
                    this.updateSyncIndicator(true, 'Synced with server');
                    break;
                    
                case 'ridersUpdate':
                    if (this.hasReceivedServerState) {
                        this.updateRiders(data.riders);
                    }
                    break;
                    
                case 'leaderboardUpdate':
                    if (this.hasReceivedServerState) {
                        this.updateLeaderboard(data.leaderboard);
                    }
                    break;
                    
                case 'fullStateSync':
                    if (this.hasReceivedServerState) {
                        this.syncFullState(data);
                    }
                    break;
                    
                case 'periodicSync':
                    if (this.hasReceivedServerState) {
                        this.syncFullState(data);
                    }
                    break;
                    
                case 'serverReset':
                    console.log('🗑️ Server data reset - clearing all local data');
                    this.applyServerState(data);
                    break;
                    
                case 'serverShutdown':
                    console.warn('⚠️ Server is shutting down');
                    this.updateSyncIndicator(false, 'Server shutting down');
                    break;
                    
                default:
                    console.warn('🤷 Unknown sync data type:', data.type);
            }
        } catch (error) {
            console.error('❌ Error handling sync data:', error);
        } finally {
            this.isReceivingServerData = false;
        }
    }
    
    applyServerState(data) {
        console.log('🔄 Applying server state as ABSOLUTE source of truth');
        console.log(`   Server has: ${data.riders?.length || 0} riders, ${data.leaderboard?.length || 0} leaderboard entries`);
        
        // Replace local data with server data
        window.riders = data.riders || [];
        window.leaderboardData = data.leaderboard || [];
        
        // Save server data to localStorage for offline backup only
        this.saveToLocalStorage('riders', window.riders);
        this.saveToLocalStorage('leaderboard', window.leaderboardData);
        
        // Update UI
        this.refreshUI();
        
        console.log(`✅ Server state applied: ${window.riders.length} riders, ${window.leaderboardData.length} leaderboard entries`);
    }
    
    updateRiders(riders) {
        if (!this.isReceivingServerData) {
            console.log('👥 Updating riders from server sync:', riders?.length || 0);
        }
        
        if (Array.isArray(riders)) {
            window.riders = riders;
            this.saveToLocalStorage('riders', riders);
            this.refreshUI();
        }
    }
    
    updateLeaderboard(leaderboard) {
        if (!this.isReceivingServerData) {
            console.log('🏆 Updating leaderboard from server sync:', leaderboard?.length || 0);
        }
        
        if (Array.isArray(leaderboard)) {
            window.leaderboardData = leaderboard;
            this.saveToLocalStorage('leaderboard', leaderboard);
            this.refreshUI();
        }
    }
    
    syncFullState(data) {
        if (data.riders) {
            this.updateRiders(data.riders);
        }
        
        if (data.leaderboard) {
            this.updateLeaderboard(data.leaderboard);
        }
    }
    
    refreshUI() {
        // Update all UI elements
        if (typeof updateRidersList === 'function') {
            updateRidersList();
        }
        if (typeof updateRiderDropdown === 'function') {
            updateRiderDropdown();
        }
        if (typeof updateLeaderboard === 'function') {
            updateLeaderboard();
        }
        if (typeof updateAllLeaderboards === 'function') {
            updateAllLeaderboards();
        }
    }
    
    // SEND data to server (only called when user makes actual changes)
    sendRiderUpdate() {
        if (!this.isConnected || !this.hasReceivedServerState) {
            console.warn('⚠️ Cannot sync riders: not ready');
            return;
        }
        
        if (this.isReceivingServerData) {
            console.log('⏭️ Skipping send during server data reception');
            return;
        }
        
        console.log('📤 Sending riders update to server');
        this.socket.emit('syncData', {
            type: 'ridersUpdate',
            riders: window.riders || []
        });
    }
    
    sendLeaderboardUpdate() {
        if (!this.isConnected || !this.hasReceivedServerState) {
            console.warn('⚠️ Cannot sync leaderboard: not ready');
            return;
        }
        
        if (this.isReceivingServerData) {
            console.log('⏭️ Skipping send during server data reception');
            return;
        }
        
        console.log('📤 Sending leaderboard update to server');
        this.socket.emit('syncData', {
            type: 'leaderboardUpdate',
            leaderboard: window.leaderboardData || []
        });
    }
    
    sendFullStateUpdate() {
        if (!this.isConnected || !this.hasReceivedServerState) {
            console.warn('⚠️ Cannot sync full state: not ready');
            return;
        }
        
        if (this.isReceivingServerData) {
            console.log('⏭️ Skipping send during server data reception');
            return;
        }
        
        console.log('📤 Sending full state update to server');
        this.socket.emit('syncData', {
            type: 'fullStateSync',
            riders: window.riders || [],
            leaderboard: window.leaderboardData || []
        });
    }
    
    // ADDED: Data clearing functions for integration with app
    
    // FIXED: Start Leaderboard function - only clears LOCAL data
    startLeaderboard() {
        console.log('🏁 Starting leaderboard - clearing LOCAL data only...');
        
        // Clear only local storage, NOT server data
        this.clearLocalStorage();
        
        // Clear global variables
        window.riders = [];
        window.leaderboardData = [];
        
        console.log('✅ Local data cleared');
        
        // Request fresh data from server
        if (this.isConnected) {
            console.log('📨 Requesting fresh server state...');
            this.socket.emit('getServerState');
        } else {
            console.log('⚠️ Not connected to server - will sync when connected');
        }
        
        // Update UI immediately
        this.refreshUI();
    }
    
    // ADDED: Reset function for server data clearing (used by Reset button)
    resetServerData() {
        console.log('🗑️ Resetting SERVER data...');
        
        if (this.isConnected) {
            // Send reset command to server
            this.socket.emit('syncData', {
                type: 'resetServerData'
            });
            console.log('📤 Reset command sent to server');
        } else {
            console.log('❌ Cannot reset server data - not connected');
            alert('Cannot reset data - not connected to server');
        }
    }
    
    // Intercept app functions to add sync calls
    interceptAppFunctions() {
        const self = this;
        
        // Wait for app to load, then override functions
        setTimeout(() => {
            this.wrapFunction('addRider', () => {
                console.log('🔗 Auto-sync after addRider');
                setTimeout(() => self.sendRiderUpdate(), 100);
            });
            
            this.wrapFunction('addTime', () => {
                console.log('🔗 Auto-sync after addTime');
                setTimeout(() => self.sendLeaderboardUpdate(), 100);
            });
            
            this.wrapFunction('saveData', () => {
                console.log('🔗 Auto-sync after saveData');
                setTimeout(() => self.sendFullStateUpdate(), 100);
            });
        }, 1000);
    }
    
    wrapFunction(functionName, callback) {
        if (typeof window[functionName] === 'function') {
            const originalFunction = window[functionName];
            window[functionName] = function(...args) {
                const result = originalFunction.apply(this, args);
                callback();
                return result;
            };
            console.log(`✅ Wrapped function: ${functionName}`);
        }
    }
    
    clearLocalStorage() {
        try {
            localStorage.removeItem('riders');
            localStorage.removeItem('leaderboard');
            localStorage.removeItem('rodeoRiders');
            localStorage.removeItem('rodeoLeaderboard');
            localStorage.removeItem('currentPhoto');
            console.log('🧹 LocalStorage cleared - server is source of truth');
        } catch (error) {
            console.warn('⚠️ Could not clear localStorage:', error);
        }
    }
    
    updateSyncIndicator(connected, message) {
        if (!this.syncIndicator) return;
        
        this.syncIndicator.style.backgroundColor = connected ? '#44ff44' : '#ff4444';
        this.syncIndicator.title = `Sync Status: ${message}`;
        
        if (connected && this.lastSyncTime) {
            this.syncIndicator.title += `\nLast sync: ${this.lastSyncTime.toLocaleTimeString()}`;
        }
    }
    
    handleIndicatorClick() {
        if (this.isConnected) {
            console.log('🔄 Manual server state request');
            this.socket.emit('getServerState');
        } else {
            console.log('🔄 Manual reconnect triggered');
            this.reconnect();
        }
    }
    
    reconnect() {
        if (this.socket) {
            this.socket.disconnect();
        }
        
        setTimeout(() => {
            this.connectToServer();
        }, 1000);
    }
    
    scheduleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
            
            console.log(`🔄 Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
            
            setTimeout(() => {
                this.reconnect();
            }, delay);
        } else {
            console.error('❌ Max reconnect attempts reached');
            this.updateSyncIndicator(false, 'Connection Failed');
        }
    }
    
    setupWindowEvents() {
        window.syncClient = this;
        
        // ADDED: Make the data clearing functions globally available
        window.startLeaderboard = () => this.startLeaderboard();
        window.resetServerData = () => this.resetServerData();
        
        window.debugSync = () => {
            console.log('🐛 Sync Debug Info:', {
                connected: this.isConnected,
                hasServerState: this.hasReceivedServerState,
                isReceivingData: this.isReceivingServerData,
                socketId: this.socket?.id,
                reconnectAttempts: this.reconnectAttempts,
                lastSyncTime: this.lastSyncTime,
                riders: window.riders?.length || 0,
                leaderboard: window.leaderboardData?.length || 0
            });
        };
        
        window.requestServerState = () => {
            if (this.isConnected) {
                this.socket.emit('getServerState');
            } else {
                console.warn('⚠️ Not connected to server');
            }
        };
        
        window.clearLocalData = () => {
            this.clearLocalStorage();
            window.riders = [];
            window.leaderboardData = [];
            this.refreshUI();
            console.log('🧹 All local data cleared');
        };
    }
    
    saveToLocalStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.warn('⚠️ LocalStorage save failed:', error);
        }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.syncClientInstance = new SyncClient();
    });
} else {
    window.syncClientInstance = new SyncClient();
}

window.SyncClient = SyncClient;
