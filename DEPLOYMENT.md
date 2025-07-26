# Kemi Crypto Platform - Single Container Deployment

## 🎯 **Solution: Single Container with Both Services**

Your project now uses a **single Dockerfile** that runs both the frontend and backend together using **supervisord** as a process manager.

## 🏗️ **Architecture**

```
┌─────────────────────────────────────┐
│           Single Container          │
├─────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  │
│  │   Nginx     │  │   FastAPI    │  │
│  │  (Port 80)  │  │ (Port 8000)  │  │
│  │  Frontend   │  │   Backend    │  │
│  └─────────────┘  └──────────────┘  │
│           Supervisord               │
└─────────────────────────────────────┘
```

## 🚀 **Deployment Steps**

### **Step 1: Deploy to Render**

1. **Go to [Render Dashboard](https://dashboard.render.com)**
2. **Click "New +" → "Web Service"**
3. **Connect your GitHub repository**: `chumbacash/kemi`
4. **Configure the service**:

   - **Name**: `kemi-crypto-platform`
   - **Environment**: Docker
   - **Branch**: `main`
   - **Build Command**: `docker build -t kemi-platform .`
   - **Start Command**: `docker run -p $PORT:80 kemi-platform`

5. **Set Environment Variables**:
   ```
   GEMINI_API_KEY=your_gemini_api_key
   COINGECKO_API_KEY=your_coingecko_api_key
   ```

6. **Deploy!**

### **Step 2: How It Works**

- **Nginx** serves the React frontend on port 80
- **FastAPI** runs the backend API on port 8000
- **Supervisord** manages both processes
- **Nginx proxies** `/api/*` requests to the backend
- **Frontend makes API calls** to `/api/endpoint`

## 🔧 **Local Development**

```bash
# Build and run locally
docker build -t kemi-platform .
docker run -p 3000:80 -p 8000:8000 kemi-platform

# Access:
# Frontend: http://localhost:3000
# Backend: http://localhost:8000
```

## 📁 **Key Files**

- `Dockerfile` - Multi-stage build for both services
- `supervisord.conf` - Process manager configuration
- `kemi-crypto/nginx.conf` - Nginx with API proxy
- `kemi-crypto/src/services/kemiApiService.ts` - Frontend API client

## ✅ **Benefits**

1. **Single deployment** - No need for separate services
2. **Simplified architecture** - Everything in one container
3. **Cost effective** - Only one service to pay for
4. **Easy scaling** - Scale the entire application together
5. **No CORS issues** - Same origin for frontend and API

## 🐛 **Troubleshooting**

- **Check logs**: Render provides logs for both nginx and backend
- **Health check**: Visit `/health` to verify the service is running
- **API test**: Try `/api/health` to test the backend directly 