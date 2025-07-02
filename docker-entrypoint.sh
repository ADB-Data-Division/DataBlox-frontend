#!/bin/bash
set -e

# Check if .env.local exists and load environment variables from it
if [ -f /app/.env.local ]; then
  echo "Loading environment variables from .env.local"
  # Export variables from .env.local
  export $(grep -v '^#' /app/.env.local | xargs)
fi

# List of files that might contain environment variables
FILES_TO_PROCESS=$(find /app -type f -name "*.js" | grep -v "node_modules")

# Debug: Show the environment variables that will be used
echo "Using environment variables:"
echo "NEXT_PUBLIC_URL: ${NEXT_PUBLIC_URL:-not set}"
echo "NEXT_PUBLIC_BACKEND_URL: ${NEXT_PUBLIC_BACKEND_URL:-not set}"
echo "NEXT_PUBLIC_GRAPHQL_URL: ${NEXT_PUBLIC_GRAPHQL_URL:-not set}"
echo "NEXT_PUBLIC_AUTH0_DOMAIN: ${NEXT_PUBLIC_AUTH0_DOMAIN:-not set}"
echo "NEXT_PUBLIC_AUTH0_CLIENT_ID: ${NEXT_PUBLIC_AUTH0_CLIENT_ID:-not set}"
echo "NEXT_PUBLIC_AUTH0_REDIRECT_URI: ${NEXT_PUBLIC_AUTH0_REDIRECT_URI:-not set}"
echo "NEXT_PUBLIC_AUTH0_AUDIENCE: ${NEXT_PUBLIC_AUTH0_AUDIENCE:-not set}"
echo "NEXT_PUBLIC_GA_MEASUREMENT_ID: ${NEXT_PUBLIC_GA_MEASUREMENT_ID:-not set}"
echo "NEXT_PUBLIC_AMPLITUDE_API_KEY: ${NEXT_PUBLIC_AMPLITUDE_API_KEY:-not set}"

# Replace placeholders with actual environment variables
for file in $FILES_TO_PROCESS; do
  # Only process files that contain placeholders
  if grep -q "PLACEHOLDER_" "$file"; then
    echo "Processing $file"
    
    # Replace all placeholders with actual environment variables
    sed -i "s|PLACEHOLDER_URL|$NEXT_PUBLIC_URL|g" "$file"
    sed -i "s|PLACEHOLDER_BACKEND_URL|$NEXT_PUBLIC_BACKEND_URL|g" "$file"
    sed -i "s|PLACEHOLDER_GRAPHQL_URL|${NEXT_PUBLIC_GRAPHQL_URL:-}|g" "$file"
    sed -i "s|PLACEHOLDER_AUTH0_DOMAIN|${NEXT_PUBLIC_AUTH0_DOMAIN:-}|g" "$file"
    sed -i "s|PLACEHOLDER_AUTH0_CLIENT_ID|${NEXT_PUBLIC_AUTH0_CLIENT_ID:-}|g" "$file"
    sed -i "s|PLACEHOLDER_AUTH0_REDIRECT_URI|${NEXT_PUBLIC_AUTH0_REDIRECT_URI:-}|g" "$file"
    sed -i "s|PLACEHOLDER_AUTH0_AUDIENCE|${NEXT_PUBLIC_AUTH0_AUDIENCE:-}|g" "$file"
    sed -i "s|PLACEHOLDER_GA_MEASUREMENT_ID|${NEXT_PUBLIC_GA_MEASUREMENT_ID:-}|g" "$file"
    sed -i "s|PLACEHOLDER_AMPLITUDE_API_KEY|${NEXT_PUBLIC_AMPLITUDE_API_KEY:-}|g" "$file"
    echo "Completed processing $file"
  fi
done

echo "Environment variables have been injected into the application"

# Execute the main command
exec "$@" 