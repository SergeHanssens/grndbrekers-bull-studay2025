# 🛡️ GRNDbrekers Bull Riding - Windows Firewall Setup
# Automatische configuratie voor Node.js en poort 3000

param(
    [switch]$Remove = $false,
    [switch]$Force = $false,
    [int]$Port = 3000
)

# 🎨 Colors for output
function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    
    $colors = @{
        "Red" = [ConsoleColor]::Red
        "Green" = [ConsoleColor]::Green  
        "Yellow" = [ConsoleColor]::Yellow
        "Blue" = [ConsoleColor]::Blue
        "Cyan" = [ConsoleColor]::Cyan
        "White" = [ConsoleColor]::White
    }
    
    Write-Host $Message -ForegroundColor $colors[$Color]
}

function Write-Success { param([string]$Message) Write-ColorOutput "✅ $Message" "Green" }
function Write-Error { param([string]$Message) Write-ColorOutput "❌ $Message" "Red" }
function Write-Warning { param([string]$Message) Write-ColorOutput "⚠️  $Message" "Yellow" }
function Write-Info { param([string]$Message) Write-ColorOutput "💡 $Message" "Cyan" }

# 🔒 Admin check
function Test-AdminRights {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# 🔍 Check if rule exists
function Test-FirewallRule {
    param([string]$RuleName)
    
    try {
        $rule = Get-NetFirewallRule -DisplayName $RuleName -ErrorAction SilentlyContinue
        return $null -ne $rule
    } catch {
        return $false
    }
}

# ➕ Add firewall rules
function Add-FirewallRules {
    param([int]$Port)
    
    $rules = @(
        @{
            Name = "GRNDbrekers Bull Riding - Node.js Inbound"
            Direction = "Inbound"
            Protocol = "TCP"
            LocalPort = $Port
            Action = "Allow"
            Description = "Allow inbound connections for GRNDbrekers Bull Riding app"
        },
        @{
            Name = "GRNDbrekers Bull Riding - Node.js Outbound" 
            Direction = "Outbound"
            Protocol = "TCP"
            LocalPort = $Port
            Action = "Allow"
            Description = "Allow outbound connections for GRNDbrekers Bull Riding app"
        },
        @{
            Name = "GRNDbrekers Bull Riding - WebSocket"
            Direction = "Inbound"
            Protocol = "TCP"
            LocalPort = $Port
            Action = "Allow"
            Description = "Allow WebSocket connections for real-time sync"
        }
    )
    
    $success = 0
    $total = $rules.Count
    
    foreach ($rule in $rules) {
        try {
            if (Test-FirewallRule -RuleName $rule.Name) {
                if ($Force) {
                    Write-Info "Removing existing rule: $($rule.Name)"
                    Remove-NetFirewallRule -DisplayName $rule.Name -ErrorAction SilentlyContinue
                } else {
                    Write-Warning "Rule already exists: $($rule.Name)"
                    $success++
                    continue
                }
            }
            
            Write-Info "Creating rule: $($rule.Name)"
            
            $params = @{
                DisplayName = $rule.Name
                Direction = $rule.Direction
                Protocol = $rule.Protocol
                LocalPort = $rule.LocalPort
                Action = $rule.Action
                Description = $rule.Description
                Enabled = $true
                Profile = "Domain,Private,Public"
            }
            
            New-NetFirewallRule @params -ErrorAction Stop | Out-Null
            Write-Success "Created: $($rule.Name)"
            $success++
            
        } catch {
            Write-Error "Failed to create rule '$($rule.Name)': $($_.Exception.Message)"
        }
    }
    
    return $success -eq $total
}

# ➖ Remove firewall rules
function Remove-FirewallRules {
    $rulePatterns = @(
        "GRNDbrekers Bull Riding*",
        "*Node.js*Bull*",
        "*Bull Riding*"
    )
    
    $removed = 0
    
    foreach ($pattern in $rulePatterns) {
        try {
            $rules = Get-NetFirewallRule -DisplayName $pattern -ErrorAction SilentlyContinue
            
            foreach ($rule in $rules) {
                Write-Info "Removing rule: $($rule.DisplayName)"
                Remove-NetFirewallRule -DisplayName $rule.DisplayName -ErrorAction Stop
                Write-Success "Removed: $($rule.DisplayName)"
                $removed++
            }
        } catch {
            Write-Error "Failed to remove rules matching '$pattern': $($_.Exception.Message)"
        }
    }
    
    if ($removed -eq 0) {
        Write-Warning "No GRNDbrekers Bull Riding firewall rules found to remove"
    }
    
    return $removed -gt 0
}

# 🔍 Check firewall status
function Get-FirewallStatus {
    try {
        $profiles = Get-NetFirewallProfile
        $status = @{}
        
        foreach ($profile in $profiles) {
            $status[$profile.Name] = $profile.Enabled
        }
        
        return $status
    } catch {
        Write-Error "Failed to get firewall status: $($_.Exception.Message)"
        return $null
    }
}

# 🧪 Test port accessibility
function Test-PortAccess {
    param([int]$Port)
    
    try {
        $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $Port)
        $listener.Start()
        $listener.Stop()
        return $true
    } catch {
        return $false
    }
}

# 🚀 Main execution
function Main {
    Write-ColorOutput "`n🐂 =====================================================" "Blue"
    Write-ColorOutput "🛡️  GRNDbrekers Bull Riding - Windows Firewall Setup" "Blue" 
    Write-ColorOutput "🐂 =====================================================" "Blue"
    
    # Check admin rights
    if (-not (Test-AdminRights)) {
        Write-Error "This script requires Administrator privileges!"
        Write-Info "Right-click PowerShell and select 'Run as Administrator'"
        Write-Info "Then run: .\firewall-setup.ps1"
        return 1
    }
    
    Write-Success "Running with Administrator privileges"
    
    # Check firewall status
    Write-Info "Checking Windows Firewall status..."
    $firewallStatus = Get-FirewallStatus
    
    if ($firewallStatus) {
        foreach ($profile in $firewallStatus.Keys) {
            $status = if ($firewallStatus[$profile]) { "ON" } else { "OFF" }
            $color = if ($firewallStatus[$profile]) { "Yellow" } else { "Green" }
            Write-ColorOutput "   $profile Profile: $status" $color
        }
    }
    
    # Execute action
    if ($Remove) {
        Write-Info "`nRemoving GRNDbrekers Bull Riding firewall rules..."
        $success = Remove-FirewallRules
        
        if ($success) {
            Write-Success "`n🎉 Firewall rules successfully removed!"
        } else {
            Write-Warning "`n⚠️  No rules were removed (none found or errors occurred)"
        }
    } else {
        Write-Info "`nConfiguring firewall for port $Port..."
        $success = Add-FirewallRules -Port $Port
        
        if ($success) {
            Write-Success "`n🎉 Firewall successfully configured!"
            Write-Info "Port $Port is now allowed for incoming and outgoing connections"
            
            # Test port
            Write-Info "`nTesting port accessibility..."
            if (Test-PortAccess -Port $Port) {
                Write-Success "Port $Port is accessible"
            } else {
                Write-Warning "Port $Port might be in use by another application"
            }
        } else {
            Write-Error "`n❌ Failed to configure firewall completely"
            Write-Info "You may need to configure Windows Firewall manually:"
            Write-Info "1. Open Windows Defender Firewall"
            Write-Info "2. Click 'Allow an app or feature through Windows Defender Firewall'" 
            Write-Info "3. Click 'Allow another app...'"
            Write-Info "4. Browse to your Node.js installation"
            Write-Info "5. Check both 'Private' and 'Public' networks"
            return 1
        }
    }
    
    # Show existing rules
    Write-Info "`nCurrent GRNDbrekers Bull Riding firewall rules:"
    try {
        $existingRules = Get-NetFirewallRule -DisplayName "*GRNDbrekers*" -ErrorAction SilentlyContinue
        if ($existingRules) {
            foreach ($rule in $existingRules) {
                $status = if ($rule.Enabled) { "✅ ENABLED" } else { "❌ DISABLED" }
                Write-ColorOutput "   $($rule.DisplayName) - $status" "Cyan"
            }
        } else {
            Write-Info "   No GRNDbrekers Bull Riding rules found"
        }
    } catch {
        Write-Warning "   Could not list firewall rules"
    }
    
    Write-Info "`n💡 Next steps:"
    if ($Remove) {
        Write-Info "   • Firewall rules have been removed"
        Write-Info "   • You may now experience connection issues"
        Write-Info "   • Run without -Remove to restore protection"
    } else {
        Write-Info "   • Start your server: npm start"
        Write-Info "   • Test connection from mobile device"
        Write-Info "   • Use: http://192.168.137.1:$Port"
    }
    
    Write-ColorOutput "`n🐂 =====================================================`n" "Blue"
    return 0
}

# 🎯 Execute main function
exit (Main)
