# Kemi Crypto Platform - Deployment Guide

This guide covers deploying the Kemi Crypto Platform on Render, addressing the "failed to solve with frontend dockerfile.v0" error and providing multiple deployment strategies.

## 🚨 Problem Analysis

The error `failed to solve: failed to read dockerfile: open Dockerfile: no such file or directory` occurs because:

1. **Render expects a single `Dockerfile` in the root directory**
2. **Your project uses Docker Compose with separate Dockerfiles in subdirectories**
3. **Render doesn't natively support Docker Compose deployments**

## 🛠️ Solution Options

### Option 1: Single Container Deployment (Frontend Only)

This approach deploys only the frontend and requires a separate backend deployment.

#### Step 1: Deploy Backend API Separately

1. **Create a new Web Service on Render**
   - **Name**: `kemi-api`
   - **Environment**: Docker
   - **Build Command**: `docker build -f Dockerfile.backend -t kemi-api .`
   - **Start Command**: `docker run -p $PORT:8000 kemi-api`

2. **Set Environment Variables**:
   ```
   GEMINI_API_KEY=your_gemini_api_key
   COINGECKO_API_KEY=your_coingecko_api_key
   ```

3. **Deploy and note the URL** (e.g., `https://kemi-api.onrender.com`)

#### Step 2: Deploy Frontend

1. **Create a new Web Service on Render**
   - **Name**: `kemi-crypto-platform`
   - **Environment**: Docker
   - **Build Command**: `docker build -t kemi-frontend .`
   - **Start Command**: `docker run -p $PORT:80 kemi-frontend`

2. **Set Environment Variables**:
   ```
   API_BASE_URL=https://your-backend-service.onrender.com
   VITE_API_BASE_URL=https://your-backend-service.onrender.com
   ```

### Option 2: Frontend with API Proxy (Recommended)

This approach uses the root `Dockerfile` that builds the frontend and proxies API calls to an external backend.

#### Step 1: Deploy Backend API

Follow the same steps as Option 1, Step 1.

#### Step 2: Deploy Frontend with Proxy

1. **Create a new Web Service on Render**
   - **Name**: `kemi-crypto-platform`
   - **Environment**: Docker
   - **Build Command**: `docker build -t kemi-frontend .`
   - **Start Command**: `docker run -p $PORT:80 kemi-frontend`

2. **Set Environment Variables**:
   ```
   API_BASE_URL=https://your-backend-service.onrender.com
   ```

3. **The nginx configuration will automatically proxy `/api/*` requests to your backend**

## 📋 Render Configuration

### Using render.yaml (Optional)

If you prefer using `render.yaml` for configuration:

```yaml
services:
  - type: web
    name: kemi-crypto-platform
    env: docker
    plan: starter
    region: oregon
    buildCommand: docker build -t kemi-crypto-platform .
    startCommand: docker run -p $PORT:80 kemi-crypto-platform
    envVars:
      - key: API_BASE_URL
        value: https://your-backend-service.onrender.com
        sync: false
      - key: GEMINI_API_KEY
        sync: false
      - key: COINGECKO_API_KEY
        sync: false
    healthCheckPath: /health
    autoDeploy: true
```

### Manual Configuration

1. **Go to [Render Dashboard](https://dashboard.render.com)**
2. **Click "New +" → "Web Service"**
3. **Connect your GitHub repository**
4. **Configure the service**:
   - **Name**: `kemi-crypto-platform`
   - **Environment**: Docker
   - **Branch**: `main`
   - **Build Command**: `docker build -t kemi-crypto-platform .`
   - **Start Command**: `docker run -p $PORT:80 kemi-crypto-platform`

## 🔧 Environment Variables

### Frontend Service
```
API_BASE_URL=https://your-backend-service.onrender.com
```

### Backend Service
```
GEMINI_API_KEY=your_gemini_api_key_here
COINGECKO_API_KEY=your_coingecko_api_key_here
```

## 🐳 Docker Build Context

The root `Dockerfile` is configured to:

1. **Build the frontend** from `kemi-crypto/` directory
2. **Use nginx** to serve the built application
3. **Proxy API calls** to the backend service
4. **Handle environment variables** through nginx template substitution

## 🔍 Troubleshooting

### Common Issues

1. **Build fails with "no such file or directory"**
   - Ensure you're using the root `Dockerfile` (not the ones in subdirectories)
   - Verify the repository structure matches the Dockerfile expectations

2. **API calls fail**
   - Check that `API_BASE_URL` environment variable is set correctly
   - Verify the backend service is running and accessible
   - Check nginx logs for proxy errors

3. **Environment variables not loading**
   - Ensure variables are set in Render dashboard
   - Check that variable names match exactly (case-sensitive)

### Debugging Commands

```bash
# Test the Docker build locally
docker build -t kemi-test .

# Run the container locally
docker run -p 3000:80 -e API_BASE_URL=http://localhost:8000 kemi-test

# Check nginx configuration
docker exec -it <container_id> cat /etc/nginx/nginx.conf
```

## 📊 Performance Optimization

1. **Use `.dockerignore`** to exclude unnecessary files
2. **Multi-stage builds** reduce final image size
3. **Nginx caching** for static assets
4. **Gzip compression** enabled in nginx

## 🔒 Security Considerations

1. **Non-root user** in backend container
2. **Security headers** in nginx configuration
3. **Environment variables** for sensitive data
4. **Health checks** for monitoring

## 📈 Monitoring

- **Health check endpoint**: `/health`
- **Nginx access logs**: Available in Render logs
- **Application logs**: Available in Render logs

## 🚀 Next Steps

1. **Deploy backend service first**
2. **Deploy frontend service with correct API URL**
3. **Test all functionality**
4. **Set up custom domain (optional)**
5. **Configure monitoring and alerts**

## 📚 References

- [Render Docker Deployments](https://render.com/docs/deploy-an-image)
- [Docker Build Context Issues](https://medium.com/@maheshwar.ramkrushna/understanding-the-docker-failed-to-compute-cache-key-error-c1b97a296a23)
- [Nginx Environment Variables](https://www.devzero.io/blog/how-to-fix-failed-to-solve-with-frontend-dockerfile-v0-error) 