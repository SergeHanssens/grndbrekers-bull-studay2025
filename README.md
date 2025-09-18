# GRNDbrekers Rodeo Bull PWA - StuDAY 2025

Een Progressive Web App voor het bijhouden van mechanische stier rijtijden tijdens StuDAY 2025, ontwikkeld door/voor **GRNDbrekers** - de makerspace van JC Bouckenborgh.

*"Think like an engineer, build like a lunatic"* - GRNDbrekers motto

## 🖼️ **Logo & Images Setup**

Deze app haalt het logo en iconen op van een **images branch**. Zo setup je dit:

### **Stap 1: Maak Images Branch**
```bash
# In je repository:
git checkout -b images
```

### **Stap 2: Upload Bestanden**
Upload deze bestanden naar de **images branch**:
- `grndbrekers-bull-logo.jpg` - Hoofd logo (bij voorkeur 300x180px of vergelijkbare ratio)
- `icon-192.png` - App icoon 192x192px
- `icon-512.png` - App icoon 512x512px

### **Stap 3: Update Paths in Code**
Vervang in `index.html` en `manifest.json`:
```
username/repo-name
```
Door je echte GitHub username en repository naam.

**Voorbeeld:**
```
https://raw.githubusercontent.com/johndoe/grndbrekers-bull/images/grndbrekers-bull-logo.jpg
```

## 🔧 **Troubleshooting Images**

**Logo laadt niet:**
1. Check of `images` branch bestaat en gepushed is
2. Controleer bestandsnamen (exact spelling)
3. Test URL rechtstreeks in browser: `https://raw.githubusercontent.com/username/repo-name/images/grndbrekers-bull-logo.jpg`
4. Zorg dat images branch **public** is (bij private repos werkt raw.githubusercontent.com niet)

**Icons verschijnen niet bij installatie:**
1. Controleer PNG formaat (geen JPG voor iconen)
2. Exacte afmetingen: 192x192 en 512x512 pixels
3. Test manifest.json via Developer Tools → Application → Manifest

**Quick Test:**
```bash
# Test of je images branch goed is:
curl -I https://raw.githubusercontent.com/username/repo-name/images/grndbrekers-bull-logo.jpg
# Moet "200 OK" teruggeven
```

## 🛠️ Over GRNDbrekers & JC Bouckenborgh

**GRNDbrekers** is een makerspace project dat in 2020 startte in JC Bouckenborgh, waarbij een gezamenlijke werkruimte wordt uitgebouwd voor het maken, leren, verkennen en delen. Van hightech machines tot papier en karton - het draait allemaal rond de maker-mindset om iets uit het niets te creëren.

### 🎯 Missie & Visie
- **Credo**: "We bedenken, we proberen, we falen, en proberen het opnieuw, tot we hebben gemaakt wat we wilden"
- **STEM Focus**: Voorbereiden op kritische vaardigheden van de 21e eeuw (Science, Technology, Engineering, Math)
- **Community**: Elkaar helpen en kennis delen staat centraal
- **Praktisch leren**: Kritisch denkvermogen en zelfvertrouwen vergroten

### 📍 Locaties
GRNDbrekers werkt samen op **3 locaties** in Merksem:
1. **JC Bouckenborgh** - Bredabaan 559, 2170 Merksem
2. **CO Merksem Dok** - Emiel Lemineurstraat 72, 2170 Merksem  
3. **Bib Park** - Bibliotheek Park
4. **Broedplaats Borrewater** - Borrewaterstraat 1, 2170 Antwerpen (nieuwste locatie)

### 🔧 Makerspace Equipment
- **3D-printers** voor rapid prototyping
- **Lasersnijders** voor precisie werk
- **Snijplotters** voor vinyl en textiel
- **Soldeerbouten** en electronica tools
- **Arduino's** en microcontrollers
- En nog veel meer hightech apparatuur!

## 🎪 StuDAY 2025 Context

## 📚 GRNDbrekers Programma's

### #openGRND - Open Toegang Momenten
**Iedereen welkom, met of zonder voorkennis!**
- **Waar**: Broedplaats Borrewater (Borrewaterstraat 1)
- **Wanneer**: 
  - Woensdag: 13u-17u
  - Vrijdag: 17u-22u  
  - Zaterdag: 13u-18u
- **Wat**: Kennismaking met 3D-printers, snijplotters, lasercutter en community

### GRNDbrekers Basisworkshops
**5 workshops per trimester** (jan/mei/sept) - gratis voor abonnees
Ontwikkeld om je snel vertrouwd te maken met basis maker-skills

### IJSbrekers - Voor Kinderen  
**Elke 1ste woensdag** (13u-16u) voor **5de & 6de leerjaar**
Open kennismaking met voorproefje van alle makerspace mogelijkheden

### GRNDrepair - Repair Café
**Elke 1ste en 3de woensdag** (19u-23u) 
Zelf proberen herstellen, van elkaar leren, kleinere elektronica & digitale toestellen

### Trajecten & Lange Projecten
Voor wie zich wil verdiepen na de basisworkshops - langere projecten en specialisaties

## 💰 Toegang & Tarieven
- **Abonnement**: Per trimester (4 maanden) - meest voordelig
- **Basisworkshops**: Gratis voor abonnees
- **Vrijwilligerswerk**: Mogelijk voor korting
- [Volledige prijzen](https://bouckenborgh.be/wp-content/uploads/2021/08/GRNDbrekers-prijzen.pdf)

## 🚀 Deployment op GitHub Pages

### **Stap 1: Repository aanmaken**
1. Ga naar [GitHub.com](https://github.com) en maak een nieuwe repository
2. Geef het een naam zoals `grndbrekers-bull-leaderboard`
3. Zorg dat het **public** is (voor gratis GitHub Pages én image loading)

### **Stap 2: Images Branch Setup**
1. **Eerst**: Maak je `images` branch en upload logo bestanden
2. **Dan**: Update de image paths in `index.html` en `manifest.json` met je username/repo-name
3. Test of images laden via: `https://raw.githubusercontent.com/username/repo-name/images/grndbrekers-bull-logo.jpg`

### **Stap 3: Main Bestanden uploaden**
Upload deze bestanden naar je **main branch**:
- `index.html` (de hoofdapplicatie)
- `manifest.json` (PWA configuratie)
- `sw.js` (Service Worker voor offline functionaliteit)
- `README.md` (deze instructies)

### Stap 3: GitHub Pages activeren
1. Ga naar je repository → **Settings**
2. Scroll naar **Pages** sectie
3. Bij **Source** kies: **Deploy from a branch**
4. Kies **main branch** en **/ (root)**
5. Klik **Save**

### Stap 4: App bereiken
Na enkele minuten is je app beschikbaar op:
```
https://jouwusername.github.io/rodeo-bull-app
```

## 📱 App Installatie op Mobiel

### iPhone (Safari):
1. Open de URL in Safari
2. Tik op het "Deel" icoon (vierkant met pijl omhoog)
3. Selecteer "Voeg toe aan beginscherm"
4. Bevestig de naam en tik "Voeg toe"

### Android (Chrome):
1. Open de URL in Chrome
2. Tik op de drie punten menu (⋮)
3. Selecteer "App installeren" of "Toevoegen aan startscherm"
4. Bevestig de installatie

## 🎯 Functies

- **Offline werking**: App werkt zonder internetverbinding
- **Leaderboard**: Top 10 rijtijden opgeslagen in browser
- **Foto's**: Maak foto's van rijders (camera toegang vereist)
- **Responsive**: Werkt op alle schermgroottes
- **PWA**: Installeerbaar als native app

## 🛠️ Technische Details

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Storage**: localStorage voor persistente data
- **Camera**: File API met capture attribuut
- **Offline**: Service Worker voor caching
- **Responsive**: CSS Grid & Flexbox

## 🔧 Aanpassingen voor Andere Makerspaces

### Logo's & Branding Wijzigen:
```html
<!-- In index.html, pas aan naar jouw makerspace -->
<div class="main-title">🛠️ [Jouw Makerspace] 🐂</div>
<div class="subtitle">[Jouw Organisatie]</div>
<div class="motto">"[Jouw Motto]"</div>
```

### Kleuren Aanpassen:
```css
/* Vervang in CSS voor eigen huisstijl */
--primary-color: #4CAF50;
--accent-color: #FFD700; /* GRNDbrekers goud */
--background-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

### Manifest.json Updaten:
Vervang de SVG data in `manifest.json` voor eigen logo's en naam

## 🛠️ Open Source & Maker Philosophy

Deze app is ontwikkeld in de **open source spirit van makerspaces** wereldwijd. Volgens de GRNDbrekers filosofie:

*"We bedenken, we proberen, we falen, en proberen het opnieuw, tot we hebben gemaakt wat we wilden"*

**MIT License** betekent:
- ✅ Andere makerspaces mogen het gebruiken
- ✅ Aanpassingen en verbeteringen zijn toegestaan  
- ✅ Commercieel gebruik voor goede doelen
- ✅ Delen van kennis en code - typisch makerspace gedrag!
- ✅ **Attribution**: Vermeld GRNDbrekers/JC Bouckenborgh als originele makers

## 🤝 Community & Samenwerking

Net zoals GRNDbrekers samenwerkt met **CO Merksem Dok** en **Bib Park**, moedigen we andere makerspaces aan om:
- Deze code te forken en aan te passen
- Verbeteringen terug te contribueren
- Ervaringen te delen via GitHub issues
- Contact op te nemen voor samenwerkingen

### Voor Studenten & Makers
Deze app toont hoe **STEM vaardigheden** (programmeren, UX design, PWA technologie) gebruikt kunnen worden voor **echte projecten** die een community dienen. Perfect leermateriaal voor:
- **Web development** workshops
- **Progressive Web App** cursussen  
- **Arduino/IoT** uitbreidingen (sensor integratie)
- **Design thinking** exercises

## 📖 **Gebruikersgids**

### Voor Event Organizers:
1. **Setup**: Open app en ga naar "Start Leaderboard!"
2. **Pre-Event**: Voeg alle verwachte deelnemers toe in "Voeg Rijders Toe"
3. **During Event**: Ga naar "Naar Tijden" en selecteer rijder uit dropdown
4. **Real-time**: Bekijk leaderboard voor live standings
5. **Reset**: Gebruik "Reset Alles" knop voor nieuw event

### Voor Deelnemers:
1. **Registratie**: Zorg dat je naam is toegevoegd door organizer
2. **Na je rit**: Organizer selecteert jouw naam en voegt tijd toe
3. **Resultaten**: Check live leaderboard voor je positie
4. **Installatie**: Installeer app op je telefoon via browser menu

### Keyboard Shortcuts:
- **Enter** in naamveld = voeg rijder toe
- **Enter** in tijdvelden = voeg tijd toe
- **Dropdown navigatie** met pijltjestoetsen

## 🔒 Privacy

- Alle data blijft lokaal op het apparaat
- Foto's worden niet geüpload naar servers
- Geen tracking of analytics geïmplementeerd

## 🐛 Troubleshooting

**App laadt niet:**
- Controleer GitHub Pages status in repository Settings
- Wacht tot 10 minuten na eerste deployment

**Camera werkt niet:**
- Controleer of HTTPS wordt gebruikt (vereist voor camera)
- GitHub Pages gebruikt automatisch HTTPS

**Data verdwenen:**
- localStorage wordt soms gewist door browser
- Implementeer export/import functie indien gewenst

## 📱 Browser Ondersteuning

- ✅ Chrome (Android/Desktop)
- ✅ Safari (iOS/macOS)  
- ✅ Firefox (Android/Desktop)
- ✅ Edge (Desktop/Mobile)

Minimum versies: Chrome 60+, Safari 12+, Firefox 60+, Edge 79+
