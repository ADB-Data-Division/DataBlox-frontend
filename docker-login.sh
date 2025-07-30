#!/bin/bash

# Docker login script for GitHub Container Registry
# Usage: ./docker-login.sh

SECRETS_FILE="./secrets/github-creds.yml"
REGISTRY="ghcr.io"

echo "Logging into GitHub Container Registry..."

# Check if secrets file exists
if [ ! -f "$SECRETS_FILE" ]; then
    echo "❌ Secrets file not found: $SECRETS_FILE"
    echo "Please create it with:"
    echo "github_username: your-username"
    echo "github_token: your-personal-access-token"
    exit 1
fi

# Extract username and token from YAML file
USERNAME=$(grep "github_username:" "$SECRETS_FILE" | cut -d: -f2 | xargs)
TOKEN=$(grep "github_token:" "$SECRETS_FILE" | cut -d: -f2 | xargs)

if [ -z "$USERNAME" ] || [ -z "$TOKEN" ]; then
    echo "❌ Could not read username or token from $SECRETS_FILE"
    exit 1
fi

echo "Username: $USERNAME"
echo "Registry: $REGISTRY"
echo ""

# Login using the token
echo "$TOKEN" | docker login $REGISTRY -u "$USERNAME" --password-stdin

if [ $? -eq 0 ]; then
    echo "✅ Successfully logged into GitHub Container Registry"
    echo "You can now run: npm run build-image && npm run push-image"
else
    echo "❌ Login failed"
    exit 1
fi 