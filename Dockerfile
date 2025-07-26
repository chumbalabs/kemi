# Multi-stage build for both frontend and backend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY kemi-crypto/package*.json ./
RUN npm ci
COPY kemi-crypto/ ./
RUN npm run build

FROM python:3.11-slim AS backend-builder
WORKDIR /app/backend
COPY kemi-api/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Production stage
FROM python:3.11-slim

# Install nginx and supervisor
RUN apt-get update && apt-get install -y \
    nginx \
    supervisor \
    && rm -rf /var/lib/apt/lists/*

# Set up directories
WORKDIR /app
COPY --from=frontend-builder /app/frontend/dist /var/www/html
COPY --from=backend-builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY kemi-api/ ./backend/

# Copy nginx configuration
COPY kemi-crypto/nginx.conf /etc/nginx/nginx.conf

# Copy supervisor configuration
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Create non-root user
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app /var/www/html /var/log/nginx

# Expose ports
EXPOSE 80 8000

# Start supervisor
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"] 