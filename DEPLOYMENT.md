# Kemi Crypto Platform - Simple Deployment Guide

## 🚨 Problem Solved

The error `failed to solve: failed to read dockerfile: open Dockerfile: no such file or directory` occurs because Render expects a single `Dockerfile` in the root directory.

## ✅ Simple Solution

### Step 1: Deploy Backend API

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

### Step 2: Deploy Frontend

1. **Create a new Web Service on Render**
   - **Name**: `kemi-crypto-platform`
   - **Environment**: Docker
   - **Build Command**: `docker build -t kemi-frontend .`
   - **Start Command**: `docker run -p $PORT:80 kemi-frontend`

2. **Set Environment Variable**:
   ```
   VITE_API_BASE_URL=https://your-backend-service.onrender.com
   ```

## 🔧 That's It!

- **Frontend**: Serves the React app
- **Backend**: Handles API requests
- **Communication**: Frontend makes direct API calls to backend URL

## 🐳 Local Testing

```bash
# Test the build locally
docker build -t kemi-test .

# Run locally
docker run -p 3000:80 kemi-test
```

## 📚 References

- [Render Docker Deployments](https://render.com/docs/deploy-an-image)
- [Docker Build Context Issues](https://medium.com/@maheshwar.ramkrushna/understanding-the-docker-failed-to-compute-cache-key-error-c1b97a296a23) 