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
- Python 3.8+
- Node.js 16+
- Gemini API Key ([Get one here](https://ai.google.dev/gemini-api/docs))

### Automated Setup
```bash
# Clone the repository
git clone <your-repo-url>
cd kemi-crypto-platform

# Run the setup script
python setup.py
```

### Manual Setup

1. **Environment Configuration**
   ```bash
   # Copy the environment template
   cp .env.example .env
   
   # Edit .env and add your Gemini API key
   GEMINI_API_KEY=your_actual_api_key_here
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

## 🔧 Development

### Project Structure
```
kemi-crypto-platform/
├── kemi-api/              # Backend FastAPI application
│   ├── main.py           # API server entry point
│   ├── ai_analysis.py    # Gemini AI integration
│   ├── technical_analysis.py # Technical indicators
│   ├── coin_analysis.py  # Coin analysis endpoints
│   └── mcp_manager.py    # MCP client management
├── kemi-crypto/          # Frontend React application
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── services/     # API services
│   │   └── types/        # TypeScript types
│   └── package.json
├── .env                  # Unified environment config
└── setup.py             # Setup script
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

### Backend Deployment
```bash
cd kemi-api
uvicorn main:app --host 0.0.0.0 --port 8000
```

### Frontend Deployment
```bash
cd kemi-crypto
npm run build
# Serve the dist/ folder with your preferred web server
```

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