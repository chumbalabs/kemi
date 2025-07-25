import asyncio
import os
from dotenv import load_dotenv
from ai_analysis import AIAnalyzer, CoinAnalysisData

# Load environment variables
load_dotenv('../.env')

async def test_ai_analysis():
    print("Testing AI Analysis...")
    
    # Check if API key is loaded
    api_key = os.getenv('GEMINI_API_KEY')
    print(f"API Key loaded: {'Yes' if api_key else 'No'}")
    
    # Create analyzer
    analyzer = AIAnalyzer()
    print(f"Gemini model available: {'Yes' if analyzer.gemini_model else 'No'}")
    
    if analyzer.gemini_model:
        # Create mock analysis data
        mock_data = CoinAnalysisData(
            coin_id="bitcoin",
            coin_name="Bitcoin",
            current_price=115000.0,
            market_cap=2300000000000,
            volume_24h=90000000000,
            price_change_24h=-2.5,
            technical_analysis={
                "indicators": {
                    "rsi": 58.5,
                    "macd": 2700.0,
                    "sma_20": 116000.0,
                    "sma_50": 110000.0
                },
                "signals": {
                    "trend": "neutral",
                    "recommendation": "buy",
                    "confidence": 75
                },
                "summary": {
                    "analysis_quality": "high"
                }
            },
            ohlc_data=[],
            coin_info={
                "description": "Bitcoin is the first cryptocurrency",
                "market_cap_rank": 1,
                "categories": ["Cryptocurrency"]
            }
        )
        
        # Test AI analysis
        try:
            result = await analyzer.generate_comprehensive_analysis(mock_data)
            print(f"Analysis provider: {result['provider']}")
            print(f"Analysis preview: {result['analysis'][:200]}...")
            print("✅ AI Analysis working!")
        except Exception as e:
            print(f"❌ AI Analysis failed: {e}")
    else:
        print("❌ Gemini model not initialized")

if __name__ == "__main__":
    asyncio.run(test_ai_analysis())