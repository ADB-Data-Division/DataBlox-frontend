#!/bin/bash

# Script to deploy with proper SSL configuration
# Usage: ./deploy-with-ssl.sh [your-email@example.com]

EMAIL=${1:-"admin@example.com"}

echo "=== Deploying with SSL Configuration ==="
echo "Email: $EMAIL"
echo ""

# Update email in traefik playbook
sed -i "s/your-email@example.com/$EMAIL/g" traefik-playbook.yml

# Deploy Traefik first
echo "1. Deploying Traefik..."
ansible-playbook -i inventory.ini traefik-playbook.yml

if [ $? -eq 0 ]; then
    echo "✓ Traefik deployed successfully"
else
    echo "✗ Traefik deployment failed"
    exit 1
fi

# Wait for Traefik to be ready
echo "2. Waiting for Traefik to be ready..."
sleep 10

# Deploy application
echo "3. Deploying application..."
ansible-playbook -i inventory.ini app-deployment-playbook.yml

if [ $? -eq 0 ]; then
    echo "✓ Application deployed successfully"
else
    echo "✗ Application deployment failed"
    exit 1
fi

# Wait for application to be ready
echo "4. Waiting for application to be ready..."
sleep 15

# Test the deployment
echo "5. Testing deployment..."
echo "Testing HTTP redirect..."
curl -I -s http://adb.sapalo.dev | head -1

echo "Testing HTTPS..."
curl -I -s https://adb.sapalo.dev | head -1

echo ""
echo "=== Deployment Complete ==="
echo "Your application should be available at: https://adb.sapalo.dev"
echo "Traefik dashboard: http://4.193.207.59:8080/dashboard/"
echo ""
echo "If you're still getting SSL errors, run the troubleshooting script:"
echo "bash troubleshoot-traefik.sh" 