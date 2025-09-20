#!/bin/bash

# 🐂 GRNDbrekers Bull Riding - WiFi Hotspot Setup
# Verbeterde versie met foutafhandeling en status checks

set -e  # Stop bij eerste fout

# 🎨 Kleuren voor output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 📝 Configuratie
HOTSPOT_NAME="GRNDbrekers-Bull"
HOTSPOT_PASSWORD="studay2025"
HOTSPOT_IP="192.168.4.1"
DEVICE_INTERFACE=""

# 🎯 Functie om status te printen
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 🔍 Check of commands beschikbaar zijn
check_requirements() {
    print_status "Controleren van systeemvereisten..."
    
    # Check nmcli
    if ! command -v nmcli &> /dev/null; then
        print_error "nmcli is niet geïnstalleerd. Installeer NetworkManager:"
        echo "  Ubuntu/Debian: sudo apt-get install network-manager"
        echo "  CentOS/RHEL:   sudo yum install NetworkManager"
        echo "  Arch:          sudo pacman -S networkmanager"
        exit 1
    fi
    
    # Check systemctl
    if ! command -v systemctl &> /dev/null; then
        print_error "systemctl is niet beschikbaar. Dit script vereist systemd."
        exit 1
    fi
    
    # Check sudo rechten
    if [[ $EUID -eq 0 ]]; then
        print_warning "Script draait als root. Dit is niet aanbevolen."
    elif ! sudo -n true 2>/dev/null; then
        print_error "Sudo rechten zijn vereist. Voer uit met sudo of zorg voor passwordless sudo."
        exit 1
    fi
    
    print_success "Alle vereisten zijn aanwezig!"
}

# 🔍 Detecteer geschikte netwerkinterface
detect_interface() {
    print_status "Detecteren van netwerkinterface..."
    
    # Probeer WiFi interfaces te vinden
    local wifi_interfaces=$(nmcli device | grep wifi | grep -E "(disconnected|unavailable)" | awk '{print $1}' | head -1)
    
    if [[ -n "$wifi_interfaces" ]]; then
        DEVICE_INTERFACE="$wifi_interfaces"
        print_success "WiFi interface gevonden: $DEVICE_INTERFACE"
        return 0
    fi
    
    # Fallback naar ethernet of andere interfaces
    local available_interfaces=$(nmcli device | grep -E "(ethernet|wifi)" | grep -E "(disconnected|unavailable)" | awk '{print $1}' | head -1)
    
    if [[ -n "$available_interfaces" ]]; then
        DEVICE_INTERFACE="$available_interfaces"
        print_warning "Gebruik interface: $DEVICE_INTERFACE (mogelijk geen WiFi)"
        return 0
    fi
    
    print_error "Geen geschikte netwerkinterface gevonden!"
    print_status "Beschikbare interfaces:"
    nmcli device
    exit 1
}

# 🔍 Check of hotspot al bestaat
check_existing_hotspot() {
    print_status "Controleren of hotspot al bestaat..."
    
    if nmcli connection show "$HOTSPOT_NAME" &> /dev/null; then
        print_warning "Hotspot '$HOTSPOT_NAME' bestaat al!"
        
        read -p "Wil je de bestaande hotspot verwijderen en opnieuw aanmaken? (y/N): " -n 1 -r
        echo
        
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            print_status "Verwijderen van bestaande hotspot..."
            sudo nmcli connection delete "$HOTSPOT_NAME" || true
            print_success "Bestaande hotspot verwijderd!"
        else
            print_status "Proberen bestaande hotspot te activeren..."
            if sudo nmcli connection up "$HOTSPOT_NAME"; then
                print_success "Bestaande hotspot geactiveerd!"
                show_connection_info
                exit 0
            else
                print_error "Kon bestaande hotspot niet activeren. Verwijder handmatig of kies 'y'."
                exit 1
            fi
        fi
    fi
}

# 🔧 Maak hotspot aan
create_hotspot() {
    print_status "Aanmaken van WiFi hotspot '$HOTSPOT_NAME'..."
    
    # Probeer hotspot aan te maken
    if sudo nmcli connection add type wifi ifname "$DEVICE_INTERFACE" con-name "$HOTSPOT_NAME" autoconnect yes ssid "$HOTSPOT_NAME"; then
        print_success "Hotspot verbinding aangemaakt!"
    else
        print_error "Kon hotspot verbinding niet aanmaken!"
        exit 1
    fi
    
    # Configureer hotspot settings
    print_status "Configureren van hotspot instellingen..."
    
    sudo nmcli connection modify "$HOTSPOT_NAME" 802-11-wireless.mode ap || {
        print_error "Kon WiFi mode niet instellen op AP"
        exit 1
    }
    
    sudo nmcli connection modify "$HOTSPOT_NAME" 802-11-wireless.band bg || {
        print_error "Kon WiFi band niet instellen"
        exit 1
    }
    
    sudo nmcli connection modify "$HOTSPOT_NAME" ipv4.method shared || {
        print_error "Kon IPv4 method niet instellen"
        exit 1
    }
    
    sudo nmcli connection modify "$HOTSPOT_NAME" ipv4.addresses "$HOTSPOT_IP/24" || {
        print_error "Kon IP adres niet instellen"
        exit 1
    }
    
    sudo nmcli connection modify "$HOTSPOT_NAME" 802-11-wireless-security.key-mgmt wpa-psk || {
        print_error "Kon WPA security niet instellen"
        exit 1
    }
    
    sudo nmcli connection modify "$HOTSPOT_NAME" 802-11-wireless-security.psk "$HOTSPOT_PASSWORD" || {
        print_error "Kon WiFi wachtwoord niet instellen"
        exit 1
    }
    
    print_success "Hotspot geconfigureerd!"
}

# 🚀 Start hotspot
start_hotspot() {
    print_status "Starten van hotspot..."
    
    # Probeer hotspot te starten
    if sudo nmcli connection up "$HOTSPOT_NAME"; then
        print_success "Hotspot gestart!"
    else
        print_error "Kon hotspot niet starten!"
        print_status "Proberen problemen op te lossen..."
        
        # Probeer interface opnieuw te resetten
        sudo nmcli device disconnect "$DEVICE_INTERFACE" 2>/dev/null || true
        sleep 2
        
        if sudo nmcli connection up "$HOTSPOT_NAME"; then
            print_success "Hotspot gestart na reset!"
        else
            print_error "Hotspot kon niet worden gestart. Controleer logs:"
            echo "  sudo journalctl -u NetworkManager -f"
            exit 1
        fi
    fi
}

# 📊 Toon verbindingsinformatie
show_connection_info() {
    print_success "🎉 WiFi Hotspot succesvol opgezet!"
    echo
    echo "📶 Hotspot Details:"
    echo "   Naam:        $HOTSPOT_NAME"
    echo "   Wachtwoord:  $HOTSPOT_PASSWORD"
    echo "   IP Adres:    $HOTSPOT_IP"
    echo "   Interface:   $DEVICE_INTERFACE"
    echo
    echo "📱 Verbinden:"
    echo "   1. Zoek WiFi netwerk '$HOTSPOT_NAME'"
    echo "   2. Voer wachtwoord in: '$HOTSPOT_PASSWORD'"
    echo "   3. Open browser en ga naar: http://$HOTSPOT_IP:3000"
    echo
    echo "🔧 Handige commando's:"
    echo "   Status:      nmcli connection show $HOTSPOT_NAME"
    echo "   Stoppen:     sudo nmcli connection down $HOTSPOT_NAME"
    echo "   Herstarten:  sudo nmcli connection up $HOTSPOT_NAME"
    echo "   Verwijderen: sudo nmcli connection delete $HOTSPOT_NAME"
    echo
}

# 🧹 Cleanup functie voor als script wordt onderbroken
cleanup() {
    print_warning "Script onderbroken. Opruimen..."
    # Eventuele cleanup acties hier
    exit 1
}

# 🎯 Main functie
main() {
    echo "🐂 GRNDbrekers Bull Riding - WiFi Hotspot Setup"
    echo "================================================"
    echo
    
    # Setup cleanup trap
    trap cleanup SIGINT SIGTERM
    
    # Voer alle checks en setup uit
    check_requirements
    detect_interface
    check_existing_hotspot
    create_hotspot
    start_hotspot
    show_connection_info
    
    print_success "✅ Setup voltooid! Je kunt nu de Node.js server starten met 'npm start'"
}

# 🚀 Start het script
main "$@"
