#!/bin/bash
echo "GRNDbrekers Bull Riding - WiFi Hotspot Setup"

# Check OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "macOS gedetecteerd"
    echo "Ga naar Systeemvoorkeuren > Delen > Internetdeling"
    echo "Deel van: Ethernet, Naar: WiFi"
    echo "WiFi Opties: Netwerknaam: GRNDbrekers-Bull, Wachtwoord: studay2025"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "Linux gedetecteerd - Installeer hostapd als deze niet bestaat"
    sudo apt-get update
    sudo apt-get install -y hostapd dnsmasq
    
    # Basis hostapd configuratie
    cat > /tmp/hostapd.conf << EOF
interface=wlan0
driver=nl80211
ssid=GRNDbrekers-Bull
hw_mode=g
channel=7
wmm_enabled=0
macaddr_acl=0
auth_algs=1
ignore_broadcast_ssid=0
wpa=2
wpa_passphrase=studay2025
wpa_key_mgmt=WPA-PSK
wpa_pairwise=TKIP
rsn_pairwise=CCMP
EOF
    
    echo "Hostapd configuratie aangemaakt. Start handmatig met:"
    echo "sudo hostapd /tmp/hostapd.conf"
else
    echo "Windows gedetecteerd"
    echo "Start mobiele hotspot vanuit Windows instellingen"
    echo "Netwerknaam: GRNDbrekers-Bull"
    echo "Wachtwoord: studay2025"
fi
