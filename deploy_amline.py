import paramiko
from scp import SCPClient
import os
import time
import random
import string

# Load .env from project root
_env = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
if os.path.isfile(_env):
    with open(_env, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

# Server configuration - use environment variables
# DEPLOY_TARGET=agent → agent.amline.ir (212.80.24.203)
TARGET = os.getenv("DEPLOY_TARGET", "agent")
HOST = os.getenv("DEPLOY_HOST", "212.80.24.203" if TARGET == "agent" else "212.80.24.109")
USER = os.getenv("DEPLOY_USER", "root")
PASS = os.getenv("DEPLOY_PASSWORD", "")
SSH_KEY = os.getenv("DEPLOY_SSH_KEY", "")  # مسیر کلید خصوصی SSH
OPENAI_KEY = os.getenv("OPENAI_API_KEY", "")

if not PASS and not SSH_KEY:
    raise ValueError("DEPLOY_PASSWORD or DEPLOY_SSH_KEY must be set")


def _ssh_connect(ssh, password=None, timeout=60):
    """اتصال SSH با رمز یا کلید"""
    kwargs = {
        "hostname": HOST,
        "username": USER,
        "timeout": timeout,
        "allow_agent": False,
        "look_for_keys": bool(SSH_KEY and os.path.isfile(SSH_KEY)),
    }
    if SSH_KEY and os.path.isfile(SSH_KEY):
        kwargs["key_filename"] = SSH_KEY
    else:
        kwargs["password"] = password or PASS
    ssh.connect(**kwargs)

def change_expired_password(ssh, old_pass, new_pass):
    """Change expired password via interactive shell."""
    chan = ssh.invoke_shell(width=200, height=50)
    time.sleep(2)
    buf = ""
    while chan.recv_ready():
        buf += chan.recv(4096).decode("utf-8", errors="ignore")
    if "current" in buf.lower() or "password" in buf.lower() or "expired" in buf.lower():
        chan.send(old_pass + "\n")
        time.sleep(1)
    chan.send("passwd\n")
    time.sleep(1.5)
    buf = ""
    while chan.recv_ready():
        buf += chan.recv(4096).decode("utf-8", errors="ignore")
    if "current" in buf.lower() or "Current" in buf:
        chan.send(old_pass + "\n")
        time.sleep(1)
    chan.send(new_pass + "\n")
    time.sleep(0.5)
    chan.send(new_pass + "\n")
    time.sleep(2)
    while chan.recv_ready():
        buf += chan.recv(4096).decode("utf-8", errors="ignore")
    chan.close()
    return "successfully" in buf.lower() or "successfully" in buf

def run_ssh(cmd, timeout=60, password=None):
    ssh = paramiko.SSHClient()
    try:
        ssh.load_system_host_keys()
        ssh.set_missing_host_key_policy(paramiko.RejectPolicy())
    except Exception:
        ssh.set_missing_host_key_policy(paramiko.WarningPolicy())
    _ssh_connect(ssh, password=password, timeout=30)
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode()
    err = stderr.read().decode()
    code = stdout.channel.recv_exit_status()
    ssh.close()
    return code, out, err

def main():
    global PASS
    base = r"E:\CTO"
    tarball = os.path.join(base, "seo-dashboard-deploy.tar.gz")
    gsc_src = os.path.join(base, "docs", "gsc_data", "gsc_full_export.json")

    if not os.path.isfile(tarball):
        raise FileNotFoundError(
            f"Tarball not found: {tarball}\n"
            "Run: cd seo-dashboard && npm run build, then create tarball from .next/standalone + .next/static + public"
        )
    if not os.path.isfile(gsc_src):
        raise FileNotFoundError(
            f"GSC data not found: {gsc_src}\n"
            "Run gsc_export_all.py or copy gsc_full_export.json to docs/gsc_data/"
        )

    new_pass = "Amline" + "".join(random.choices(string.ascii_letters + string.digits, k=10)) + "!"

    print("0. Handling expired password if needed...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        _ssh_connect(ssh, timeout=30)
        chan = ssh.invoke_shell(width=200, height=50)
        time.sleep(2.5)
        buf = ""
        for _ in range(5):
            if chan.recv_ready():
                buf += chan.recv(4096).decode("utf-8", errors="ignore")
            time.sleep(0.3)
        if "expired" in buf.lower() or "password change" in buf.lower() or "current" in buf.lower():
            print("   Password expired. Changing...")
            chan.send(PASS + "\r\n")
            time.sleep(1.2)
            buf = ""
            for _ in range(3):
                if chan.recv_ready():
                    buf += chan.recv(4096).decode("utf-8", errors="ignore")
                time.sleep(0.3)
            chan.send(new_pass + "\r\n")
            time.sleep(0.6)
            chan.send(new_pass + "\r\n")
            time.sleep(2)
            buf = ""
            for _ in range(5):
                if chan.recv_ready():
                    buf += chan.recv(4096).decode("utf-8", errors="ignore")
                time.sleep(0.3)
            chan.close()
            ssh.close()
            PASS = new_pass
            print("   New password set. Please save it securely.")
        else:
            chan.close()
            ssh.close()
    except Exception as e:
        print("   Note:", e)

    print("1. Setting up Node.js...")
    node_binary = os.path.join(base, "node-linux.tar.xz")
    if os.path.isfile(node_binary):
        print("   Transferring Node.js binary (no internet needed on server)...")
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        _ssh_connect(ssh, timeout=120)
        with SCPClient(ssh.get_transport()) as scp:
            scp.put(node_binary, "/tmp/node-linux.tar.xz")
        ssh.close()
        code, out, err = run_ssh(
            "cd /tmp && (tar -xJf node-linux.tar.xz 2>/dev/null || (xz -d node-linux.tar.xz 2>/dev/null && tar -xf node-linux.tar)); "
            "NODE_DIR=$(ls -d /tmp/node-v*-linux-x64 2>/dev/null | head -1); "
            "if [ -n \"$NODE_DIR\" ]; then mv $NODE_DIR /opt/node; echo 'Node at /opt/node'; /opt/node/bin/node -v; else echo 'extract failed'; fi",
            timeout=60
        )
        print(out or err)
    else:
        code, out, err = run_ssh(
            "apt-get update -qq 2>/dev/null; apt-get install -y nodejs 2>/dev/null; node -v",
            timeout=120
        )
        print(out or err)
    code, out, err = run_ssh("mkdir -p /opt/amline", timeout=10)
    
    print("2. Transferring tarball...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    _ssh_connect(ssh, timeout=120)
    with SCPClient(ssh.get_transport()) as scp:
        scp.put(tarball, "/tmp/seo-dashboard-deploy.tar.gz")
    ssh.close()
    print("   Done.")
    
    print("3. Extracting to /opt/amline/seo-dashboard...")
    code, out, err = run_ssh(
        "mkdir -p /opt/amline/seo-dashboard && "
        "rm -rf /opt/amline/seo-dashboard/* 2>/dev/null; "
        "tar -xzf /tmp/seo-dashboard-deploy.tar.gz -C /opt/amline/seo-dashboard && "
        "ls -la /opt/amline/seo-dashboard/"
    )
    print(out, err)
    
    print("4. Copying GSC data and creating .env...")
    code, out, err = run_ssh("mkdir -p /opt/amline/seo-dashboard/data/gsc", timeout=10)
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    _ssh_connect(ssh, timeout=60)
    with SCPClient(ssh.get_transport()) as scp:
        scp.put(gsc_src, "/opt/amline/seo-dashboard/data/gsc/gsc_full_export.json")
    ssh.close()
    
    # Create .env file securely - write locally first then upload
    import tempfile
    import io
    env_content = f"OPENAI_API_KEY={OPENAI_KEY}"
    
    # Create env file using SFTP for security
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    _ssh_connect(ssh, timeout=60)
    sftp = ssh.open_sftp()
    with sftp.file("/opt/amline/seo-dashboard/.env", 'w') as f:
        f.write(env_content)
    sftp.close()
    ssh.close()
    
    print("5. Starting app and creating systemd service...")
    node_cmd = "/opt/node/bin/node" if os.path.isfile(node_binary) else "node"
    run_ssh("pkill -f 'node server.js' 2>/dev/null; sleep 2", timeout=15)
    svc = f"""[Unit]
Description=Amline SEO Dashboard
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/amline/seo-dashboard
Environment=GSC_DATA_PATH=/opt/amline/seo-dashboard/data/gsc/gsc_full_export.json
Environment=PORT=3003
EnvironmentFile=/opt/amline/seo-dashboard/.env
ExecStart={node_cmd} server.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
"""
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    _ssh_connect(ssh, timeout=60)
    sftp = ssh.open_sftp()
    with sftp.file("/etc/systemd/system/seo-dashboard.service", 'w') as f:
        f.write(svc)
    sftp.close()
    code, out, err = run_ssh("systemctl daemon-reload && systemctl enable seo-dashboard && systemctl restart seo-dashboard && sleep 5 && systemctl status seo-dashboard --no-pager", timeout=30)
    try:
        print((out or err)[-800:])
    except UnicodeEncodeError:
        print((out or err)[-800:].encode('ascii', errors='replace').decode())
    
    print("6. Verifying...")
    # agent: root. parmin: /seo
    check_path = "/" if TARGET == "agent" else "/seo"
    code, out, err = run_ssh(f"sleep 10; curl -s -o /dev/null -w '%{{http_code}}' http://127.0.0.1:3003{check_path} 2>/dev/null || echo '000'")
    print(f"HTTP status on port 3003{check_path}:", out)

    # 7. Nginx: agent.amline.ir یا seo.amline.ir
    if HOST == "212.80.24.203":
        print("7. Setting up Nginx for agent.amline.ir...")
        nginx_conf = """server {
    listen 80;
    server_name agent.amline.ir;
    location / {
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
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        _ssh_connect(ssh, timeout=60)
        sftp = ssh.open_sftp()
        with sftp.file("/etc/nginx/sites-available/agent-amline", "w") as f:
            f.write(nginx_conf)
        sftp.close()
        ssh.close()
        code, out, err = run_ssh(
            "apt-get install -y nginx 2>/dev/null; "
            "systemctl enable nginx 2>/dev/null; systemctl start nginx 2>/dev/null; "
            "ln -sf /etc/nginx/sites-available/agent-amline /etc/nginx/sites-enabled/ 2>/dev/null; "
            "nginx -t 2>/dev/null && systemctl reload nginx 2>/dev/null; "
            "echo 'Nginx configured for agent.amline.ir'",
            timeout=90,
        )
        print("   ", out or err)
    elif HOST == "212.80.24.109":
        print("7. Setting up Nginx for seo.amline.ir...")
        nginx_conf = """server {
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
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        _ssh_connect(ssh, timeout=60)
        sftp = ssh.open_sftp()
        with sftp.file("/etc/nginx/sites-available/seo-amline", "w") as f:
            f.write(nginx_conf)
        sftp.close()
        ssh.close()
        code, out, err = run_ssh(
            "apt-get install -y nginx 2>/dev/null; "
            "systemctl enable nginx 2>/dev/null; systemctl start nginx 2>/dev/null; "
            "ln -sf /etc/nginx/sites-available/seo-amline /etc/nginx/sites-enabled/; "
            "rm -f /etc/nginx/sites-enabled/default 2>/dev/null; "
            "nginx -t 2>/dev/null && systemctl reload nginx 2>/dev/null; "
            "echo 'Nginx configured for seo.amline.ir'",
            timeout=90,
        )
        print("   ", out or err)

    print("\n=== Deployment complete ===")

if __name__ == "__main__":
    main()
