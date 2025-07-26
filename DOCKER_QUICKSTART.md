# 🐳 Docker Quick Start Guide

This guide will get you up and running with the Kemi Crypto Platform using Docker in under 5 minutes.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed
- [Gemini API Key](https://ai.google.dev/gemini-api/docs) (required)
- [CoinGecko API Key](https://www.coingecko.com/en/api) (optional, for higher rate limits)

## Quick Start

### 1. Clone and Setup

```bash
# Clone the repository
git clone https://github.com/chumbacash/kemi.git
cd kemi

# Copy environment template
cp .env.example .env
```

### 2. Configure API Keys

Edit the `.env` file and add your API keys:

```bash
# Required
GEMINI_API_KEY=your_actual_gemini_api_key_here

# Optional (for higher rate limits)
COINGECKO_API_KEY=your_coingecko_api_key_here
```

### 3. Start the Platform

Choose one of these methods:

#### Option A: Using Setup Script (Recommended)

**Linux/Mac:**
```bash
./setup-docker.sh start prod
```

**Windows:**
```cmd
setup-docker.bat start prod
```

#### Option B: Using Make (Linux/Mac only)
```bash
make start
```

#### Option C: Using Docker Compose Directly
```bash
docker-compose up --build -d
```

### 4. Access the Platform

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## Development Mode

For development with hot reload:

```bash
# Linux/Mac
./setup-docker.sh start dev

# Windows
setup-docker.bat start dev

# Or with Make
make dev-start
```

**Development URLs:**
- **Frontend**: http://localhost:5173 (with hot reload)
- **Backend API**: http://localhost:8000 (with auto-reload)

## Common Commands

### Managing Containers

```bash
# Stop containers
./setup-docker.sh stop prod

# Restart containers
./setup-docker.sh restart prod

# View logs
./setup-docker.sh logs prod

# View specific service logs
./setup-docker.sh logs prod kemi-api
```

### Using Make Commands

```bash
# Start production
make start

# Start development
make dev-start

# View logs
make logs

# Stop containers
make stop

# Clean up
make clean
```

## Troubleshooting

### Common Issues

**1. Port Already in Use**
```bash
# Check what's using the port
netstat -tulpn | grep :3000
netstat -tulpn | grep :8000

# Stop conflicting services or change ports in docker-compose.yml
```

**2. Containers Won't Start**
```bash
# Check logs
./setup-docker.sh logs prod

# Rebuild containers
docker-compose up --build --force-recreate
```

**3. API Key Issues**
```bash
# Verify .env file
cat .env

# Restart containers after .env changes
./setup-docker.sh restart prod
```

**4. Build Failures**
```bash
# Clean Docker cache
docker system prune -f

# Rebuild from scratch
make rebuild
```

### Health Checks

```bash
# Check container status
docker-compose ps

# Test API health
curl http://localhost:8000/api/health

# Test frontend
curl http://localhost:3000/
```

## File Structure

```
kemi/
├── docker-compose.yml          # Production Docker setup
├── docker-compose.dev.yml      # Development Docker setup
├── setup-docker.sh            # Setup script (Linux/Mac)
├── setup-docker.bat           # Setup script (Windows)
├── Makefile                   # Make commands
├── .env.example               # Environment template
├── .env                       # Your environment config
├── kemi-api/                  # Backend application
│   └── Dockerfile            # Backend Docker config
└── kemi-crypto/              # Frontend application
    ├── Dockerfile            # Frontend production config
    └── Dockerfile.dev        # Frontend development config
```

## Next Steps

1. **Explore the API**: Visit http://localhost:8000/docs for interactive API documentation
2. **Customize**: Modify the code and see changes reflected immediately in development mode
3. **Deploy**: Use the production setup for deployment to your server
4. **Monitor**: Check logs and health endpoints for monitoring

## Support

- **Issues**: Report problems via GitHub issues
- **Documentation**: Check the main README.md for detailed information
- **API Reference**: http://localhost:8000/docs when running

Happy coding! 🚀