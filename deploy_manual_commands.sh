#!/bin/bash
# Commands to run on server 212.80.24.109 after SSH login
# Run: ssh root@212.80.24.109
# Then paste these commands (or run: bash -s < deploy_manual_commands.sh)

set -e
apt-get update -qq
apt-get install -y nginx

# Nginx config for seo.amline.ir
cat > /etc/nginx/sites-available/seo-amline << 'NGINX'
server {
    listen 80;
    server_name seo.amline.ir;
    location /seo {
        proxy_pass http://127.0.0.1:3003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/seo-amline /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default 2>/dev/null
nginx -t && systemctl reload nginx
systemctl enable nginx

# SSL
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d seo.amline.ir --non-interactive --agree-tos --email admin@amline.ir || true

echo "Done. Check https://seo.amline.ir/seo"
