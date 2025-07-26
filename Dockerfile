# Build the frontend
FROM node:20-alpine AS builder
WORKDIR /app
COPY kemi-crypto/package*.json ./
RUN npm ci
COPY kemi-crypto/ .
RUN npm run build

# Serve with nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY kemi-crypto/nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"] 