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

## 🎯 **Wat doet deze app?**

De GRNDbrekers Bull Riding app is ontworpen voor **StuDAY 2025** en biedt:

- 📱 **Multi-device synchronisatie** - Werk op meerdere toestellen tegelijk
- 🏆 **Live leaderboard** - Toon rankings op een groot scherm
- ⏱️ **Tijdmeting** - Nauwkeurige bull riding tijden
- 🔄 **Realtime updates** - Alles sync automatisch tussen devices
- 📶 **Offline functionaliteit** - Werkt zonder internet via lokale WiFi

Perfect voor wedstrijden waarbij je:
- Riders toevoegt op je telefoon
- Tijden bijhoudt op een tablet  
- Het leaderboard toont op een groot scherm
- Alles automatisch gesynchroniseerd blijft

---

## 🚀 **Snel aan de slag**

### 📋 **Wat heb je nodig?**
- Laptop/PC (Windows, Mac of Linux)
- Node.js v16+ geïnstalleerd
- WiFi hotspot mogelijkheid
- Telefoon/tablet voor extra schermen

### ⚡ **5-minuten setup**

```bash
# 1. Download het project
git clone -b multi-device-setup https://github.com/SergeHanssens/grndbrekers-bull-studay2025.git
cd grndbrekers-bull-studay2025

# 2. Installeer dependencies  
npm install

# 3. Check of alles werkt
npm run doctor

# 4. Start de server
npm start
```

🎉 **Klaar!** Je server draait nu en toont de IP-adressen waar je mee kunt verbinden.

---

## 📱 **Devices verbinden**

### 🔥 **Stap 1: Maak hotspot**
Zet een WiFi hotspot aan op je laptop:
- **Naam**: `GRNDbrekers-Bull`  
- **Wachtwoord**: `studay2025`

### 📲 **Stap 2: Verbind toestellen** 
1. Verbind je telefoon/tablet met de `GRNDbrekers-Bull` WiFi
2. Open een browser en ga naar: `http://192.168.137.1:3000`
3. Kijk naar de groene status indicator (🟢) rechts bovenin

### 🖥️ **Stap 3: Setup schermen**
- **Hoofdscherm**: `http://192.168.137.1:3000` - Voor rider management
- **Leaderboard**: `http://192.168.137.1:3000/leaderboard.html` - Voor publiek

---

## 🔧 **Handige commando's**

```bash
npm start                 # Start de server
npm run doctor           # 🩺 Diagnose systeem problemen
npm run test-server      # ✅ Check of server werkt  
npm run test-clients     # 👥 Zie verbonden devices
npm run setup-firewall   # 🛡️ Configureer Windows firewall
npm run ip-info          # 🌐 Toon alle beschikbare IP's
```

---

## 🎮 **Hoe te gebruiken**

### 👤 **Riders toevoegen**
1. Open de hoofdpagina op je telefoon
2. Vul naam in en klik "Rider Toevoegen"  
3. Rider verschijnt automatisch op alle verbonden schermen

### ⏱️ **Tijden meten**
1. Selecteer een rider
2. Klik "Start Timer" wanneer de rit begint
3. Klik "Stop Timer" wanneer de rit eindigt
4. Tijd wordt automatisch toegevoegd aan leaderboard

### 🏆 **Leaderboard bekijken**
- Het leaderboard update automatisch op alle schermen
- Riders worden gesorteerd op beste tijd
- Perfect voor een groot scherm tijdens het evenement

---

## 🛠️ **Troubleshooting**

### 🚨 **Problemen? Start hier:**

```bash
npm run doctor
```

Dit script controleert automatisch:
- ✅ Node.js versie
- ✅ Netwerkverbindingen  
- ✅ Firewall instellingen
- ✅ Poort beschikbaarheid

### 📱 **GSM bereikt server niet?**

1. **Check je IP**: Gebruik het exacte IP uit de server console
2. **Firewall**: Run `.\firewall-setup.ps1` (Windows) of open poort 3000
3. **WiFi**: Zorg dat GSM verbonden is met `GRNDbrekers-Bull`
4. **Data**: Zet mobiele data en VPN uit

### 🔄 **Sync werkt niet?**

1. **Check status**: Kijk naar de groene/rode indicator rechts bovenin
2. **Herlaad pagina**: Soms helpt een refresh
3. **Debug console**: Druk F12 → Console voor error berichten

👉 **Meer hulp?** Zie [TROUBLESHOOTING.md](TROUBLESHOOTING.md) voor uitgebreide oplossingen

---

## 🏗️ **Technische details**

### 🔌 **Architectuur**
- **Backend**: Node.js + Express + Socket.IO
- **Frontend**: Vanilla HTML/CSS/JavaScript  
- **Sync**: Realtime via WebSockets
- **Storage**: LocalStorage + in-memory state

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

## 🎪 **Voor StuDAY 2025**

### 📋 **Setup checklist**
- [ ] Laptop volledig opgeladen
- [ ] `GRNDbrekers-Bull` hotspot actief
- [ ] Server gestart (`npm start`)
- [ ] Leaderboard scherm verbonden en getest
- [ ] Backup telefoon/tablet beschikbaar
- [ ] Firewall geconfigureerd

### 🎯 **Best practices**
- Test de setup vooraf op de locatie
- Houd laptop aangesloten op stroom
- Zorg voor backup internetverbinding indien nodig
- Download de QR code voor snelle WiFi verbinding

---

## 👥 **Support & bijdragen**

### 🐛 **Bug gevonden?**
Open een [issue](https://github.com/SergeHanssens/grndbrekers-bull-studay2025/issues) met:
- Browser en OS informatie
- Screenshot van de error
- Stappen om het probleem te reproduceren

### 💡 **Feature request?**
Suggesties zijn welkom! Open een [issue](https://github.com/SergeHanssens/grndbrekers-bull-studay2025/issues) met het `enhancement` label.

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

**🐂 Ready to ride? Laten we deze bull temmen! 🤠**

*Made with ❤️ for StuDAY 2025*

[![GitHub](https://img.shields.io/badge/GitHub-View%20Source-black?style=for-the-badge&logo=github)](https://github.com/SergeHanssens/grndbrekers-bull-studay2025)

</div>
