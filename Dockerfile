# Stage 1: Dependencies and Build
FROM node:20-slim AS builder

WORKDIR /app

# Install yarn and necessary tools for ARM64 optimization
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    lsb-release \
    && curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | tee /etc/apt/trusted.gpg.d/yarn.asc \
    && echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list \
    && apt-get update && apt-get install -y yarn \
    && rm -rf /var/lib/apt/lists/*

# Set production environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy package files first for better caching
COPY package.json package-lock.json ./

# Install dependencies with optimizations for ARM64
RUN npm ci --only=production --frozen-lockfile && \
    npm ci --only=development --frozen-lockfile && \
    npm cache clean --force

# Copy application files
COPY . .

# Build the application with sample values that will be replaced with placeholders
# These values should be distinct enough to not appear elsewhere in your code
ENV NEXT_PUBLIC_URL="https://placeholder-app.sapalo.dev"
ENV NEXT_PUBLIC_BACKEND_URL="https://placeholder-backend.sapalo.de/api/v1"
ENV NEXT_PUBLIC_GRAPHQL_URL="https://placeholder-hasura.sapalo.dev/v1/graphql"
ENV NEXT_PUBLIC_AUTH0_DOMAIN="placeholder-auth.sapalo.dev"
ENV NEXT_PUBLIC_AUTH0_CLIENT_ID="placeholder-client-id-12345"
ENV NEXT_PUBLIC_AUTH0_REDIRECT_URI="https://placeholder-app.sapalo.dev/api/auth/callback"
ENV NEXT_PUBLIC_AUTH0_AUDIENCE="https://placeholder-audience.sapalo.dev/v1/graphql"
ENV NEXT_PUBLIC_GA_MEASUREMENT_ID="G-PLACEHOLDER1234"

# Build with these placeholder values and run replacement in one layer
RUN npm run build && \
    node replace-placeholders.mjs

# Stage 2: Production - Optimized for ARM64
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install required tools for the entrypoint script in one layer
RUN apt-get update && apt-get install -y \
    findutils \
    grep \
    sed \
    && rm -rf /var/lib/apt/lists/* \
    && addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Copy files from builder stage
COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next && chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy the entrypoint script and create health check in one layer
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh && \
    echo '#!/bin/sh\necho "OK"' > /app/health.sh && \
    chmod +x /app/health.sh

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 CMD [ "/app/health.sh" ]
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "server.js"]