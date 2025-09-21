# 🐂 GRNDbrekers Bull Riding - StuDay 2025
### 🏆 Multi-Device Leaderboard System

<div align="center">

![Bull Riding](https://img.shields.io/badge/Bull%20Riding-StuDAY%202025-red?style=for-the-badge&logo=activity)
![Status](https://img.shields.io/badge/Status-Ready%20to%20Ride-green?style=for-the-badge)
![Multi-Device](https://img.shields.io/badge/Multi--Device-WiFi%20Sync-blue?style=for-the-badge&logo=wifi)

**Een realtime leaderboard systeem voor Bull Riding wedstrijden**  
*Geen internetverbinding nodig - werkt volledig lokaal via WiFi hotspot*

</div>

---

## 🚨 **BELANGRIJK - Windows Firewall Setup**

> **⚠️ WINDOWS GEBRUIKERS: Deze stap is VERPLICHT voor mobiele toegang!**

Na installatie moet je **ALTIJD** de Windows Firewall configureren, anders kunnen telefoons/tablets niet verbinden met de server.

### 🛡️ **Firewall Setup (VERPLICHT op Windows):**

```powershell
# Open PowerShell als Administrator (Rechtermuisknop → "Run as Administrator")
.\firewall-setup.ps1
```

**Verwacht resultaat:**
```
🎉 Firewall successfully configured!
✅ Port 3000 is accessible
```

**⚠️ Zonder deze stap krijg je connect/disconnect problemen op mobiele devices!**

---

## 🚀 **Complete setup procedure**

### 📥 **Installatie**

```bash
# 1. Clone het project
git clone -b multi-device-setup https://github.com/SergeHanssens/grndbrekers-bull-studay2025.git
cd grndbrekers-bull-studay2025

# 2. Installeer dependencies  
npm install

# 3. 🩺 Controleer systeem (ALTIJD eerst doen)
npm run doctor
```

### 🛡️ **Firewall configuratie (Windows - VERPLICHT)**

```powershell
# Als Administrator PowerShell:
.\firewall-setup.ps1
```

### 🔥 **Hotspot setup**

**Windows 10/11:**
1. **Windows + I** → **Netwerk en internet** → **Mobiele hotspot**
2. Zet "Mobiele hotspot" **AAN**
3. Klik **"Bewerken"**:
   - Netwerknaam: `GRNDbrekers-Bull`
   - Wachtwoord: `studay2025`
4. **Opslaan**

### ✅ **Pre-flight check**

```bash
# Controleer of alles klaar is voor StuDAY:
npm run studay-ready
```

**Verwachte output:**
```
📊 Score: 92% (12/13 checks passed)
🎯 Grade: EXCELLENT
✅ Ready for StuDAY 2025!
```

### 🚀 **Start de server**

```bash
npm start
```

**Verwachte output:**
```
🔥 ⭐ HOTSPOT IP: http://192.168.137.1:3000 ⭐
📱 Test URL's op je telefoon:
   🏠 Hoofdpagina: http://192.168.137.1:3000
   📊 Leaderboard: http://192.168.137.1:3000/leaderboard.html
```

---

## 📱 **Devices verbinden**

### 📲 **Mobiele devices**
1. Verbind met WiFi: `GRNDbrekers-Bull` (wachtwoord: `studay2025`)
2. Open browser → ga naar IP uit server console (meestal `http://192.168.137.1:3000`)
3. **Controleer groene status indicator** (🟢) rechts bovenin
4. Test door een rider toe te voegen

### 🖥️ **Extra schermen**
- **Leaderboard display**: `http://192.168.137.1:3000/leaderboard.html`
- **Admin interface**: `http://192.168.137.1:3000`

---

## 🔧 **Troubleshooting**

### 🩺 **Eerste hulp:**

```bash
# Altijd eerst deze diagnose runnen:
npm run doctor
```

### 📱 **"GSM kan server niet bereiken"**

**99% van de gevallen: Firewall niet geconfigureerd**

```powershell
# Fix: Open PowerShell als Administrator
.\firewall-setup.ps1
```

**Andere checks:**
- Zorg dat GSM verbonden is met `GRNDbrekers-Bull` WiFi
- Gebruik exacte IP uit server console
- Zet mobiele data en VPN uit op telefoon

### 🔄 **"Verbinding valt steeds weg"**

**Symptoom:** Rode indicator, connect/disconnect cycling in server console

**Oplossing:** Firewall + Socket.IO CDN probleem:

```bash
# 1. Firewall fixen (Administrator PowerShell):
.\firewall-setup.ps1

# 2. Als het nog steeds niet werkt: download Socket.IO lokaal
# Op PC met internet: ga naar https://cdn.socket.io/4.7.5/socket.io.min.js
# Save as: socket.io.min.js in project folder
# Update HTML files: verander CDN naar lokaal bestand
```

### 🔥 **Server start niet**

```bash
# Dependencies opnieuw installeren:
npm run clean

# Poort bezet:
PORT=4000 npm start
```

👉 **Meer hulp?** Zie [TROUBLESHOOTING.md](TROUBLESHOOTING.md) voor uitgebreide oplossingen

---

## 🎪 **Voor StuDAY 2025 organisatoren**

### 📋 **Setup checklist**

```bash
# Volledige setup check:
npm run studay-ready
```

**Voor de wedstrijd:**
- [ ] `npm run doctor` → 90%+ score
- [ ] Firewall geconfigureerd (`.\\firewall-setup.ps1`)
- [ ] Hotspot actief (`GRNDbrekers-Bull`)
- [ ] Server start zonder errors (`npm start`)
- [ ] Telefoon verbindt met groene indicator
- [ ] Backup devices getest

### ⚡ **Quick commands**

```bash
npm run quick-setup     # Toon setup stappen
npm run studay-ready    # Pre-event check
npm run doctor          # Systeem diagnose
npm run test-clients    # Zie verbonden devices
npm start              # Start de server
```

### 🆘 **Emergency procedures**

**Als firewall script faalt:**
1. Windows + R → `wf.msc`
2. Inbound Rules → New Rule → Port → TCP → 3000 → Allow
3. Herhaal voor Outbound Rules

**Als hotspot niet werkt:**
- Gebruik telefoon hotspot als backup
- Of ethernet + internetdeling

---

## 🛠️ **Technische details**

### 🔌 **Architectuur**
- **Backend**: Node.js + Express + Socket.IO
- **Frontend**: Vanilla HTML/CSS/JavaScript  
- **Sync**: Realtime via WebSockets
- **Storage**: LocalStorage + in-memory state
- **Networking**: WiFi hotspot (192.168.137.x)

### 📊 **Features**
- ✅ Cross-platform hotspot support (Windows/Linux/Mac)
- ✅ Automatische IP detectie en server discovery
- ✅ Offline-first met localStorage fallback
- ✅ Visual connection status indicators
- ✅ Intelligent reconnection met exponential backoff
- ✅ Platform-specific firewall configuration
- ✅ Comprehensive system diagnostics

### 🔧 **Debug endpoints**
- `/health` - Server status en uptime
- `/clients` - Overzicht verbonden devices
- `/api/state` - Huidige applicatie state
- `/api/debug` - Volledige debug informatie

---

## 📁 **Project structuur**

```
grndbrekers-bull-studay2025/
├── 🏠 index.html              # Hoofdscherm (rider management)
├── 🏆 leaderboard.html        # Leaderboard display  
├── 🚀 sync-server.js          # Express server + Socket.IO
├── 📱 sync-client.js          # Client sync logic
├── 🛡️ firewall-setup.ps1      # Windows firewall configuratie
├── 🐧 setup-wifi.sh           # Linux hotspot script
├── 📦 package.json            # Dependencies en scripts
├── 📖 README.md               # Deze documentatie
├── 🛠️ TROUBLESHOOTING.md      # Probleemoplossing gids
└── 📁 scripts/
    └── 🩺 doctor.js           # Systeem diagnose tool
```

---

## 🚨 **Veelgemaakte fouten**

### ❌ **"npm start, maar telefoon kan niet verbinden"**
**Oorzaak:** Firewall niet geconfigureerd (95% van de gevallen)  
**Oplossing:** `.\\firewall-setup.ps1` als Administrator

### ❌ **"Verbinding valt steeds weg"**
**Oorzaak:** Socket.IO CDN kan niet laden (hotspot heeft geen internet)  
**Oplossing:** Download Socket.IO lokaal + update HTML files

### ❌ **"Server start niet"**
**Oorzaak:** Dependencies niet geïnstalleerd of poort bezet  
**Oplossing:** `npm install` of `PORT=4000 npm start`

### ❌ **"Doctor score laag"**
**Oorzaak:** Hotspot niet actief of firewall geblokkeerd  
**Oplossing:** Check hotspot + run firewall script

---

## 👥 **Support & bijdragen**

### 🐛 **Problemen tijdens StuDAY 2025?**

1. **Run altijd eerst:** `npm run doctor`
2. **Check firewall:** `.\\firewall-setup.ps1` (Administrator)
3. **Bekijk server console** voor foutmeldingen
4. **Check TROUBLESHOOTING.md** voor specifieke errors

### 💡 **Bug reports**
Open een [issue](https://github.com/SergeHanssens/grndbrekers-bull-studay2025/issues) met:
- `npm run doctor` output
- Server console logs
- Browser console errors (F12)
- OS en browser info

---

## 📜 **Licentie**

```
MIT License © 2025 Serge Hanssens

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

---

<div align="center">

**🐂 Ready to ride? Let's tame this bull! 🤠**

*Made with ❤️ for StuDAY 2025*

[![GitHub](https://img.shields.io/badge/GitHub-View%20Source-black?style=for-the-badge&logo=github)](https://github.com/SergeHanssens/grndbrekers-bull-studay2025)

</div>
