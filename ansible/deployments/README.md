# Ansible Deployment Scripts

This directory contains Ansible playbooks for deploying Docker, Docker Compose, Traefik, and GitHub Container Registry authentication to an Azure VM.

## Prerequisites

1. Ansible installed on your local machine:
   ```bash
   pip install ansible
   ```

2. SSH key file available at `../../secrets/data-visualization-granter-mac-grantee-darren.pem`

3. Target VM accessible at `4.193.207.59` with user `azureuser`

4. For GitHub Container Registry access: GitHub Personal Access Token (PAT) with appropriate permissions

## Files

- `inventory.ini` - Ansible inventory file defining the target host
- `docker-playbook.yml` - Installs Docker and Docker Compose
- `traefik-playbook.yml` - Deploys Traefik using Docker Compose
- `ghcr-auth-playbook.yml` - Configures GitHub Container Registry authentication
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

**Configure GitHub Container Registry authentication:**
```bash
# Method 1: Pass credentials as command line arguments
ansible-playbook -i inventory.ini ghcr-auth-playbook.yml \
  -e github_username=your-github-username \
  -e github_token=your-personal-access-token

# Method 2: Use environment variables
export GITHUB_USERNAME=your-github-username
export GITHUB_TOKEN=your-personal-access-token
ansible-playbook -i inventory.ini ghcr-auth-playbook.yml \
  -e github_username=$GITHUB_USERNAME \
  -e github_token=$GITHUB_TOKEN
```

## GitHub Container Registry Setup

### Creating a Personal Access Token (PAT)

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Select the following scopes:
   - `read:packages` (to pull images)
   - `write:packages` (to push images, if needed)
   - `delete:packages` (to delete images, if needed)
4. Copy the generated token

### What the GHCR playbook does

- Validates that GitHub credentials are provided
- Creates Docker configuration directory for the user
- Logs into GitHub Container Registry using Docker CLI
- Tests the configuration by pulling a public image
- Stores authentication credentials in `~/.docker/config.json`
- Provides usage instructions

### Using GitHub Container Registry after setup

**Pull private images:**
```bash
docker pull ghcr.io/your-username/your-private-repo:tag
```

**Push images (if you have write access):**
```bash
docker tag your-local-image ghcr.io/your-username/your-repo:tag
docker push ghcr.io/your-username/your-repo:tag
```

**Pull images in Docker Compose:**
```yaml
services:
  your-service:
    image: ghcr.io/your-username/your-repo:tag
    # ... other configuration
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

### GHCR Authentication Playbook
- Configures Docker to authenticate with GitHub Container Registry
- Creates necessary Docker configuration directories
- Stores authentication credentials securely
- Tests the configuration
- Provides usage instructions

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

## Security Considerations

### GitHub Container Registry
- Personal Access Tokens are stored in `~/.docker/config.json`
- Use tokens with minimal required permissions
- Consider using GitHub Actions service accounts for production
- Regularly rotate your Personal Access Tokens

### Traefik
- The current configuration runs Traefik dashboard in insecure mode (no authentication)
- For production use, consider:
  - Enabling authentication for the dashboard
  - Using proper domain names instead of IP addresses
  - Configuring proper SSL certificates
  - Restricting access to management ports (especially 8080)

## Troubleshooting

### If external access doesn't work:
1. Check Azure Network Security Group rules
2. Verify container is running: `sudo docker ps`
3. Check logs: `sudo docker logs traefik`
4. Test local access: `curl http://localhost:8080/api/rawdata`

### GitHub Container Registry Issues:
1. **Authentication failed**: Verify your PAT has the correct permissions
2. **Cannot pull images**: Check if the repository exists and is accessible
3. **Permission denied**: Ensure your PAT has `read:packages` permission
4. **Token expired**: Generate a new PAT and re-run the GHCR playbook

### Common Issues:
- **Permission denied**: The playbook uses `sudo` for Docker commands to avoid group permission issues
- **ARM64 architecture**: Automatically detected and configured
- **Ubuntu 24.04**: Uses system packages for Docker Python library

## Next Steps

1. **Configure Azure Network Security Group** to allow external access to ports 80, 443, and 8080
2. **Set up GitHub Container Registry authentication** for pulling private images
3. **Set up domain names** for proper SSL certificate generation
4. **Configure authentication** for the Traefik dashboard
5. **Deploy your applications** using Traefik labels for automatic routing and GHCR images

## Example: Deploying an app with GHCR image

```yaml
# docker-compose.yml
version: '3.8'
services:
  your-app:
    image: ghcr.io/your-username/your-app:latest
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.your-app.rule=Host(`your-domain.com`)"
      - "traefik.http.routers.your-app.entrypoints=websecure"
      - "traefik.http.routers.your-app.tls.certresolver=letsencrypt"
    networks:
      - traefik

networks:
  traefik:
    external: true
``` 