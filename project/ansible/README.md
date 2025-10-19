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

   # Windows (using WSL or pip)
   pip install ansible
   ```

2. Configure your target servers in `inventory.ini`

## Quick Start

### Option 1: Using the deployment script (Recommended)

**Linux/macOS:**
```bash
# Make script executable (if needed)
chmod +x deploy.sh

# Deploy to all servers
./deploy.sh

# Test connection only
./deploy.sh --test

# Deploy with verbose output
./deploy.sh --verbose
```

**Windows:**
```cmd
# Deploy to all servers
deploy.bat

# Test connection only
deploy.bat --test

# Deploy with verbose output
deploy.bat --verbose
```

### Option 2: Using Ansible directly

```bash
# Install requirements
ansible-galaxy install -r requirements.yml

# Test connection
ansible -i inventory.ini webservers -m ping

# Deploy to all servers
ansible-playbook -i inventory.ini playbook.yml

# Deploy to specific server
ansible-playbook -i inventory.ini playbook.yml --limit production
```

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

### 2. Configure variables in `group_vars/webservers.yml`

For better variable management, you can also set variables in the `group_vars/webservers.yml` file.

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
├── playbook.yml           # Main playbook (imports deploy.yml)
├── deploy.yml             # Deployment playbook
├── inventory.ini          # Server inventory and variables
├── ansible.cfg           # Ansible configuration
├── requirements.yml       # Ansible dependencies
├── deploy.sh             # Linux/macOS deployment script
├── deploy.bat            # Windows deployment script
├── README.md             # This file
├── group_vars/
│   └── webservers.yml    # Group variables for webservers
└── templates/
    ├── nginx.conf.j2     # Nginx configuration template
    └── env.j2            # Environment variables template
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
