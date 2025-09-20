(function() {
    'use strict';
    
    // Detecteer of we in sync mode draaien
    const isSyncEnabled = window.location.hostname !== 'localhost' || 
                         window.location.search.includes('sync=true');
    
    if (!isSyncEnabled) {
        console.log('Sync uitgeschakeld - single device mode');
        return;
    }

    console.log('Multi-device sync geactiveerd');
    
    // Socket.io verbinding
    const socket = io();
    let isInitializing = true;
    
    // Originele localStorage functies bewaren
    const originalSetItem = localStorage.setItem.bind(localStorage);
    const originalGetItem = localStorage.getItem.bind(localStorage);
    
    // localStorage.setItem wrapper voor sync
    localStorage.setItem = function(key, value) {
        originalSetItem(key, value);
        
        // Sync alleen rodeo data
        if (key.startsWith('rodeo') && !isInitializing) {
            syncToServer(key, value);
        }
    };
    
    // Sync naar server
    function syncToServer(key, value) {
        fetch(`/sync/${key}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ value })
        }).catch(err => {
            console.warn('Sync gefaald:', err);
        });
    }
    
    // Ontvang updates van andere devices
    socket.on('storageUpdate', (data) => {
        const { key, value } = data;
        
        // Update localStorage zonder sync trigger
        originalSetItem(key, value);
        
        // Trigger UI update gebaseerd op huidige scherm
        refreshCurrentScreen();
    });
    
    // Initiële data synchronisatie
    socket.on('initialSync', (serverStorage) => {
        Object.keys(serverStorage).forEach(key => {
            if (serverStorage[key] !== null) {
                originalSetItem(key, serverStorage[key]);
            }
        });
        
        isInitializing = false;
        refreshCurrentScreen();
    });
    
    // Refresh huidige scherm op basis van actieve screen
    function refreshCurrentScreen() {
        // Gebruik bestaande functies om UI te updaten
        if (typeof loadData === 'function') {
            loadData();
        }
        
        if (typeof updateRidersList === 'function') {
            updateRidersList();
        }
        
        if (typeof updateRiderDropdown === 'function') {
            updateRiderDropdown();
        }
        
        if (typeof updateLeaderboard === 'function') {
            updateLeaderboard();
        }
        
        if (typeof updateDisplay === 'function') {
            updateDisplay(); // Voor leaderboard.html
        }
    }
    
    // Verbinding status indicator
    socket.on('connect', () => {
        console.log('Multi-device sync verbonden');
        showSyncStatus('Verbonden', 'green');
    });
    
    socket.on('disconnect', () => {
        console.log('Multi-device sync verbroken');
        showSyncStatus('Offline', 'orange');
    });
    
    function showSyncStatus(status, color) {
        // Optionele status indicator
        let indicator = document.getElementById('sync-status');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'sync-status';
            indicator.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                background: ${color};
                color: white;
                padding: 5px 10px;
                border-radius: 5px;
                font-size: 12px;
                z-index: 10000;
            `;
            document.body.appendChild(indicator);
        }
        indicator.textContent = status;
        indicator.style.background = color;
    }
})();
