# Multi-stage build for production deployment
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy frontend package files
COPY kemi-crypto/package*.json ./

# Install dependencies
RUN npm ci

# Copy frontend source code
COPY kemi-crypto/ .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine AS production

# Install envsubst for environment variable substitution
RUN apk add --no-cache bash

# Copy built application from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx template and startup script
COPY kemi-crypto/nginx.conf.template /etc/nginx/nginx.conf.template
COPY kemi-crypto/start.sh /start.sh

# Make startup script executable
RUN chmod +x /start.sh

# Expose port 80 (Render will map this)
EXPOSE 80

# Use startup script as entry point
CMD ["/start.sh"] 