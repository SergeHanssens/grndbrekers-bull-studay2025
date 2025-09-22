# 🐂 GRNDbrekers Bull Riding Leaderboard - StuDAY 2025

Een geavanceerd real-time bull riding leaderboard systeem met multi-device synchronisatie, foto management, en persistent data storage voor het StuDAY 2025 evenement.

## 🚀 Features

### 📱 **Multi-Device Real-Time Sync**
- **Server Authority Architecture** - Server als single source of truth
- **Automatic Synchronization** - Real-time updates tussen alle verbonden devices
- **WiFi Hotspot Support** - Localhost + externe clients via hotspot
- **Connection Management** - Automatische reconnection en status indicators
- **Conflict Resolution** - Server overschrijft altijd client data voor consistentie

### 📊 **Data Management**
- **Persistent JSON Storage** - Command-line selecteerbare data files
- **Auto-Save Functionaliteit** - Data automatisch opgeslagen bij elke wijziging
- **Backup System** - Auto-backup elke 5 minuten
- **Data Recovery** - Server herstart behoudt alle data
- **Export Functionaliteit** - JSON export voor backup/analyse

### 👥 **Advanced Rider Management**
- **Photo Support** - Camera capture met thumbnail/fullsize compression
- **Duplicate Detection** - Smart handling van dezelfde namen met verschillende foto's
- **Edit Capabilities** - Naam en foto bewerking voor niet-gereden riders
- **Batch Operations** - Efficient rider toevoegen en beheren

### ⏱️ **Sophisticated Time Tracking**
- **Precision Timing** - Minuten:Seconden:Honderdsten format
- **Real-time Validation** - Input validation tijdens typen
- **Automatic Leaderboard** - Ranked op langste tijd (who stayed on longest)
- **Medal System** - Goud/Zilver/Brons voor top 3

### 🎨 **Professional UI/UX**
- **Responsive Design** - Desktop en mobile optimized
- **Modern Styling** - Gradient backgrounds, glassmorphism effects
- **Interactive Elements** - Hover effects, smooth transitions
- **Photo Zoom Modal** - Full-screen foto viewing
- **Mobile-First** - Touch-friendly interface design

## 📋 Vereisten

- **Node.js** v16+ (getest met v22.19.0)
- **NPM** v7+
- **Windows** (voor WiFi Hotspot functionaliteit)
- **Modern Browser** (Chrome, Firefox, Safari, Edge)

## ⚡ Setup & Installation

### 1. Repository Clonen
```bash
git clone https://github.com/SergeHanssens/grndbrekers-bull-studay2025.git
cd grndbrekers-bull-studay2025
git checkout multi-device-setup
```

### 2. PowerShell Execution Policy (Windows) ⚠️
**BELANGRIJK**: Windows blokkeert scripts standaard. Kies één van deze oplossingen:

#### Oplossing A: Tijdelijk Policy Aanpassen (Veiligst)
```powershell
# Open PowerShell als Administrator
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process

# Nu kunnen scripts uitgevoerd worden in deze sessie
.\firewall-setup.ps1
npm install
npm start test.json
```

#### Oplossing B: Handmatige Firewall Setup
```powershell
# Als Administrator, voer deze commands uit:
netsh advfirewall firewall add rule name="Node.js Port 3000" dir=in action=allow protocol=TCP localport=3000
netsh advfirewall firewall add rule name="Node.js Port 3000 Out" dir=out action=allow protocol=TCP localport=3000

# Dan gewoon:
npm install
npm start test.json
```

#### Oplossing C: Alternative NPM Usage
```powershell
# Als npm niet werkt:
node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" install
node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" start test.json
```

### 3. Dependencies Installeren
```bash
npm install
```

### 4. Firewall Setup (Windows)
```bash
# Als je execution policy hebt aangepast:
.\firewall-setup.ps1

# Anders: handmatige commands hierboven gebruiken
```

## 🎯 Start Commands & Usage

### Command Overview
| Command | Beschrijving | Gebruik |
|---------|--------------|---------|
| `npm start studay2025.json` | Start met specifiek bestand "studay2025.json" | Voor productie/event gebruik |
| `npm start test.json` | Start met specifiek bestand "test.json" | Voor testing en development |
| `npm start` | Interactive file selectie menu | Wanneer je het bestand wilt kiezen |
| `npm run start:studay` | Shortcut → automatisch "studay2025.json" | Snelle productie start |
| `npm run start:test` | Shortcut → automatisch "test.json" | Snelle test start |

### Quick Start voor Events
```bash
# Voor testen/development:
npm run start:test

# Voor het echte evenement:
npm run start:studay

# Met eigen filename:
npm start myevent2025.json
```

## 🌐 Multi-Device Access

### Server URLs
- **Localhost:** `http://localhost:3000`
- **Hotspot clients:** `http://192.168.137.1:3000` (meest common)
- **Alternative hotspot:** `http://192.168.43.1:3000`

### Network Setup

#### WiFi Hotspot (Windows)
1. **Settings** → **Network & Internet** → **Mobile hotspot**
2. Kies recognizable **SSID naam**
3. Deel **password** met alle gebruikers
4. Ensure firewall port 3000 is open

#### IP Detection
Server toont automatisch alle beschikbare URLs bij opstarten:
```
🔥 Hotspot URLs (meest waarschijnlijk):
   http://192.168.137.1:3000
   http://192.168.43.1:3000

🖥️ Local URLs:
   http://localhost:3000
```

## 🏗️ Architecture & Data Flow

### System Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   JSON File     │◄───┤  Server State   │───►│  All Clients    │
│                 │    │                 │    │                 │
│ • Persistent    │    │ • Single Source │    │ • UI Updates    │
│ • Auto-backup   │    │ • Broadcasts    │    │ • Real-time     │
│ • Recovery      │    │ • Authority     │    │ • Sync Status   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Data Clearing Logic
- **"Start Leaderboard!" Button:** Cleared **alleen lokale browser data**
- **"Reset" Button:** Cleared **centrale server data** + broadcast naar alle devices

### Event Synchronization
- **Server→Client:** `serverState`, `ridersUpdate`, `leaderboardUpdate`, `serverReset`
- **Client→Server:** `ridersUpdate`, `leaderboardUpdate`, `resetServerData`
- **Auto-triggers:** `addRider()`, `addTime()`, `saveData()` functies

## 🧪 Testing & Validation

### Startup Verification Test
```bash
npm start test.json
# Expected output: "📊 Loaded: 0 riders, 0 leaderboard entries"
# Expected: Green connection indicator in browser
```

### Multi-Device Sync Test
1. **Start server:** `npm run start:test`
2. **Open localhost:** `http://localhost:3000` → should show empty interface
3. **Open hotspot client:** `http://192.168.137.1:3000` → identical empty interface
4. **Add rider on localhost** → should appear **immediately** on hotspot
5. **Add time on hotspot** → should appear **immediately** on localhost
6. **Verify sync indicators:** Both devices show **green dots**

### Data Persistence Test
1. Add some riders and times on any client
2. **Stop server:** `Ctrl+C`
3. **Restart server:** `npm start test.json`
4. **Verify:** All data should be **restored from JSON file**
5. **Check clients:** Should automatically receive restored data

### Production Deployment Test
```bash
# Final test before event:
npm run start:studay

# Verify:
# ✅ Server loads existing studay2025.json (if exists)
# ✅ Multi-device access works
# ✅ Real-time sync operational
# ✅ Photo capture/upload working
# ✅ Time validation functioning
# ✅ Leaderboard ranking correct
```

## 📱 Device Compatibility & Performance

### Getest & Volledig Ondersteund
- ✅ **Windows 10/11** + Chrome/Firefox/Edge localhost
- ✅ **Mobile Chrome/Safari** via WiFi hotspot
- ✅ **Multiple simultaneous connections** (10+ tested)
- ✅ **Mixed device environments** (desktop + mobile)
- ✅ **Network interruption recovery**

### Performance Characteristics
- **Memory Usage:** ~50-200MB server-side
- **File I/O:** JSON write bij elke wijziging (acceptable voor events)
- **Network Bandwidth:** Minimal, alleen changes gebroadcast
- **Latency:** <100ms sync tijd binnen lokaal netwerk
- **Photo Storage:** Compressed thumbnails + fullsize in base64

### Browser Requirements
- **Modern Browser** met WebSocket support
- **JavaScript enabled**
- **LocalStorage support** (>5MB)
- **Camera API** (voor foto capture)

## 🛠️ Development & Debugging

### Debug Commands (Browser Console)
```javascript
// Connection en state info
debugSync()

// Force server state request
requestServerState()

// Manual localStorage clear
clearLocalData()

// Event monitoring
window.addEventListener('ridersUpdate', (e) => console.log('Riders:', e.detail));
```

### Server Debug Endpoints
- **Health Check:** `http://192.168.137.1:3000/health`
- **Connected Clients:** `http://192.168.137.1:3000/clients`
- **Full Debug Info:** `http://192.168.137.1:3000/api/debug`

### File Structure Overview
```
├── index.html              # Main application interface
├── sync-server.js           # Multi-device sync server
├── sync-client.js           # Client-side sync logic
├── package.json            # NPM dependencies & scripts
├── firewall-setup.ps1      # Windows firewall configuration
├── manifest.json           # PWA manifest voor mobile
├── *.json                  # Data files (user-created)
└── images/                 # Logo assets
```

### NPM Scripts Detail
```json
{
  "start": "node sync-server.js",           // Basic start with file prompt
  "start:studay": "node sync-server.js studay2025.json",  // Quick production
  "start:test": "node sync-server.js test.json",          // Quick testing
  "doctor": "node doctor.js",                             // System diagnostics
  "ip-info": "node -e \"console.log('Server IP info:'); ...\""  // Network info
}
```

## 🔧 Advanced Configuration

### Custom Data Files
```bash
# Create new event database:
npm start myevent2025.json

# Copy existing data:
cp test.json backup-$(date +%Y%m%d).json

# Different events:
npm start "indoor-championship.json"
npm start "outdoor-finals.json"
```

### Network Configuration
```javascript
// Custom server detection in sync-client.js
detectServerUrl() {
    const hostname = window.location.hostname;
    const port = window.location.port || '3000';
    
    // Add custom IP ranges here if needed
    if (hostname.startsWith('10.0.') || hostname.startsWith('172.16.')) {
        return `http://${hostname}:${port}`;
    }
    
    return 'http://192.168.137.1:3000';
}
```

### Photo Configuration
Photos worden automatically compressed:
- **Thumbnails:** 100x100px, 70% quality (voor lists)
- **Fullsize:** 800x600px, 85% quality (voor zoom)
- **Format:** JPEG base64 encoded
- **Storage:** Both versions opgeslagen in JSON

## 🚨 Troubleshooting Guide

### Common Issues & Quick Fixes

#### 1. **PowerShell Execution Policy Error**
```
Error: "cannot be loaded. The file is not digitally signed"
```
**Oplossing:** Set execution policy (zie setup instructions hierboven)

#### 2. **Port 3000 Already in Use**
```bash
# Find and kill process using port 3000:
netstat -ano | findstr :3000
taskkill /PID [PID_NUMBER] /F

# Or use different port:
set PORT=3001 && npm start test.json
```

#### 3. **Hotspot Clients Can't Connect**
- **Verify hotspot IP:** `ipconfig /all` (look for "Wireless LAN adapter")
- **Check firewall:** `.\firewall-setup.ps1` or manual rules
- **Test connectivity:** `ping 192.168.137.1` from client device

#### 4. **Sync Not Working**
- **Check connection dots:** Should be **green** on all devices
- **Browser console:** Look for sync errors
- **Force sync:** Click green dot or run `requestServerState()`
- **Clear data:** Use "Start Leaderboard!" button

#### 5. **Data Loss/Corruption**
```bash
# Check for backup files:
ls -la *.json

# Restore from backup:
cp backup-20241025.json studay2025.json
npm run start:studay

# Emergency recovery from server logs
grep "State update" server.log
```

### Emergency Procedures

#### Complete System Reset
```bash
# 1. Stop server
Ctrl+C

# 2. Clear all data
echo {} > studay2025.json

# 3. Clear all client browsers (instruct users):
# Click "Start Leaderboard!" button on all devices

# 4. Restart server
npm run start:studay

# 5. Verify empty state on all devices
```

#### Network Fallback Options
- **Ethernet connection:** Use wired network instead of WiFi hotspot
- **Different IP range:** Update client URLs to `192.168.1.x` format
- **Mobile hotspot:** Use phone hotspot instead of Windows hotspot

## 📞 Production Deployment (Event Day)

### Pre-Event Checklist
- [ ] **Server laptop** met stable power en netwerk
- [ ] **WiFi hotspot** configured en tested
- [ ] **Firewall rules** active voor port 3000
- [ ] **Backup plan** voor network failures
- [ ] **Data file** prepared (e.g., `studay2025.json`)
- [ ] **Multiple devices** tested en verified
- [ ] **Event staff** trained op basic troubleshooting

### During Event Best Practices
1. **Monitor server console** voor error messages
2. **Check sync indicators** regularly (green dots)
3. **Backup data file** hourly tijdens evenement
4. **Have fallback device** ready als server fails
5. **Document any issues** voor post-event analysis

### Post-Event Data Management
```bash
# Create event backup with timestamp:
cp studay2025.json "studay2025-final-$(date +%Y%m%d-%H%M).json"

# Export for analysis:
# Use export function in browser interface

# Archive images separately if needed:
# Photos are embedded in JSON as base64
```

## 🤝 Contributing & Development

### Development Setup
```bash
git clone https://github.com/SergeHanssens/grndbrekers-bull-studay2025.git
cd grndbrekers-bull-studay2025
git checkout -b feature/my-enhancement
npm install
npm run start:test
```

### Code Style Guidelines
- **ES6+ JavaScript** voor moderne browser compatibility
- **Async/await** voor Promise handling
- **Console logging** voor debug visibility
- **Error handling** met try/catch blocks
- **Responsive CSS** met mobile-first approach

### Testing New Features
1. **Create test data file:** `npm start test-feature.json`
2. **Test multi-device:** Localhost + hotspot client
3. **Verify persistence:** Server restart test
4. **Check edge cases:** Network interruption, invalid data
5. **Mobile testing:** Various screen sizes

## 🎯 Roadmap & Future Enhancements

### Potential Improvements
- **User Authentication** voor admin functions
- **Real-time Spectator View** zonder edit capabilities
- **Advanced Analytics** dashboard
- **Image Optimization** met WebP format
- **PWA Capabilities** voor offline functionality
- **Database Integration** (SQLite/PostgreSQL)
- **Cloud Deployment** options (AWS, Heroku)

### Event-Specific Customizations
- **Team-based Scoring** instead of individual
- **Multiple Event Types** (different rules)
- **Live Streaming Integration**
- **Social Media Auto-posting**
- **Print-friendly Leaderboard** formats

## 📄 License & Credits

**License:** MIT License - see LICENSE file for details.

**Built voor:** StuDAY 2025 - GRNDbrekers Bull Riding Event

**Development Team:**
- **Architecture & Backend:** Server-side sync, data persistence
- **Frontend & UX:** Responsive design, photo management  
- **Network & Deployment:** Multi-device setup, troubleshooting

**Technologies:**
- **Backend:** Node.js, Express.js, Socket.IO
- **Frontend:** Vanilla JavaScript, CSS3, HTML5
- **Storage:** JSON file persistence, localStorage backup
- **Network:** WebSocket real-time communication

---

**🐂 Status: Production Ready voor StuDAY 2025!** ✅

**⚠️ For immediate support tijdens events: Check troubleshooting section of houdt deze README.md bij de hand.**

**Built with ❤️ voor het GRNDbrekers team - Veel success met jullie bull riding evenement!** 🎯
