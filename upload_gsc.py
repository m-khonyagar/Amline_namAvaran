"""Upload GSC data to server and restart dashboard."""
import paramiko
from scp import SCPClient
import os

HOST = "212.80.24.109"
USER = "root"
PASS = os.getenv("DEPLOY_PASSWORD", "Amline1BzDIrkx68!")
GSC_SRC = r"E:\CTO\docs\gsc_data\gsc_full_export.json"

def main():
    if not os.path.isfile(GSC_SRC):
        print("GSC file not found:", GSC_SRC)
        return
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASS, timeout=30)
    with SCPClient(ssh.get_transport()) as scp:
        scp.put(GSC_SRC, "/opt/amline/seo-dashboard/data/gsc/gsc_full_export.json")
    stdin, stdout, stderr = ssh.exec_command("systemctl restart seo-dashboard && sleep 3 && systemctl is-active seo-dashboard")
    print(stdout.read().decode())
    ssh.close()
    print("Done. Dashboard: http://212.80.24.109:3003")

if __name__ == "__main__":
    main()
