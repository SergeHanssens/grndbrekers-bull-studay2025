# 🔥 GRNDbrekers Bull Riding - Windows Firewall Setup
# Run this in Administrator PowerShell to allow Node.js server through firewall

param(
    [switch]$Remove,
    [int]$Port = 3000
)

$RuleName = "GRNDbrekers Bull Server"
$NodePath = (Get-Command node).Source

Write-Host "🐂 GRNDbrekers Bull Riding - Firewall Setup" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

if ($Remove) {
    Write-Host "🗑️ Removing firewall rules..." -ForegroundColor Yellow
    
    try {
        Remove-NetFirewallRule -DisplayName $RuleName -ErrorAction SilentlyContinue
        Write-Host "✅ Firewall rules removed successfully!" -ForegroundColor Green
    }
    catch {
        Write-Host "⚠️ No existing rules found to remove" -ForegroundColor Yellow
    }
    exit
}

Write-Host "🔍 Checking current firewall rules..." -ForegroundColor Blue

# Check if rule already exists
$existingRule = Get-NetFirewallRule -DisplayName $RuleName -ErrorAction SilentlyContinue

if ($existingRule) {
    Write-Host "⚠️ Firewall rule already exists. Removing old rule..." -ForegroundColor Yellow
    Remove-NetFirewallRule -DisplayName $RuleName
}

Write-Host "🔧 Creating new firewall rules..." -ForegroundColor Blue
Write-Host "   📂 Node.js Path: $NodePath" -ForegroundColor Gray
Write-Host "   🔌 Port: $Port" -ForegroundColor Gray

try {
    # Create inbound rule for the port
    New-NetFirewallRule -DisplayName $RuleName -Direction Inbound -Protocol TCP -LocalPort $Port -Action Allow -Profile Private,Public -Description "Allow GRNDbrekers Bull Riding server traffic"
    
    # Create inbound rule for Node.js executable
    New-NetFirewallRule -DisplayName "$RuleName (Node.js)" -Direction Inbound -Program $NodePath -Action Allow -Profile Private,Public -Description "Allow Node.js for GRNDbrekers Bull Riding"
    
    # Create outbound rule for Node.js executable
    New-NetFirewallRule -DisplayName "$RuleName (Node.js Outbound)" -Direction Outbound -Program $NodePath -Action Allow -Profile Private,Public -Description "Allow Node.js outbound for GRNDbrekers Bull Riding"
    
    Write-Host "✅ Firewall rules created successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🎯 Rules created:" -ForegroundColor Cyan
    Write-Host "   📥 Inbound TCP port $Port" -ForegroundColor Green
    Write-Host "   📥 Inbound Node.js program" -ForegroundColor Green  
    Write-Host "   📤 Outbound Node.js program" -ForegroundColor Green
    Write-Host ""
    Write-Host "🚀 You can now start your server with: npm start" -ForegroundColor Cyan
    Write-Host "📱 Mobile devices should be able to connect!" -ForegroundColor Cyan
}
catch {
    Write-Host "❌ Error creating firewall rules: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Manual steps:" -ForegroundColor Yellow
    Write-Host "1. Open Windows Defender Firewall" -ForegroundColor Gray
    Write-Host "2. Click 'Allow an app through firewall'" -ForegroundColor Gray
    Write-Host "3. Click 'Change settings' → 'Allow another app'" -ForegroundColor Gray
    Write-Host "4. Browse to: $NodePath" -ForegroundColor Gray
    Write-Host "5. Check both 'Private' and 'Public'" -ForegroundColor Gray
}

Write-Host ""
Write-Host "🔧 Other commands:" -ForegroundColor Cyan
Write-Host "   Remove rules: .\firewall-setup.ps1 -Remove" -ForegroundColor Gray
Write-Host "   Custom port:  .\firewall-setup.ps1 -Port 8080" -ForegroundColor Gray
