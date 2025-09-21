# 🛠️ GRNDbrekers Bull Riding - Troubleshooting Guide

## 🚨 Probleem: "Site niet bereikbaar" op mobiele telefoon

### ✅ **Meest voorkomende oorzaken en oplossingen:**

#### 🔥 **1. Firewall blokkeert verbinding (80% van problemen)**

**Symptomen:**
- Localhost:3000 werkt op computer
- Server toont juiste IP's in console
- Mobiel krijgt "site niet bereikbaar"

**Oplossing A: Automatische firewall fix**
```powershell
# In Administrator PowerShell:
.\firewall-setup.ps1
```

**Oplossing B: Handmatige firewall configuratie**
1. Windows → "Windows Defender Firewall"
2. "Allow an app through firewall" 
3. "Change settings" → "Allow another app"
4. Browse naar `C:\Program Files\nodejs\node.exe`
5. Vink "Private" EN "Public" aan
6. Herstart server: `npm start`

**Oplossing C: Tijdelijk firewall uitzetten (alleen voor test!)**
1. Windows Defender Firewall → "Turn Windows Defender Firewall on or off"
2. Schakel "Private networks" UIT
3. Test verbinding
4. **Zet firewall daarna weer AAN!**

---

#### 🔌 **2. Server bindt niet op alle interfaces**

**Symptomen:**
- Server start zonder errors
- Localhost werkt, externe IP's niet

**Check in sync-server.js:**
```javascript
// ❌ FOUT - bindt alleen op localhost:
server.listen(PORT, () => {

// ✅ CORRECT - bindt op alle interfaces:
server.listen(PORT, '0.0.0.0', () => {
```

---

#### 📱 **3. Mobiele telefoon verkeerd verbonden**

**Check mobiele WiFi instellingen:**
1. Ga naar WiFi instellingen op telefoon
2. Klik op "GRNDbrekers-Bull" → Details
3. Check IP-adres van telefoon:
   - ✅ **Goed:** `192.168.137.xxx` (Windows hotspot)
   - ✅ **Goed:** `192.168.43.xxx` (Android hotspot)  
   - ❌ **Fout:** `169.254.xxx.xxx` (geen DHCP)

**Als IP fout is:**
1. Vergeet WiFi netwerk
2. Verbind opnieuw met correcte wachtwoord
3. Herstart WiFi op telefoon

---

#### 🌐 **4. Browser/Cache problemen**

**Probeer:**
1. **Andere browser** (Chrome ipv Samsung Internet)
2. **Incognito modus** 
3. **Cache wissen** 
4. **Exacte URL typen:** `http://192.168.137.1:3000`
   - ⚠️ **Geen HTTPS!** (https:// werkt niet op lokale IP's zonder certificaat)

---

## 🔍 **Debugging Commands**

### **Server Status Check**
```powershell
# Check of server draait:
curl http://localhost:3000/health

# Zie alle verbonden clients:
curl http://localhost:3000/clients

# Zie debug info:
curl http://localhost:3000/api/debug
```

### **Netwerk Debugging**
```powershell
# Check welke IP's beschikbaar zijn:
ipconfig

# Check of hotspot draait:
netsh wlan show profiles

# Ping test naar telefoon (vervang XXX met telefoon IP):
ping 192.168.137.XXX
```

### **Browser Console (op telefoon)**
```javascript
// Test bereikbaarheid:
fetch('http://192.168.137.1:3000/health')
  .then(r => r.json())
  .then(data => console.log('✅ Server bereikbaar!', data))
  .catch(e => console.log('❌ Fout:', e))

// Check sync client:
window.debugSync()

// Forceer reconnect:
window.reconnectSync()
```

---

## 📊 **Stap-voor-stap Diagnose**

### **Niveau 1: Basis Checks ⭐**
1. ✅ Server start zonder errors → `npm start`
2. ✅ Localhost werkt → `http://localhost:3000`
3. ✅ Telefoon verbonden met juiste WiFi
4. ✅ Telefoon heeft correct IP-bereik

### **Niveau 2: Netwerk Tests ⭐⭐**
1. ✅ Health endpoint bereikbaar → `curl http://localhost:3000/health`
2. ✅ Server bindt op 0.0.0.0 → check console output
3. ✅ Firewall configuratie → run firewall script
4. ✅ Ping test laptop ↔ telefoon

### **Niveau 3: Geavanceerde Debug ⭐⭐⭐**
1. ✅ Socket.IO connections → check `/clients` endpoint
2. ✅ Browser developer tools op telefoon
3. ✅ Packet capture (Wireshark) als nodig
4. ✅ Alternative hotspot software

---

## 🎯 **Snelle Fix Checklist**

**Als je GSM de site niet kan bereiken:**

- [ ] 🔥 **Firewall script uitvoeren** → `.\firewall-setup.ps1`
- [ ] 🔌 **Server herstart** → `npm start`  
- [ ] 📱 **Correcte URL** → `http://192.168.137.1:3000` (geen https!)
- [ ] 🌐 **Andere browser** proberen op telefoon
- [ ] 🔄 **WiFi reconnect** op telefoon

**90% van problemen zijn opgelost met deze 5 stappen! ✅**

---

## 🚨 **Specific Error Messages**

### **"ERR_CONNECTION_REFUSED"**
- 🔥 **Firewall blokkeert** → Run firewall script
- 🔌 **Server niet op 0.0.0.0** → Fix server.listen()

### **"ERR_NETWORK_CHANGED"** 
- 📱 **WiFi wissel** → Reconnect met hotspot
- 🔄 **IP change** → Check `ipconfig` output

### **"ERR_CONNECTION_TIMED_OUT"**
- 🌐 **WiFi bereik** → Kom dichter bij laptop
- 🔌 **Server overload** → Herstart server

### **Socket.IO errors in console**
- 🔄 **Verkeerde server IP** → Check auto-detection
- 📱 **Client registration fails** → Check sync-client.js load

---

## 🔧 **Advanced Solutions**

### **Alternative Hotspot Methods**
```powershell
# Method 1: netsh (requires admin)
netsh wlan set hostednetwork mode=allow ssid=GRNDbrekers-Bull key=studay2025
netsh wlan start hostednetwork

# Method 2: Windows Mobile Hotspot GUI
# Settings → Network & Internet → Mobile hotspot
```

### **Alternative Testing**
```powershell
# Test with different port:
$env:PORT=8080; npm start

# Test with explicit binding:
# Edit sync-server.js: server.listen(3000, '192.168.137.1')
```

### **Network Isolation Issues**
Some Windows versions have "network isolation" that prevents hotspot clients from accessing the host. Fix:
```powershell
# Allow hotspot clients to access host:
netsh wlan set hostednetwork mode=allow ssid=GRNDbrekers-Bull key=studay2025
netsh interface ip set global icmpredirects=disabled
```

---

## 📞 **Still Having Issues?**

### **Collect Debug Info:**
1. Output from `npm start`
2. Output from `ipconfig`  
3. Screenshot of phone WiFi settings
4. Browser console errors from phone
5. Output from `curl http://localhost:3000/health`

### **Contact Methods:**
- GitHub Issues in repository
- Include all debug info above
- Specify: OS version, Node.js version, phone type

---

## 💡 **Pro Tips**

- **Use Chrome** on mobile (best compatibility)
- **Keep devices close** during testing (WiFi range)
- **One change at a time** (easier debugging)
- **Check server logs** continuously during testing
- **Reboot everything** if all else fails (laptop + phone)

**Most connection issues are Windows Firewall related! 🔥**
