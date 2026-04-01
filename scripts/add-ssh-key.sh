mkdir -p /root/.ssh
echo 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIIQT36X9V7Pzs8zJeEwH8Ch7KRAB5jGUFyl0XSaEad1p amline-deploy' >> /root/.ssh/authorized_keys
chmod 700 /root/.ssh
chmod 600 /root/.ssh/authorized_keys
echo 'SSH key added successfully'
cat /root/.ssh/authorized_keys
