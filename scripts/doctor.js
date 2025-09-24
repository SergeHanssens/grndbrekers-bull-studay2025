#!/usr/bin/env node

// 🩺 GRNDbrekers Bull Riding - System Doctor
// Cross-platform diagnose tool voor veelvoorkomende problemen

const { execSync } = require('child_process');
const os = require('os');
const net = require('net');
const fs = require('fs');
const path = require('path');

// 🎨 COLORS & STYLING
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function colorize(text, color) {
  return process.stdout.isTTY ? `${colors[color]}${text}${colors.reset}` : text;
}

// 📊 SCORE TRACKING
let totalChecks = 0;
let passedChecks = 0;
let warnings = [];
let recommendations = [];

// 🔧 HELPERS
function runCommand(cmd, options = {}) {
  try {
    const result = execSync(cmd, { 
      stdio: ['pipe', 'pipe', 'ignore'],
      timeout: 5000,
      ...options
    }).toString().trim();
    return result;
  } catch (error) {
    return null;
  }
}

function logCheck(name, result, info = '', isWarning = false) {
  totalChecks++;
  if (result) passedChecks++;
  
  const symbol = result ? '✅' : (isWarning ? '⚠️' : '❌');
  const status = result ? colorize('PASS', 'green') : 
                 isWarning ? colorize('WARN', 'yellow') : 
                 colorize('FAIL', 'red');
  
  console.log(`${symbol} ${colorize(name, 'bright')} → ${status}${info ? ` (${info})` : ''}`);
  
  if (!result && !isWarning) {
    recommendations.push(`Fix: ${name}`);
  } else if (isWarning) {
    warnings.push(`Check: ${name} - ${info}`);
  }
}

function logInfo(message) {
  console.log(`💡 ${colorize(message, 'cyan')}`);
}

function logSection(title) {
  console.log(`\n${colorize('═'.repeat(50), 'blue')}`);
  console.log(`${colorize(`🔍 ${title}`, 'bright')}`);
  console.log(`${colorize('═'.repeat(50), 'blue')}`);
}

// 🔍 CHECK FUNCTIONS
function checkNodeVersion() {
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.replace('v', '').split('.')[0]);
  const isSupported = majorVersion >= 16;
  
  logCheck('Node.js versie', isSupported, `${nodeVersion} (min: v16)`);
  
  if (!isSupported) {
    recommendations.push('Update Node.js naar versie 16 of hoger');
  }
}

function checkDependencies() {
  const packagePath = path.join(process.cwd(), 'package.json');
  
  if (!fs.existsSync(packagePath)) {
    logCheck('package.json bestaat', false, 'Niet gevonden');
    return;
  }
  
  logCheck('package.json bestaat', true, 'Gevonden');
  
  const nodeModulesExists = fs.existsSync(path.join(process.cwd(), 'node_modules'));
  logCheck('Dependencies geïnstalleerd', nodeModulesExists, nodeModulesExists ? 'node_modules aanwezig' : 'Run: npm install');
  
  if (!nodeModulesExists) {
    recommendations.push('Run: npm install');
  }
}

function checkRequiredFiles() {
  const requiredFiles = [
    'index.html',
    'leaderboard.html', 
    'sync-server.js',
    'sync-client.js'
  ];
  
  let allFilesExist = true;
  
  requiredFiles.forEach(file => {
    const exists = fs.existsSync(file);
    logCheck(`${file} bestaat`, exists);
    if (!exists) allFilesExist = false;
  });
  
  return allFilesExist;
}

function checkNetworkInterfaces() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  let hotspotFound = false;
  
  for (const name in interfaces) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push({
          name: name,
          address: iface.address,
          isHotspot: iface.address.startsWith('192.168.137.') || 
                    iface.address.startsWith('192.168.43.') ||
                    iface.address.startsWith('192.168.4.')
        });
        
        if (iface.address.startsWith('192.168.137.') || 
            iface.address.startsWith('192.168.43.')) {
          hotspotFound = true;
        }
      }
    }
  }
  
  logCheck('Netwerkinterfaces gevonden', addresses.length > 0, `${addresses.length} interface(s)`);
  logCheck('Hotspot interface actief', hotspotFound, hotspotFound ? 'Hotspot IP gevonden' : 'Geen hotspot gedetecteerd', !hotspotFound);
  
  if (addresses.length > 0) {
    logInfo('Beschikbare IP-adressen:');
    addresses.forEach(addr => {
      const indicator = addr.isHotspot ? '🔥 (HOTSPOT)' : '📍';
      console.log(`   ${indicator} ${addr.name}: ${colorize(addr.address, 'green')}`);
    });
  }
  
  if (!hotspotFound) {
    recommendations.push('Start een WiFi hotspot (SSID: GRNDbrekers-Bull, Password: studay2025)');
  }
}

function checkPort(port, callback) {
  const tester = net.createServer()
    .once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        callback(false, 'Port in gebruik');
      } else {
        callback(false, `Error: ${err.code}`);
      }
    })
    .once('listening', () => {
      tester.once('close', () => {
        callback(true, 'Beschikbaar');
      }).close();
    })
    .listen(port);
}

function checkPorts() {
  return new Promise((resolve) => {
    checkPort(3000, (available, reason) => {
      logCheck('Poort 3000 beschikbaar', available, reason);
      
      if (!available && reason === 'Port in gebruik') {
        logInfo('Andere opties:');
        console.log('   • Stop andere server: lsof -ti:3000 | xargs kill');
        console.log('   • Gebruik andere poort: PORT=4000 npm start');
        recommendations.push('Maak poort 3000 vrij of gebruik PORT=4000 npm start');
      }
      
      resolve();
    });
  });
}

function checkFirewall() {
  const platform = os.platform();
  
  if (platform === 'win32') {
    checkWindowsFirewall();
  } else if (platform === 'linux') {
    checkLinuxFirewall();
  } else if (platform === 'darwin') {
    checkMacFirewall();
  } else {
    logCheck('Firewall check', true, `Platform ${platform} niet ondersteund`, true);
  }
}

async function checkWindowsFirewall() {
    try {
        // Check multiple possible rule names
        const ruleNames = [
            'GRNDbrekers Bull Riding*',
            'Node.js*',
            'nodejs*'
        ];
        
        let rulesFound = [];
        
        for (const ruleName of ruleNames) {
            const result = execSync(
                `powershell "Get-NetFirewallRule -DisplayName '${ruleName}' -ErrorAction SilentlyContinue | Select-Object DisplayName, Enabled"`,
                { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
            );
            
            if (result.trim()) {
                const lines = result.trim().split('\n').slice(2); // Skip headers
                for (const line of lines) {
                    if (line.trim() && !line.includes('DisplayName') && !line.includes('-------')) {
                        const parts = line.trim().split(/\s+/);
                        if (parts.length >= 2) {
                            const displayName = parts.slice(0, -1).join(' ');
                            const enabled = parts[parts.length - 1];
                            rulesFound.push({ name: displayName, enabled: enabled === 'True' });
                        }
                    }
                }
            }
        }
        
        if (rulesFound.length > 0) {
            const enabledRules = rulesFound.filter(rule => rule.enabled);
            if (enabledRules.length > 0) {
                return {
                    status: 'PASS',
                    message: `${enabledRules.length} firewall regel(s) actief`,
                    details: enabledRules.map(rule => `   • ${rule.name} - ✅ ENABLED`).join('\n')
                };
            } else {
                return {
                    status: 'WARN', 
                    message: `${rulesFound.length} regel(s) gevonden maar uitgeschakeld`
                };
            }
        } else {
            return {
                status: 'FAIL',
                message: 'Geen Node.js/GRNDbrekers firewall regels gevonden'
            };
        }
        
    } catch (error) {
        return {
            status: 'WARN',
            message: 'Kon firewall status niet controleren'
        };
    }
}

function checkLinuxFirewall() {
  const ufwStatus = runCommand('ufw status');
  const iptablesRules = runCommand('iptables -L INPUT');
  
  if (ufwStatus) {
    const ufwActive = ufwStatus.includes('Status: active');
    logCheck('UFW Firewall status', true, ufwActive ? 'Actief' : 'Inactief');
    
    if (ufwActive) {
      const port3000Allowed = ufwStatus.includes('3000') || ufwStatus.includes('Anywhere');
      logCheck('Poort 3000 toegestaan', port3000Allowed, port3000Allowed ? 'Toegestaan' : 'Geblokkeerd');
      
      if (!port3000Allowed) {
        logInfo('UFW configuratie: sudo ufw allow 3000');
        recommendations.push('Open poort 3000 in UFW: sudo ufw allow 3000');
      }
    }
  } else if (iptablesRules) {
    logCheck('iptables firewall', true, 'Gevonden (handmatige check vereist)', true);
    logInfo('Check handmatig: iptables -L INPUT | grep 3000');
  } else {
    logCheck('Firewall status', true, 'Geen firewall gedetecteerd', true);
  }
}

function checkMacFirewall() {
  const fwStatus = runCommand('/usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate');
  
  if (fwStatus) {
    const firewallOn = !fwStatus.includes('disabled');
    logCheck('macOS Firewall status', true, firewallOn ? 'Actief' : 'Uitgeschakeld');
    
    if (firewallOn) {
      logInfo('macOS Firewall configuratie:');
      console.log('   System Preferences → Security & Privacy → Firewall → Options');
      console.log('   Voeg Node.js toe aan toegestane apps');
      recommendations.push('Voeg Node.js toe aan macOS Firewall uitzonderingen');
    }
  } else {
    logCheck('macOS Firewall status', false, 'Kan status niet ophalen');
  }
}

function checkHotspotSetup() {
  const platform = os.platform();
  
  if (platform === 'win32') {
    const profiles = runCommand('netsh wlan show profiles');
    const hasHotspot = profiles && profiles.includes('GRNDbrekers-Bull');
    
    logCheck('Hotspot profiel (GRNDbrekers-Bull)', hasHotspot, hasHotspot ? 'Gevonden' : 'Niet gevonden', !hasHotspot);
    
    if (!hasHotspot) {
      logInfo('Windows Hotspot setup:');
      console.log('   Settings → Network & Internet → Mobile hotspot');
      console.log('   SSID: GRNDbrekers-Bull, Password: studay2025');
    }
  } else if (platform === 'linux') {
    const nmcli = runCommand('which nmcli');
    logCheck('NetworkManager beschikbaar', !!nmcli, nmcli ? 'nmcli gevonden' : 'Installeer NetworkManager');
    
    if (nmcli) {
      logInfo('Linux Hotspot setup: ./setup-wifi.sh of handmatig via nmcli');
    }
  } else {
    logCheck('Hotspot setup', true, `${platform} - handmatige configuratie`, true);
  }
}

function generateScore() {
  const percentage = Math.round((passedChecks / totalChecks) * 100);
  let grade, color;
  
  if (percentage >= 90) {
    grade = 'EXCELLENT';
    color = 'green';
  } else if (percentage >= 75) {
    grade = 'GOOD';
    color = 'cyan';
  } else if (percentage >= 60) {
    grade = 'OK';
    color = 'yellow';
  } else {
    grade = 'NEEDS WORK';
    color = 'red';
  }
  
  return { percentage, grade, color };
}

// 🚀 MAIN FUNCTION
async function runDiagnosis() {
  console.log(colorize('🐂 =====================================================', 'blue'));
  console.log(colorize('🩺 GRNDbrekers Bull Riding - System Doctor', 'bright'));
  console.log(colorize('🐂 =====================================================', 'blue'));
  console.log();
  
  logSection('System Requirements');
  checkNodeVersion();
  checkDependencies();
  checkRequiredFiles();
  
  logSection('Network Configuration');
  checkNetworkInterfaces();
  await checkPorts();
  
  logSection('Security & Firewall');
  checkFirewall();
  
  logSection('Hotspot Configuration');
  checkHotspotSetup();
  
  // 📊 RESULTATEN
  console.log();
  logSection('Diagnosis Results');
  
  const score = generateScore();
  console.log(`📊 Score: ${colorize(`${score.percentage}%`, score.color)} (${passedChecks}/${totalChecks} checks passed)`);
  console.log(`🎯 Grade: ${colorize(score.grade, score.color)}`);
  
  if (warnings.length > 0) {
    console.log(`\n⚠️  ${colorize('Warnings:', 'yellow')}`);
    warnings.forEach(warning => console.log(`   • ${warning}`));
  }
  
  if (recommendations.length > 0) {
    console.log(`\n🔧 ${colorize('Recommendations:', 'cyan')}`);
    recommendations.forEach(rec => console.log(`   • ${rec}`));
  }
  
  if (score.percentage >= 75) {
    console.log(`\n${colorize('✅ Your system looks good! Try starting the server:', 'green')}`);
    console.log(`   ${colorize('npm start', 'bright')}`);
  } else {
    console.log(`\n${colorize('❌ Please fix the issues above before starting the server.', 'red')}`);
  }
  
  console.log(`\n${colorize('💡 For more help, see TROUBLESHOOTING.md', 'cyan')}`);
  console.log(colorize('🐂 =====================================================\n', 'blue'));
}

// 🚀 RUN
if (require.main === module) {
  runDiagnosis().catch(error => {
    console.error('❌ Doctor crashed:', error.message);
    process.exit(1);
  });
}
