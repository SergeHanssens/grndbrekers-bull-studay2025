# 🛠️ GRNDbrekers Bull Riding - Troubleshooting Guide

<div align="center">

![Troubleshooting](https://img.shields.io/badge/Troubleshooting-Expert%20Mode-orange?style=for-the-badge&logo=tools)

**Problemen met de Bull Riding Leaderboard App?**  
*Hier vind je oplossingen voor alle bekende problemen*

</div>

---

## 🚨 **NOODPROCEDURE - Start hier!**

Ervaar je problemen? Voer **altijd eerst** dit commando uit:

```bash
npm run doctor
```

Dit script controleert automatisch je systeem en toont een rapport zoals:

```
🩺 GRNDbrekers Bull Riding - System Doctor
=====================================================

✅ Node.js versie → PASS (v18.17.0)
✅ Netwerkinterfaces gevonden → PASS (192.168.137.1)
⚠️  Hotspot interface actief → WARN (Geen hotspot gedetecteerd)
❌ Poort 3000 beschikbaar → FAIL (bezet door ander proces)

📊 Score: 75% (3/4 checks passed)
🎯 Grade: GOOD

🔧 Recommendations:
   • Start een WiFi hotspot (SSID: GRNDbrekers-Bull)
   • Stop andere server: lsof -ti:3000 | xargs kill
```

Gebruik dit rapport om direct te zien wat er fout gaat!

---

## 📱 **Probleem: GSM kan server niet bereiken**

### 🔍 **Symptomen**
- Browser toont "Site niet bereikbaar" bij `http://192.168.137.1:3000`
- Verbinding time-out errors
- Pagina laadt helemaal niet

### ✅ **Oplossingen** (probeer in deze volgorde)

#### 1️⃣ **Check je WiFi verbinding**
```bash
# Op je GSM, controleer WiFi instellingen:
- Verbonden met: "GRNDbrekers-Bull" 
- Wachtwoord: "studay2025"
- IP range: 192.168.137.x (Windows) of 192.168.43.x (Android)
```

💡 **Als je IP als 169.x.x.x ziet → verbinding mislukt, herstart hotspot**

#### 2️⃣ **Gebruik het juiste IP adres**
```bash
# In de server console, zoek naar:
📱 Beschikbaar op: http://192.168.137.1:3000
🏠 Hoofdpagina: http://192.168.137.1:3000
📊 Leaderboard: http://192.168.137.1:3000/leaderboard.html
```

**Gebruik dit exacte IP-adres in je browser!**

#### 3️⃣ **Configureer je firewall**

**Windows:**
```powershell
# Open PowerShell als Administrator en run:
.\firewall-setup.ps1

# Of handmatig:
# Windows Defender Firewall → Toestaan van app → Node.js toevoegen
```

**Linux:**
```bash
sudo ufw allow 3000
# Of voor specifieke interface:
sudo ufw allow in on wlan0 to any port 3000
```

**macOS:**
```bash
# System Preferences → Security & Privacy → Firewall → Options
# Voeg Node.js toe aan toegestane apps
```

#### 4️⃣ **Zet mobiele data en VPN uit**
- Ga naar GSM instellingen
- Schakel mobiele data uit
- Disconnecteer van VPN
- Herstart je browser (gebruik incognito modus)

---

## 🔄 **Probleem: Synchronisatie werkt niet**

### 🔍 **Symptomen** 
- Pagina laadt, maar data wordt niet realtime gedeeld
- Nieuwe riders verschijnen niet op andere schermen
- Tijden worden niet gesynchroniseerd
- Rode status indicator (🔴) rechts bovenin

### ✅ **Oplossingen**

#### 1️⃣ **Check de browser console**
```bash
# Druk F12 → Console tab
# Kijk naar foutmeldingen zoals:
❌ WebSocket connection failed
❌ Socket.IO disconnected
❌ Failed to load sync-client.js
```

#### 2️⃣ **Controleer Socket.IO versies**
```bash
# In package.json, moet staan:
"socket.io": "4.7.5"

# In HTML bestanden, moet staan:
<script src="https://cdn.socket.io/4.7.5/socket.io.min.js"></script>
```

#### 3️⃣ **Force reconnect**
```javascript
// In browser console, run:
window.reconnectSync()

// Of check status:
window.debugSync()
```

#### 4️⃣ **Clear localStorage**
```javascript
// In browser console:
localStorage.clear()
location.reload()
```

#### 5️⃣ **Server restart**
```bash
# Stop server (Ctrl+C) en herstart:
npm start
```

---

## 🔥 **Probleem: Server start niet**

### 🔍 **Symptomen**
- `npm start` geeft foutmelding
- "Port already in use" errors
- "Module not found" errors

### ✅ **Oplossingen**

#### 1️⃣ **Dependencies probleem**
```bash
# Herinstalleer alles:
rm -rf node_modules package-lock.json
npm install

# Check Node.js versie:
node -v
# Moet minimaal v16.0.0 zijn
```

#### 2️⃣ **Poort 3000 bezet**
```bash
# Vind proces dat poort gebruikt:
lsof -ti:3000

# Kill het proces:
lsof -ti:3000 | xargs kill

# Of start op andere poort:
PORT=4000 npm start
```

#### 3️⃣ **File permissions (Linux/Mac)**
```bash
# Maak scripts uitvoerbaar:
chmod +x setup-wifi.sh
chmod +x scripts/doctor.js
```

---

## 👥 **Probleem: Verbonden clients niet zichtbaar**

### 🔍 **Symptomen**
- `/clients` endpoint toont lege lijst
- Server console toont geen verbindingen
- Devices lijken verbonden maar staan niet geregistreerd

### ✅ **Oplossingen**

#### 1️⃣ **Check client registratie**
```bash
# Open /clients endpoint:
http://192.168.137.1:3000/clients

# Moet tonen:
{
  "count": 2,
  "clients": [
    {
      "device": "Android (Chrome)",
      "screen": "/leaderboard.html",
      "ip": "192.168.137.15"
    }
  ]
}
```

#### 2️⃣ **Controleer sync-client.js loading**
```html
<!-- In HTML, moet staan: -->
<script src="https://cdn.socket.io/4.7.5/socket.io.min.js"></script>
<script src="sync-client.js"></script>
```

#### 3️⃣ **Force client registratie**
```javascript
// In browser console:
if (window.syncClient && window.syncClient.isConnected()) {
  socket.emit('registerClient', {
    name: navigator.userAgent,
    screen: window.location.pathname
  });
}
```

---

## 🌐 **Probleem: Hotspot werkt niet**

### 🔍 **Symptomen**
- WiFi "GRNDbrekers-Bull" niet zichtbaar
- Devices kunnen niet verbinden
- Server toont geen hotspot IP

### ✅ **Oplossingen**

#### **Windows:**
```bash
# Via Settings:
Settings → Network & Internet → Mobile hotspot
Name: GRNDbrekers-Bull
Password: studay2025

# Via Command Line:
netsh wlan set hostednetwork mode=allow ssid=GRNDbrekers-Bull key=studay2025
netsh wlan start hostednetwork
```

#### **Linux:**
```bash
# Gebruik NetworkManager:
./setup-wifi.sh

# Of handmatig:
nmcli device wifi hotspot ssid GRNDbrekers-Bull password studay2025
```

#### **macOS:**
```bash
# System Preferences → Sharing → Internet Sharing
# Share: WiFi
# To: WiFi
# WiFi Options: Name = GRNDbrekers-Bull, Password = studay2025
```

---

## 🔧 **Geavanceerde diagnostiek**

### 🩺 **System Doctor uitgebreid**
```bash
# Volledige diagnose:
npm run doctor

# Specifieke tests:
npm run test-server    # Server health check
npm run test-clients   # Client connectivity  
npm run ip-info        # Network interfaces
```

### 🌐 **Netwerk debugging**
```bash
# Check welke poorten open zijn:
netstat -tulpn | grep :3000

# Test verbinding vanaf andere device:
telnet 192.168.137.1 3000

# Check routing:
traceroute 192.168.137.1  # Linux/Mac
tracert 192.168.137.1     # Windows
```

### 📱 **Browser debugging**
```javascript
// In browser console - connection status:
console.log('Connected:', window.syncClient?.isConnected());
console.log('Status:', window.syncClient?.getStatus());

// Manual sync test:
window.manualSync();

// Debug mode:
localStorage.setItem('debug', 'true');
location.reload();
```

---

## 🚨 **Emergency procedures**

### 🔄 **Complete reset**
```bash
# 1. Stop alle processen
pkill -f node  # Of Ctrl+C in alle terminals

# 2. Clear alle data
rm -rf node_modules package-lock.json
localStorage.clear()  # In browser console

# 3. Fresh install
npm install
npm start
```

### 📱 **Backup connectivity**
```bash
# Als hotspot niet werkt, gebruik ethernet:
# Verbind laptop via ethernet kabel
# Deel internet via USB tethering of bluetooth

# Alternative port setup:
PORT=8080 npm start
# Gebruik dan: http://192.168.137.1:8080
```

---

## 📋 **Checklist voor StuDAY 2025**

### 🎯 **Pre-event test**
- [ ] `npm run doctor` → 90%+ score
- [ ] Hotspot actief → `GRNDbrekers-Bull` zichtbaar
- [ ] Server gestart → groene status indicators
- [ ] Meerdere devices getest → sync werkt
- [ ] Leaderboard scherm verbonden
- [ ] Backup devices klaar

### 🔋 **During event monitoring**
- [ ] Server console zichtbaar → monitor voor errors
- [ ] Verbonden clients zichtbaar → `/clients` bookmark
- [ ] Status indicators groen → op alle devices
- [ ] Backup hotspot gereed → Android/iPhone tethering

---

## 📞 **Laatste redmiddel**

Als niets werkt en je event begint over 5 minuten:

### 🆘 **Quick & dirty workaround**
```bash
# 1. Gebruik telefoon hotspot in plaats van laptop
# 2. Start server op telefoon hotspot IP
# 3. Gebruik één device voor alles
# 4. Noteer tijden handmatig als backup
# 5. Fix de setup na het event
```

### 📧 **Contact support**
- **GitHub Issues**: [Open een ticket](https://github.com/SergeHanssens/grndbrekers-bull-studay2025/issues)
- **Emergency**: Include screenshot van `npm run doctor` output
- **Details needed**: OS, browser, error messages, steps to reproduce

---

<div align="center">

**🐂 Geen paniek! Elke bull kan getempd worden 🤠**

*Deze gids lost 99% van alle problemen op*

</div>

---

## 📚 **Extra resources**

- 📖 [README.md](README.md) - Setup instructies
- 🌐 [Socket.IO Docs](https://socket.io/docs/) - Voor developers
- 🔧 [Node.js Troubleshooting](https://nodejs.org/en/docs/guides/debugging-getting-started/) - Geavanceerde debugging
- 🛜 [WiFi Hotspot Setup](https://support.microsoft.com/en-us/windows/use-your-windows-pc-as-a-mobile-hotspot-c89b0fad-72d5-41e8-f7ea-406ad9036b85) - Windows official guide

*Last updated: September 2025 for StuDAY 2025*
