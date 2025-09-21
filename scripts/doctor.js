#!/usr/bin/env node

// 🩺 GRNDbrekers Bull Riding - System Doctor
// Automatische diagnose van veelvoorkomende problemen

const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

console.log('🐂 GRNDbrekers Bull Riding - System Doctor');
console.log('==========================================\n');

let issues = [];
let warnings = [];
let success = [];

// 🔍 Helper functions
function runCommand(cmd, description) {
  try {
    const output = execSync(cmd, { encoding: 'utf8', stdio: 'pipe' });
    return output.trim();
  } catch (error) {
    return null;
  }
}

function checkFile(filePath, description) {
  if (fs.existsSync(filePath)) {
    success.push(`✅ ${description}`);
    return true;
  } else {
    issues.push(`❌ ${description} - Bestand niet gevonden: ${filePath}`);
    return false;
  }
}

function getNetworkInterfaces() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  
  Object.keys(interfaces).forEach((interfaceName) => {
    interfaces[interfaceName].forEach((interface) => {
      if (interface.family === 'IPv4' && !interface.internal) {
        ips.push({
          name: interfaceName,
          ip: interface.address,
          isHotspot: interface.address.startsWith('192.168.137') || 
                     interface.address.startsWith('192.168.43') || 
                     interface.address.startsWith('10.0.0')
        });
      }
    });
  });
  
  return ips;
}

// 🔍 System Checks
console.log('🔍 Systeem Controles...\n');

// Check Node.js version
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
if (majorVersion >= 16) {
  success.push(`✅ Node.js versie: ${nodeVersion}`);
} else {
  issues.push(`❌ Node.js versie te oud: ${nodeVersion} (minimaal v16 vereist)`);
}

// Check NPM
const npmVersion = runCommand('npm --version', 'NPM versie check');
if (npmVersion) {
  success.push(`✅ NPM versie: ${npmVersion}`);
} else {
  issues.push(`❌ NPM niet gevonden of niet werkend`);
}

// Check OS
const platform = os.platform();
const release = os.release();
success.push(`✅ Besturingssysteem: ${platform} ${release}`);

// 📁 File Checks
console.log('📁 Bestanden Controles...\n');

checkFile('package.json', 'package.json bestaat');
checkFile('sync-server.js', 'sync-server.js bestaat');
checkFile('sync-client.js', 'sync-client.js bestaat');
checkFile('index.html', 'index.html bestaat');
checkFile('leaderboard.html', 'leaderboard.html bestaat');

// Check if node_modules exists
if (fs.existsSync('node_modules')) {
  success.push('✅ node_modules map bestaat');
  
  // Check specific dependencies
  if (fs.existsSync('node_modules/express')) {
    success.push('✅ Express dependency geïnstalleerd');
  } else {
    issues.push('❌ Express dependency ontbreekt - run: npm install');
  }
  
  if (fs.existsSync('node_modules/socket.io')) {
    success.push('✅ Socket.IO dependency geïnstalleerd');
  } else {
    issues.push('❌ Socket.IO dependency ontbreekt - run: npm install');
  }
} else {
  issues.push('❌ node_modules ontbreekt - run: npm install');
}

// 🌐 Network Checks  
console.log('🌐 Netwerk Controles...\n');

const interfaces = getNetworkInterfaces();
if (interfaces.length > 0) {
  success.push('✅ Netwerkinterfaces gevonden:');
  interfaces.forEach(iface => {
    const hotspotMarker = iface.isHotspot ? ' 🔥 (HOTSPOT)' : '';
    success.push(`   📶 ${iface.name}: ${iface.ip}${hotspotMarker}`);
  });
} else {
  warnings.push('⚠️ Geen externe netwerkinterfaces gevonden');
}

// Check if port 3000 is available
const portCheck = runCommand('netstat -an | findstr :3000', 'Port 3000 check') || 
                  runCommand('lsof -i :3000', 'Port 3000 check (Unix)');
if (portCheck) {
  warnings.push('⚠️ Port 3000 mogelijk in gebruik:');
  warnings.push(`   ${portCheck}`);
} else {
  success.push('✅ Port 3000 beschikbaar');
}

// 🔥 Windows Specific Checks
if (platform === 'win32') {
  console.log('🔥 Windows Specifieke Controles...\n');
  
  // Check PowerShell execution policy
  const execPolicy = runCommand('powershell "Get-ExecutionPolicy"', 'PowerShell execution policy');
  if (execPolicy && !execPolicy.includes('Restricted')) {
    success.push(`✅ PowerShell execution policy: ${execPolicy}`);
  } else {
    warnings.push('⚠️ PowerShell execution policy is Restricted');
    warnings.push('   Fix: Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser');
  }
  
  // Check if firewall script exists
  if (checkFile('firewall-setup.ps1', 'Firewall setup script')) {
    success.push('✅ Firewall setup script beschikbaar');
  }
  
  // Check Windows version for hotspot support
  const winVersion = os.release();
  if (parseFloat(winVersion) >= 10.0) {
    success.push('✅ Windows versie ondersteunt Mobile Hotspot');
  } else {
    warnings.push('⚠️ Oude Windows versie - Mobile Hotspot mogelijk niet beschikbaar');
  }
}

// 🐧 Linux Specific Checks
if (platform === 'linux') {
  console.log('🐧 Linux Specifieke Controles...\n');
  
  // Check NetworkManager
  const nmcli = runCommand('which nmcli', 'NetworkManager check');
  if (nmcli) {
    success.push('✅ NetworkManager (nmcli) beschikbaar');
  } else {
    issues.push('❌ NetworkManager niet geïnstalleerd - apt install network-manager');
  }
  
  // Check setup-wifi.sh
  if (checkFile('setup-wifi.sh', 'WiFi setup script')) {
    const scriptPerms = fs.statSync('setup-wifi.sh').mode;
    if (scriptPerms & parseInt('100', 8)) {
      success.push('✅ setup-wifi.sh is uitvoerbaar');
    } else {
      warnings.push('⚠️ setup-wifi.sh niet uitvoerbaar - run: chmod +x setup-wifi.sh');
    }
  }
}

// 📊 Configuration Checks
console.log('📊 Configuratie Controles...\n');

// Check sync-server.js configuration
if (fs.existsSync('sync-server.js')) {
  const serverContent = fs.readFileSync('sync-server.js', 'utf8');
  
  if (serverContent.includes("'0.0.0.0'")) {
    success.push('✅ Server bindt op alle interfaces (0.0.0.0)');
  } else {
    issues.push('❌ Server bindt mogelijk alleen op localhost');
    issues.push('   Fix: server.listen(PORT, \'0.0.0.0\', () => {');
  }
  
  if (serverContent.includes('socket.io')) {
    success.push('✅ Socket.IO configuratie gevonden');
  } else {
    issues.push('❌ Socket.IO configuratie ontbreekt in sync-server.js');
  }
}

// 🩺 Generate Report
console.log('\n🩺 DIAGNOSE RAPPORT');
console.log('==================\n');

if (success.length > 0) {
  console.log('✅ WERKEND:');
  success.forEach(item => console.log(item));
  console.log('');
}

if (warnings.length > 0) {
  console.log('⚠️ WAARSCHUWINGEN:');
  warnings.forEach(item => console.log(item));
  console.log('');
}

if (issues.length > 0) {
  console.log('❌ PROBLEMEN:');
  issues.forEach(item => console.log(item));
  console.log('');
}

// 🎯 Recommendations
console.log('🎯 AANBEVELINGEN:\n');

if (issues.length === 0) {
  console.log('🎉 Geen kritieke problemen gevonden!');
  console.log('🚀 Je kunt de server starten met: npm start');
  
  const hotspotIPs = interfaces.filter(i => i.isHotspot);
  if (hotspotIPs.length > 0) {
    console.log('📱 Test op mobiel met:');
    hotspotIPs.forEach(ip => {
      console.log(`   http://${ip.ip}:3000`);
    });
  } else {
    console.log('💡 Zet eerst je WiFi hotspot op voor mobiele toegang');
  }
} else {
  console.log('🔧 Los eerst deze problemen op:');
  console.log('1. Run: npm install (als dependencies ontbreken)');
  if (platform === 'win32') {
    console.log('2. Run: npm run setup-firewall (voor Windows firewall)');
  }
  console.log('3. Check TROUBLESHOOTING.md voor gedetailleerde hulp');
}

console.log('\n🔍 Voor meer debug info:');
console.log('   npm run test-server    # Check server health');
console.log('   npm run test-clients   # Check connected clients');
console.log('   npm run ip-info        # Show all network IPs');

// 📊 Summary
const totalChecks = success.length + warnings.length + issues.length;
const score = Math.round((success.length / totalChecks) * 100);

console.log(`\n📊 SCORE: ${score}% (${success.length}/${totalChecks} checks passed)`);

if (score >= 90) {
  console.log('🏆 Uitstekend! Systeem is klaar voor gebruik.');
} else if (score >= 70) {
  console.log('👍 Goed! Kleine aanpassingen kunnen helpen.');
} else {
  console.log('⚠️ Aandacht vereist. Check bovenstaande problemen.');
}

console.log('\n🐂 GRNDbrekers Bull Riding Doctor - Klaar! 🩺');

// Exit with error code if critical issues found
process.exit(issues.length > 0 ? 1 : 0);
