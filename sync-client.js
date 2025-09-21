// GRNDbrekers Bull Riding - Sync Client
// Multi-device synchronization via Socket.IO

class SyncClient {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.syncIndicator = null;
        this.lastSyncTime = null;
        
        this.init();
    }
    
    init() {
        console.log('🔄 Sync Client initializing...');
        this.createSyncIndicator();
        this.connectToServer();
        this.setupWindowEvents();
    }
    
    createSyncIndicator() {
        // Create sync status indicator
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
            
            // Auto-detect server URL
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
        
        // If we're already on the right host, use current location
        if (hostname === '192.168.137.1' || hostname === 'localhost' || hostname === '127.0.0.1') {
            return `${window.location.protocol}//${hostname}:${port}`;
        }
        
        // Default fallback for hotspot
        return 'http://192.168.137.1:3000';
    }
    
    setupSocketEvents() {
        // Connection events
        this.socket.on('connect', () => {
            console.log('✅ Connected to server! ID:', this.socket.id);
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.updateSyncIndicator(true, 'Connected');
            this.requestInitialSync();
        });
        
        this.socket.on('disconnect', (reason) => {
            console.warn('❌ Disconnected from server:', reason);
            this.isConnected = false;
            this.updateSyncIndicator(false, `Disconnected: ${reason}`);
            
            if (reason === 'io server disconnect') {
                // Server initiated disconnect, reconnect manually
                setTimeout(() => this.reconnect(), 2000);
            }
        });
        
        this.socket.on('connect_error', (error) => {
            console.error('🔴 Connection error:', error);
            this.isConnected = false;
            this.updateSyncIndicator(false, 'Connection Error');
            this.scheduleReconnect();
        });
        
        // CONSISTENT EVENT: Listen for syncData
        this.socket.on('syncData', (data) => {
            console.log('📥 Sync data received:', data);
            this.handleSyncData(data);
            this.lastSyncTime = new Date();
        });
        
        // Error handling
        this.socket.on('error', (error) => {
            console.error('⚠️ Socket error:', error);
        });
    }
    
    handleSyncData(data) {
        try {
            switch(data.type) {
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
    
    updateRiders(riders) {
        console.log('👥 Updating riders:', riders.length);
        
        if (window.riders && Array.isArray(riders)) {
            window.riders = riders;
            
            // Update localStorage
            this.saveToLocalStorage('riders', riders);
            
            // Update UI if functions exist
            if (typeof updateRidersList === 'function') {
                updateRidersList();
            }
            if (typeof updateRiderDropdown === 'function') {
                updateRiderDropdown();
            }
        }
    }
    
    updateLeaderboard(leaderboard) {
        console.log('🏆 Updating leaderboard:', leaderboard.length);
        
        if (window.leaderboardData && Array.isArray(leaderboard)) {
            window.leaderboardData = leaderboard;
            
            // Update localStorage
            this.saveToLocalStorage('leaderboard', leaderboard);
            
            // Update UI if functions exist
            if (typeof updateLeaderboard === 'function') {
                updateLeaderboard();
            }
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
        
        console.log('✅ Full state sync complete');
    }
    
    requestInitialSync() {
        console.log('📤 Requesting initial sync...');
        
        // Send current local state to server
        const localState = {
            type: 'fullStateSync',
            riders: this.loadFromLocalStorage('riders') || window.riders || [],
            leaderboard: this.loadFromLocalStorage('leaderboard') || window.leaderboardData || []
        };
        
        this.sendSyncData(localState);
    }
    
    sendSyncData(data) {
        if (this.isConnected && this.socket) {
            console.log('📤 Sending sync data:', data.type);
            this.socket.emit('syncData', data);
        } else {
            console.warn('⚠️ Cannot send sync data: not connected');
        }
    }
    
    // Public methods for app to call
    syncRiders(riders) {
        this.sendSyncData({
            type: 'ridersUpdate',
            riders: riders
        });
    }
    
    syncLeaderboard(leaderboard) {
        this.sendSyncData({
            type: 'leaderboardUpdate',
            leaderboard: leaderboard
        });
    }
    
    syncFullState(riders, leaderboard) {
        this.sendSyncData({
            type: 'fullStateSync',
            riders: riders || [],
            leaderboard: leaderboard || []
        });
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
            this.requestInitialSync();
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
        // Expose functions globally for app to use
        window.syncClient = this;
        
        // Debug functions
        window.debugSync = () => {
            console.log('🐛 Sync Debug Info:', {
                connected: this.isConnected,
                socketId: this.socket?.id,
                reconnectAttempts: this.reconnectAttempts,
                lastSyncTime: this.lastSyncTime
            });
        };
        
        window.manualSync = () => {
            this.requestInitialSync();
        };
        
        window.reconnectSync = () => {
            this.reconnect();
        };
    }
    
    // LocalStorage helpers
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

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.syncClientInstance = new SyncClient();
    });
} else {
    window.syncClientInstance = new SyncClient();
}

// Export for manual initialization if needed
window.SyncClient = SyncClient;
