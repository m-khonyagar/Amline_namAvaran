"""
تنظیم Nginx روی سرور پارمین برای seo.amline.ir
نیاز: DEPLOY_PASSWORD و (اختیاری) DEPLOY_HOST
"""
import os
import sys

# Load .env if exists
env_path = os.path.join(os.path.dirname(__file__), ".env")
if os.path.isfile(env_path):
    with open(env_path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

HOST = os.getenv("DEPLOY_HOST", "212.80.24.109")
USER = os.getenv("DEPLOY_USER", "root")
PASS = os.getenv("DEPLOY_PASSWORD", "")

if not PASS:
    print("Error: DEPLOY_PASSWORD not set.")
    print("In PowerShell: $env:DEPLOY_PASSWORD = 'server_password'")
    print("Or in .env: DEPLOY_PASSWORD=server_password")
    sys.exit(1)

try:
    import paramiko
except ImportError:
    print("Install paramiko: pip install paramiko")
    sys.exit(1)


def run_ssh(cmd, timeout=120):
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASS, timeout=30)
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode()
    err = stderr.read().decode()
    code = stdout.channel.recv_exit_status()
    ssh.close()
    return code, out, err


NGINX_CONF = """server {
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
"""


def main():
    print("Connecting to", HOST, "...")
    code, out, err = run_ssh("echo OK")
    if code != 0:
        print("Connection error:", err or out)
        sys.exit(1)
    print("   Connected.")

    print("1. Installing Nginx...")
    code, out, err = run_ssh(
        "apt-get update -qq 2>/dev/null && apt-get install -y nginx 2>/dev/null; "
        "systemctl enable nginx 2>/dev/null; systemctl start nginx 2>/dev/null; "
        "nginx -v 2>&1",
        timeout=120,
    )
    print(out or err)

    print("2. Creating config for seo.amline.ir...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASS, timeout=30)
    sftp = ssh.open_sftp()
    with sftp.file("/etc/nginx/sites-available/seo-amline", "w") as f:
        f.write(NGINX_CONF)
    sftp.close()
    ssh.close()
    print("   Config file created.")

    print("3. Enabling site...")
    code, out, err = run_ssh(
        "ln -sf /etc/nginx/sites-available/seo-amline /etc/nginx/sites-enabled/ && "
        "rm -f /etc/nginx/sites-enabled/default 2>/dev/null; "
        "nginx -t 2>&1"
    )
    print(out or err)
    if code != 0:
        print("Nginx test failed")
        sys.exit(1)

    print("4. Reloading Nginx...")
    code, out, err = run_ssh("systemctl reload nginx 2>&1")
    print(out or err)

    print("5. Installing Certbot for HTTPS (optional)...")
    code, out, err = run_ssh(
        "apt-get install -y certbot python3-certbot-nginx 2>/dev/null; "
        "certbot --version 2>&1 || echo 'certbot not installed'",
        timeout=90,
    )
    print(out or err)

    print("\n=== Nginx configured ===")
    print("URL: http://seo.amline.ir/seo")
    print("\nFor HTTPS, add DNS record first:")
    print("  Type: A | Name: seo | Value: 212.80.24.109")
    print("\nThen on server run:")
    print("  certbot --nginx -d seo.amline.ir")


if __name__ == "__main__":
    main()
