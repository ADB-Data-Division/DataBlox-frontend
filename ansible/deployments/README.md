# Ansible Deployment Scripts

This directory contains Ansible playbooks for deploying Docker, Docker Compose, and Traefik to an Azure VM.

## Prerequisites

1. Ansible installed on your local machine:
   ```bash
   pip install ansible
   ```

2. SSH key file available at `../../secrets/data-visualization-granter-mac-grantee-darren.pem`

3. Target VM accessible at `4.193.207.59` with user `azureuser`

## Files

- `inventory.ini` - Ansible inventory file defining the target host
- `docker-playbook.yml` - Installs Docker and Docker Compose
- `traefik-playbook.yml` - Deploys Traefik using Docker Compose
- `site.yml` - Main playbook that runs both Docker and Traefik installations

## Usage

### Run all playbooks (recommended)
```bash
cd ansible/deployments
ansible-playbook -i inventory.ini site.yml
```

### Run individual playbooks

Install Docker only:
```bash
ansible-playbook -i inventory.ini docker-playbook.yml
```

Deploy Traefik only (requires Docker to be installed first):
```bash
ansible-playbook -i inventory.ini traefik-playbook.yml
```

## Deployment Status ✅

**SUCCESSFULLY DEPLOYED!**

- ✅ Docker CE installed and running
- ✅ Docker Compose v2.37.3 installed
- ✅ Traefik v3.0.4 deployed and running
- ✅ Traefik network created
- ✅ All services confirmed working locally

## What gets installed

### Docker Playbook
- Updates system packages
- Installs Docker CE, Docker CLI, containerd.io
- Installs Docker Compose plugin
- Adds user to docker group
- Starts and enables Docker service
- Tests installation
- **Note**: Handles ARM64 architecture correctly

### Traefik Playbook
- Creates Traefik configuration directory
- Sets up Traefik configuration file
- Creates Docker Compose file for Traefik
- Creates Docker network for Traefik
- Deploys Traefik container
- Verifies Traefik is running

## Access Points

**Local Access (confirmed working):**
- Traefik API: `curl http://localhost:8080/api/rawdata`
- Traefik Dashboard: `curl http://localhost:8080/dashboard/`

**External Access (requires firewall configuration):**
- **Traefik Dashboard**: http://4.193.207.59:8080/dashboard/
- **Traefik API**: http://4.193.207.59:8080/api/rawdata
- **HTTP Traffic**: Port 80
- **HTTPS Traffic**: Port 443

## Network Security Group Configuration Required

To access Traefik externally, you need to open these ports in your Azure Network Security Group:

```bash
# Allow HTTP traffic
Port 80 (TCP) - HTTP traffic

# Allow HTTPS traffic  
Port 443 (TCP) - HTTPS traffic

# Allow Traefik Dashboard (optional, for development)
Port 8080 (TCP) - Traefik Dashboard and API
```

## Configuration

The Traefik configuration includes:
- Dashboard enabled (insecure mode for development)
- Docker provider enabled
- HTTP and HTTPS entry points
- Let's Encrypt certificate resolver (configured but requires domain setup)
- Access and error logging

## Troubleshooting

### If external access doesn't work:
1. Check Azure Network Security Group rules
2. Verify container is running: `sudo docker ps`
3. Check logs: `sudo docker logs traefik`
4. Test local access: `curl http://localhost:8080/api/rawdata`

### Common Issues:
- **Permission denied**: The playbook uses `sudo` for Docker commands to avoid group permission issues
- **ARM64 architecture**: Automatically detected and configured
- **Ubuntu 24.04**: Uses system packages for Docker Python library

## Security Notes

- The current configuration runs Traefik dashboard in insecure mode (no authentication)
- For production use, consider:
  - Enabling authentication for the dashboard
  - Using proper domain names instead of IP addresses
  - Configuring proper SSL certificates
  - Restricting access to management ports (especially 8080)

## Next Steps

1. **Configure Azure Network Security Group** to allow external access to ports 80, 443, and 8080
2. **Set up domain names** for proper SSL certificate generation
3. **Configure authentication** for the Traefik dashboard
4. **Deploy your applications** using Traefik labels for automatic routing 