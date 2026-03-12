import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('212.80.24.109', username='root', password='Amline1BzDIrkx68!', timeout=30)
# Start in background with nohup and redirect
cmd = "cd /opt/amline/seo-dashboard && GSC_DATA_PATH=/opt/amline/seo-dashboard/data/gsc/gsc_full_export.json PORT=3003 nohup /opt/node/bin/node server.js > /tmp/seo.log 2>&1 & sleep 8; cat /tmp/seo.log; curl -s -o /dev/null -w 'HTTP:%{http_code}' http://127.0.0.1:3003"
stdin, stdout, stderr = ssh.exec_command(cmd, timeout=30)
out = stdout.read().decode(errors='replace').encode('ascii', errors='replace').decode()
err = stderr.read().decode(errors='replace').encode('ascii', errors='replace').decode()
print(out or err)
ssh.close()
