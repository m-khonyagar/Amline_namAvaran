#!/bin/bash
# نصب خودکار WireGuard VPN روی سرور لینوکس (Ubuntu/Debian)
# این اسکریپت را روی VPS آمریکا اجرا کنید (مثلاً DigitalOcean، Vultr، Linode)

set -e

echo "=== نصب WireGuard VPN Server ==="

# به‌روزرسانی و نصب
apt-get update
apt-get install -y wireguard qrencode

# تولید کلیدها
cd /etc/wireguard
umask 077
wg genkey | tee server_private.key | wg pubkey > server_public.key
wg genkey | tee client_private.key | wg pubkey > client_public.key

SERVER_PRIVATE=$(cat server_private.key)
SERVER_PUBLIC=$(cat server_public.key)
CLIENT_PRIVATE=$(cat client_private.key)
CLIENT_PUBLIC=$(cat client_public.key)

# دریافت IP عمومی سرور
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s icanhazip.com)
SERVER_PORT=51820

# ایجاد کانفیگ سرور
cat > /etc/wireguard/wg0.conf << EOF
[Interface]
Address = 10.0.0.1/24
ListenPort = $SERVER_PORT
PrivateKey = $SERVER_PRIVATE
PostUp = iptables -A FORWARD -i wg0 -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i wg0 -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE

[Peer]
PublicKey = $CLIENT_PUBLIC
AllowedIPs = 10.0.0.2/32
EOF

# فعال‌سازی IP forwarding
echo "net.ipv4.ip_forward=1" >> /etc/sysctl.conf
sysctl -p

# فعال‌سازی و اجرای WireGuard
systemctl enable wg-quick@wg0
systemctl start wg-quick@wg0

# ایجاد کانفیگ کلاینت
cat > /root/client.conf << EOF
[Interface]
PrivateKey = $CLIENT_PRIVATE
Address = 10.0.0.2/24
DNS = 1.1.1.1, 8.8.8.8

[Peer]
PublicKey = $SERVER_PUBLIC
Endpoint = $SERVER_IP:$SERVER_PORT
AllowedIPs = 0.0.0.0/0
PersistentKeepalive = 25
EOF

echo ""
echo "=== نصب کامل شد! ==="
echo ""
echo "فایل کانفیگ کلاینت: /root/client.conf"
echo "محتوای آن را کپی کرده و در برنامه WireGuard ویندوز Import کنید."
echo ""
echo "--- محتوای client.conf ---"
cat /root/client.conf
echo "---"
echo ""
echo "یا QR Code برای موبایل:"
qrencode -t ansiutf8 < /root/client.conf 2>/dev/null || echo "qrencode نصب نیست - فایل را دستی کپی کنید"
