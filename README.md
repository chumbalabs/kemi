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
git clone https://github.com/chumbacash/kemi.git
cd kemi

# Copy environment template
cp .env.example .env

# Edit .env and add your API keys
# GEMINI_API_KEY=your_actual_api_key_here
# COINGECKO_API_KEY=your_coingecko_key_here (optional)

# Build and start containers
docker-compose up --build -d
```

**Docker Commands:**
```bash
# Start containers
docker-compose up -d

# Build and start containers
docker-compose up --build -d

# Stop containers
docker-compose down

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f kemi-api
docker-compose logs -f kemi-frontend

# Restart containers
docker-compose restart

# Check container status
docker-compose ps
```

**Access Points:**
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
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

The platform uses a simple Docker setup:

### Services
- **kemi-api**: FastAPI backend with Python 3.11
- **kemi-frontend**: React frontend served by Nginx

### Networks
- **kemi-network**: Bridge network for inter-container communication

### Features
- Multi-stage frontend build (Node.js build → Nginx serve)
- API proxy configuration in Nginx
- Environment variable support
- Container health monitoring

## 🔍 Troubleshooting

### Docker Issues

**Containers won't start:**
```bash
# Check container logs
docker-compose logs -f

# Check specific service logs
docker-compose logs -f kemi-api
docker-compose logs -f kemi-frontend

# Check container status
docker-compose ps

# Rebuild containers
docker-compose up --build --force-recreate
```

**Port conflicts:**
```bash
# Check what's using the ports (Windows)
netstat -an | findstr :8000
netstat -an | findstr :3000

# Stop conflicting services or change ports in docker-compose.yml
```

**Environment variables not loading:**
```bash
# Ensure .env file exists and has correct format
type .env

# Restart containers after .env changes
docker-compose restart
```

### API Issues

**Gemini AI not working:**
- Verify `GEMINI_API_KEY` is set in `.env`
- Check API key validity at [Google AI Studio](https://ai.google.dev/)
- Review backend logs: `docker-compose logs -f kemi-api`

**CoinGecko rate limits:**
- Add `COINGECKO_API_KEY` to `.env` for higher limits
- Check rate limiting in backend logs

### Frontend Issues

**Build failures:**
```bash
# Clear containers and rebuild
docker-compose down
docker system prune -f
docker-compose up --build -d
```

## 🔧 Development

### 🐳 Docker Development Environment

The recommended way to develop is using Docker:

```bash
# Start containers with live reload
docker-compose up --build -d

# View logs
docker-compose logs -f

# Access services:
# - Frontend: http://localhost:3000
# - Backend API: http://localhost:8000 (with auto-reload)
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
├── docker-compose.yml    # Docker Compose configuration
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

**Docker Deployment:**
```bash
# Build and start containers
docker-compose up --build -d
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