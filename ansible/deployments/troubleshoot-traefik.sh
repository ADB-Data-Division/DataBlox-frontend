#!/bin/bash

echo "=== Traefik SSL Configuration Troubleshooting ==="
echo ""

# Check if Traefik is running
echo "1. Checking Traefik container status..."
sudo docker ps | grep traefik
if [ $? -eq 0 ]; then
    echo "✓ Traefik is running"
else
    echo "✗ Traefik is not running"
    exit 1
fi
echo ""

# Check Traefik network
echo "2. Checking Traefik network..."
sudo docker network ls | grep traefik
if [ $? -eq 0 ]; then
    echo "✓ Traefik network exists"
else
    echo "✗ Traefik network not found"
fi
echo ""

# Check app container
echo "3. Checking application container..."
sudo docker ps | grep capacity-building-viz
if [ $? -eq 0 ]; then
    echo "✓ Application container is running"
else
    echo "✗ Application container is not running"
fi
echo ""

# Check Traefik logs for errors
echo "4. Checking Traefik logs (last 20 lines)..."
sudo docker logs traefik --tail 20
echo ""

# Check app logs for errors
echo "5. Checking application logs (last 10 lines)..."
sudo docker logs capacity-building-viz --tail 10
echo ""

# Check Traefik API for routers
echo "6. Checking Traefik routers configuration..."
curl -s http://localhost:8080/api/http/routers | jq '.' || echo "jq not installed, showing raw output:" && curl -s http://localhost:8080/api/http/routers
echo ""

# Check certificates
echo "7. Checking Let's Encrypt certificates..."
curl -s http://localhost:8080/api/http/routers | jq '.[] | select(.tls) | {name, rule, tls}' || echo "No TLS routers found or jq not available"
echo ""

# Check ACME configuration
echo "8. Checking ACME configuration..."
if [ -f /home/azureuser/traefik/acme.json ]; then
    echo "✓ acme.json exists"
    ls -la /home/azureuser/traefik/acme.json
    echo "File contents size: $(wc -c < /home/azureuser/traefik/acme.json) bytes"
else
    echo "✗ acme.json not found"
fi
echo ""

# Test domain resolution
echo "9. Testing domain resolution..."
nslookup adb.sapalo.dev
echo ""

# Test port connectivity
echo "10. Testing port connectivity..."
echo "Port 80:"
sudo netstat -tlnp | grep :80
echo "Port 443:"
sudo netstat -tlnp | grep :443
echo ""

# Test SSL certificate
echo "11. Testing SSL certificate..."
echo "Checking SSL certificate for adb.sapalo.dev..."
echo | openssl s_client -servername adb.sapalo.dev -connect adb.sapalo.dev:443 2>&1 | grep -A 5 -B 5 "Certificate chain\|Verify return code"
echo ""

echo "=== Troubleshooting Complete ==="
echo ""
echo "If you're still having issues:"
echo "1. Make sure your domain DNS points to this server's IP"
echo "2. Check that ports 80 and 443 are open in your firewall"
echo "3. Verify the email in traefik.yml is correct"
echo "4. Check if Let's Encrypt rate limits are hit"
echo "5. Review the Traefik logs for specific errors" 