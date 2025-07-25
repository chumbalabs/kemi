# Kemi Crypto Platform

A modern cryptocurrency analysis platform with AI-powered insights using Gemini AI, real-time data from CoinGecko, and comprehensive technical analysis.

![Kemi Crypto Platform](https://via.placeholder.com/800x400/1a1a1a/ffffff?text=Kemi+Crypto+Platform)

## 🚀 Features

- **Real-time Cryptocurrency Data**: Live market data from CoinGecko via MCP
- **AI-Powered Analysis**: Intelligent market insights using Google's Gemini AI
- **Technical Analysis**: 15+ technical indicators (RSI, MACD, Bollinger Bands, etc.)
- **Interactive Charts**: Beautiful price charts with technical overlays
- **Individual Coin Analysis**: Detailed analysis pages for each cryptocurrency
- **Responsive Design**: Modern UI built with React and Tailwind CSS

## 🏗️ Architecture

### Backend (kemi-api)
- **FastAPI** - High-performance Python web framework
- **MCP Integration** - Model Context Protocol for CoinGecko data
- **Gemini AI** - Google's latest AI model for market analysis
- **Technical Analysis** - Custom implementation of trading indicators
- **Caching & Rate Limiting** - Optimized for production use

### Frontend (kemi-crypto)
- **React 19** - Latest React with TypeScript
- **Tailwind CSS** - Utility-first CSS framework
- **Chart.js** - Interactive cryptocurrency charts
- **Vite** - Fast build tool and dev server

## 🛠️ Quick Setup

### Prerequisites
- **Docker & Docker Compose** (Recommended)
- OR Python 3.8+ and Node.js 16+ for manual setup
- **Gemini API Key** ([Get one here](https://ai.google.dev/gemini-api/docs))

### 🐳 Docker Setup (Recommended)

The easiest way to run the platform is using Docker:

```bash
# Clone the repository
git clone <your-repo-url>
cd kemi-crypto-platform

# Copy environment template
cp .env.example .env

# Edit .env and add your API keys
# GEMINI_API_KEY=your_actual_api_key_here
# COINGECKO_API_KEY=your_coingecko_key_here (optional)

# Start production environment
./setup-docker.sh start prod

# OR start development environment
./setup-docker.sh start dev
```

**Docker Commands:**
```bash
# Start containers
./setup-docker.sh start [dev|prod]

# Stop containers
./setup-docker.sh stop [dev|prod]

# View logs
./setup-docker.sh logs [dev|prod] [service]

# Restart containers
./setup-docker.sh restart [dev|prod]

# Clean up Docker resources
./setup-docker.sh cleanup
```

**Access Points:**
- **Production**: Frontend at http://localhost:3000, API at http://localhost:8000
- **Development**: Frontend at http://localhost:5173, API at http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

### 🔧 Manual Setup

If you prefer to run without Docker:

1. **Environment Configuration**
   ```bash
   # Copy the environment template
   cp .env.example .env
   
   # Edit .env and add your API keys
   GEMINI_API_KEY=your_actual_api_key_here
   COINGECKO_API_KEY=your_coingecko_key_here
   ```

2. **Backend Setup**
   ```bash
   cd kemi-api
   pip install -r requirements.txt
   python main.py
   ```

3. **Frontend Setup**
   ```bash
   cd kemi-crypto
   npm install
   npm run dev
   ```

4. **Access the Platform**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

## 🔑 API Keys

### Gemini AI API Key
1. Visit [Google AI Studio](https://ai.google.dev/gemini-api/docs)
2. Create a new API key
3. Add it to your `.env` file:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```

### CoinGecko API Key (Optional)
For higher rate limits, get a free API key from [CoinGecko](https://www.coingecko.com/en/api):
```
COINGECKO_API_KEY=your_coingecko_key_here
```

## 📊 Technical Analysis Features

The platform provides comprehensive technical analysis including:

- **Trend Analysis**: SMA, EMA, trend strength
- **Momentum Indicators**: RSI, MACD, momentum signals
- **Volatility**: Bollinger Bands, price volatility
- **Support/Resistance**: Key price levels
- **Volume Analysis**: Volume trends and patterns
- **Trading Signals**: Buy/sell/hold recommendations

## 🤖 AI Analysis

Powered by Google's Gemini AI, the platform provides:

- **Market Overview**: Current market position analysis
- **Technical Interpretation**: AI explanation of technical indicators
- **Risk Assessment**: Volatility and risk analysis
- **Trading Insights**: Short and medium-term outlook
- **Investment Perspective**: Fundamental analysis considerations

## 🐳 Docker Architecture

The platform uses a multi-container Docker setup:

### Services
- **kemi-api**: FastAPI backend with Python 3.11
- **kemi-frontend**: React frontend served by Nginx
- **redis**: Redis cache for improved performance

### Networks
- **kemi-network**: Bridge network for inter-container communication

### Volumes
- **redis_data**: Persistent storage for Redis cache

### Health Checks
All services include health checks for monitoring:
- API health endpoint: `/api/health`
- Frontend availability check
- Redis ping check

## 🔍 Troubleshooting

### Docker Issues

**Containers won't start:**
```bash
# Check container logs
./setup-docker.sh logs [dev|prod] [service_name]

# Check container status
docker-compose ps

# Rebuild containers
docker-compose up --build --force-recreate
```

**Port conflicts:**
```bash
# Check what's using the ports
netstat -tulpn | grep :8000
netstat -tulpn | grep :3000

# Stop conflicting services or change ports in docker-compose.yml
```

**Environment variables not loading:**
```bash
# Ensure .env file exists and has correct format
cat .env

# Restart containers after .env changes
./setup-docker.sh restart [dev|prod]
```

### API Issues

**Gemini AI not working:**
- Verify `GEMINI_API_KEY` is set in `.env`
- Check API key validity at [Google AI Studio](https://ai.google.dev/)
- Review backend logs: `./setup-docker.sh logs prod kemi-api`

**CoinGecko rate limits:**
- Add `COINGECKO_API_KEY` to `.env` for higher limits
- Check rate limiting in backend logs

### Frontend Issues

**Build failures:**
```bash
# Clear node_modules and rebuild
docker-compose down
docker system prune -f
./setup-docker.sh start [dev|prod]
```

## 🔧 Development

### 🐳 Docker Development Environment

The recommended way to develop is using Docker:

```bash
# Start development environment
./setup-docker.sh start dev

# View development logs
./setup-docker.sh logs dev

# Access development services:
# - Frontend: http://localhost:5173 (with hot reload)
# - Backend: http://localhost:8000 (with auto-reload)
# - Redis: localhost:6379
```

### 🛠️ Local Development (Without Docker)

If you prefer local development:

### Project Structure
```
kemi-crypto-platform/
├── kemi-api/              # Backend FastAPI application
│   ├── main.py           # API server entry point
│   ├── ai_analysis.py    # Gemini AI integration
│   ├── technical_analysis.py # Technical indicators
│   ├── coin_analysis.py  # Coin analysis endpoints
│   ├── mcp_manager.py    # MCP client management
│   ├── Dockerfile        # Backend Docker configuration
│   └── requirements.txt  # Python dependencies
├── kemi-crypto/          # Frontend React application
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── services/     # API services
│   │   └── types/        # TypeScript types
│   ├── Dockerfile        # Frontend production Docker config
│   ├── Dockerfile.dev    # Frontend development Docker config
│   ├── nginx.conf        # Nginx configuration for production
│   └── package.json      # Node.js dependencies
├── docker-compose.yml    # Production Docker Compose
├── docker-compose.dev.yml # Development Docker Compose
├── setup-docker.sh       # Docker setup script
├── .env.example          # Environment template
├── .env                  # Environment configuration (create from .env.example)
└── .gitignore           # Git ignore rules
```

### API Endpoints

#### Market Data
- `GET /api/trending` - Trending cryptocurrencies
- `GET /api/top-gainers-losers` - Top gainers and losers
- `GET /api/global` - Global market data
- `GET /api/coins/markets` - Market data for coins

#### Coin Analysis
- `GET /api/coins/{coin_id}/analysis` - Complete AI + technical analysis
- `GET /api/coins/{coin_id}/technical` - Technical analysis only
- `GET /api/coins/{coin_id}/ohlc` - OHLC price data

#### System
- `GET /api/health` - Health check
- `GET /api/cache/stats` - Cache statistics

## 🚀 Deployment

### 🐳 Docker Deployment (Recommended)

**Production Deployment:**
```bash
# Build and start production containers
docker-compose up --build -d

# Or use the setup script
./setup-docker.sh start prod
```

**Development Deployment:**
```bash
# Build and start development containers
docker-compose -f docker-compose.dev.yml up --build -d

# Or use the setup script
./setup-docker.sh start dev
```

**Container Management:**
```bash
# View container status
docker-compose ps

# View logs
docker-compose logs -f [service_name]

# Stop containers
docker-compose down

# Rebuild containers
docker-compose up --build
```

### 🔧 Manual Deployment

**Backend Deployment:**
```bash
cd kemi-api
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

**Frontend Deployment:**
```bash
cd kemi-crypto
npm install
npm run build
# Serve the dist/ folder with your preferred web server
```

### 🌐 Production Considerations

- **Environment Variables**: Ensure all required API keys are set in `.env`
- **Security**: Use HTTPS in production and secure your API keys
- **Scaling**: Use Docker Swarm or Kubernetes for horizontal scaling
- **Monitoring**: Implement logging and monitoring for production deployments
- **Backup**: Regular backups of any persistent data

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- **Documentation**: Check the `/docs` endpoint for API documentation
- **Issues**: Report bugs and feature requests via GitHub issues
- **Gemini AI**: [Official documentation](https://ai.google.dev/gemini-api/docs)

## 🙏 Acknowledgments

- [CoinGecko](https://www.coingecko.com/) for cryptocurrency data
- [Google Gemini](https://ai.google.dev/) for AI analysis capabilities
- [Model Context Protocol](https://modelcontextprotocol.io/) for data integration
- [FastAPI](https://fastapi.tiangolo.com/) and [React](https://react.dev/) communities