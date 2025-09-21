// GRNDbrekers Bull Riding - Sync Client
// Server as single source of truth

class SyncClient {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.syncIndicator = null;
        this.lastSyncTime = null;
        this.hasReceivedInitialState = false;
        
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
            this.updateSyncIndicator(true, 'Connected');
            
            // REQUEST server state instead of sending local state
            this.requestServerState();
        });
        
        this.socket.on('disconnect', (reason) => {
            console.warn('❌ Disconnected from server:', reason);
            this.isConnected = false;
            this.hasReceivedInitialState = false;
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
            console.log('📥 Sync data received:', data);
            this.handleSyncData(data);
            this.lastSyncTime = new Date();
        });
        
        this.socket.on('error', (error) => {
            console.error('⚠️ Socket error:', error);
        });
    }
    
    requestServerState() {
        console.log('📤 Requesting current server state...');
        this.socket.emit('getServerState');
    }
    
    handleSyncData(data) {
        try {
            switch(data.type) {
                case 'serverState':
                    console.log('🏛️ Received authoritative server state');
                    this.applyServerState(data);
                    this.hasReceivedInitialState = true;
                    break;
                    
                case 'ridersUpdate':
                    this.updateRiders(data.riders);
                    break;
                    
                case 'leaderboardUpdate':
                    this.updateLeaderboard(data.leaderboard);
                    break;
                    
                case 'fullStateSync':
                    this.syncFullState(data);
                    break;
                    
                default:
                    console.warn('🤷 Unknown sync data type:', data.type);
            }
        } catch (error) {
            console.error('❌ Error handling sync data:', error);
        }
    }
    
    applyServerState(data) {
        console.log('🔄 Applying server state as source of truth');
        
        // Replace local data with server data
        if (data.riders && Array.isArray(data.riders)) {
            window.riders = data.riders;
            this.saveToLocalStorage('riders', data.riders);
        }
        
        if (data.leaderboard && Array.isArray(data.leaderboard)) {
            window.leaderboardData = data.leaderboard;
            this.saveToLocalStorage('leaderboard', data.leaderboard);
        }
        
        // Update UI
        this.refreshUI();
        
        console.log('✅ Server state applied successfully');
    }
    
    updateRiders(riders) {
        console.log('👥 Updating riders from sync:', riders.length);
        
        if (Array.isArray(riders)) {
            window.riders = riders;
            this.saveToLocalStorage('riders', riders);
            this.refreshUI();
        }
    }
    
    updateLeaderboard(leaderboard) {
        console.log('🏆 Updating leaderboard from sync:', leaderboard.length);
        
        if (Array.isArray(leaderboard)) {
            window.leaderboardData = leaderboard;
            this.saveToLocalStorage('leaderboard', leaderboard);
            this.refreshUI();
        }
    }
    
    syncFullState(data) {
        console.log('🔄 Full state sync received');
        
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
    
    // SEND data to server (called by main app)
    sendRiderUpdate() {
        if (!this.isConnected || !this.hasReceivedInitialState) {
            console.warn('⚠️ Cannot sync riders: not ready');
            return;
        }
        
        console.log('📤 Sending riders update to server');
        this.socket.emit('syncData', {
            type: 'ridersUpdate',
            riders: window.riders || []
        });
    }
    
    sendLeaderboardUpdate() {
        if (!this.isConnected || !this.hasReceivedInitialState) {
            console.warn('⚠️ Cannot sync leaderboard: not ready');
            return;
        }
        
        console.log('📤 Sending leaderboard update to server');
        this.socket.emit('syncData', {
            type: 'leaderboardUpdate',
            leaderboard: window.leaderboardData || []
        });
    }
    
    sendFullStateUpdate() {
        if (!this.isConnected || !this.hasReceivedInitialState) {
            console.warn('⚠️ Cannot sync full state: not ready');
            return;
        }
        
        console.log('📤 Sending full state update to server');
        this.socket.emit('syncData', {
            type: 'fullStateSync',
            riders: window.riders || [],
            leaderboard: window.leaderboardData || []
        });
    }
    
    // Intercept app functions to add sync calls
    interceptAppFunctions() {
        const self = this;
        
        // Wait for app to load, then override functions
        setTimeout(() => {
            this.wrapFunction('addRider', () => {
                console.log('🔗 Auto-sync after addRider');
                self.sendRiderUpdate();
            });
            
            this.wrapFunction('addTime', () => {
                console.log('🔗 Auto-sync after addTime');
                self.sendLeaderboardUpdate();
            });
            
            this.wrapFunction('saveData', () => {
                console.log('🔗 Auto-sync after saveData');
                self.sendFullStateUpdate();
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
            console.log('🔄 Manual sync triggered');
            this.requestServerState();
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
        
        window.debugSync = () => {
            console.log('🐛 Sync Debug Info:', {
                connected: this.isConnected,
                hasInitialState: this.hasReceivedInitialState,
                socketId: this.socket?.id,
                reconnectAttempts: this.reconnectAttempts,
                lastSyncTime: this.lastSyncTime,
                riders: window.riders?.length || 0,
                leaderboard: window.leaderboardData?.length || 0
            });
        };
        
        window.manualSync = () => {
            this.requestServerState();
        };
        
        window.forceSync = () => {
            this.sendFullStateUpdate();
        };
    }
    
    saveToLocalStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.warn('⚠️ LocalStorage save failed:', error);
        }
    }
    
    loadFromLocalStorage(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.warn('⚠️ LocalStorage load failed:', error);
            return null;
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
