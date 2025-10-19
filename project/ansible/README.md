# PayWallet Ansible Deployment

This directory contains Ansible playbooks for automated deployment of the PayWallet application.

## Prerequisites

1. Install Ansible on your local machine:
   ```bash
   # Ubuntu/Debian
   sudo apt update
   sudo apt install ansible

   # macOS
   brew install ansible
   ```

2. Configure your target servers in `inventory.ini`

## Configuration

### 1. Edit `inventory.ini`

Add your server details:

```ini
[webservers]
production ansible_host=YOUR_SERVER_IP ansible_user=ubuntu ansible_ssh_private_key_file=~/.ssh/id_rsa

[webservers:vars]
supabase_url=https://your-project.supabase.co
supabase_anon_key=your-anon-key
domain_name=paywallet.example.com
```

### 2. Test Connection

```bash
ansible -i inventory.ini webservers -m ping
```

## Deployment

### Deploy to all servers

```bash
ansible-playbook -i inventory.ini deploy.yml
```

### Deploy to specific server

```bash
ansible-playbook -i inventory.ini deploy.yml --limit production
```

### Deploy with verbose output

```bash
ansible-playbook -i inventory.ini deploy.yml -v
```

## What the Playbook Does

1. Updates system packages
2. Installs Node.js, Nginx, and required dependencies
3. Creates application directory
4. Copies/clones application files
5. Installs npm dependencies
6. Builds the application
7. Configures Nginx as reverse proxy
8. Sets up firewall rules
9. Starts services

## Post-Deployment

After deployment, your application will be available at:
- `http://YOUR_SERVER_IP` (if no domain configured)
- `http://YOUR_DOMAIN` (if domain configured)

## SSL/HTTPS Setup

For production, set up SSL with Let's Encrypt:

```bash
# SSH into your server
ssh ubuntu@YOUR_SERVER_IP

# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d paywallet.example.com
```

## Directory Structure

```
ansible/
├── deploy.yml              # Main deployment playbook
├── inventory.ini           # Server inventory and variables
├── README.md              # This file
└── templates/
    ├── nginx.conf.j2      # Nginx configuration template
    └── env.j2             # Environment variables template
```

## Troubleshooting

### Check Nginx status
```bash
ansible -i inventory.ini webservers -m shell -a "systemctl status nginx"
```

### View application logs
```bash
ansible -i inventory.ini webservers -m shell -a "tail -n 50 /var/log/nginx/paywallet_error.log"
```

### Restart Nginx
```bash
ansible -i inventory.ini webservers -m service -a "name=nginx state=restarted"
```
