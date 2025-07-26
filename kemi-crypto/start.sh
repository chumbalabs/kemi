#!/bin/sh

# Substitute environment variables in nginx configuration
envsubst '${API_BASE_URL}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

# Start nginx
exec nginx -g 'daemon off;' 