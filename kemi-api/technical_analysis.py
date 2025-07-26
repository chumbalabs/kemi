"""
Technical Analysis Module for Cryptocurrency Data
Provides various technical indicators and analysis functions
"""

import numpy as np
import pandas as pd
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime, timedelta
import json
from price_formatter import round_to_precision, get_price_precision

@dataclass
class TechnicalIndicators:
    """Data class for technical indicators"""
    sma_20: float
    sma_50: float
    ema_12: float
    ema_26: float
    rsi: float
    macd: float
    macd_signal: float
    macd_histogram: float
    bollinger_upper: float
    bollinger_lower: float
    bollinger_middle: float
    support_level: float
    resistance_level: float
    volume_sma: float
    price_change_24h: float
    volatility: float

@dataclass
class MarketSignals:
    """Market signals and recommendations"""
    trend: str  # "bullish", "bearish", "neutral"
    strength: str  # "strong", "moderate", "weak"
    recommendation: str  # "buy", "sell", "hold"
    confidence: float  # 0-100
    key_levels: Dict[str, float]
    signals: List[str]

class TechnicalAnalyzer:
    """Technical analysis calculator"""
    
    def __init__(self):
        self.min_data_points = 50  # Minimum data points for reliable analysis
    
    def calculate_sma(self, prices: np.ndarray, period: int) -> float:
        """Calculate Simple Moving Average"""
        if len(prices) < period:
            return prices[-1] if len(prices) > 0 else 0.0
        return np.mean(prices[-period:])
    
    def calculate_ema(self, prices: np.ndarray, period: int) -> float:
        """Calculate Exponential Moving Average"""
        if len(prices) < period:
            return prices[-1] if len(prices) > 0 else 0.0
        
        multiplier = 2 / (period + 1)
        ema = prices[0]
        
        for price in prices[1:]:
            ema = (price * multiplier) + (ema * (1 - multiplier))
        
        return ema
    
    def calculate_rsi(self, prices: np.ndarray, period: int = 14) -> float:
        """Calculate Relative Strength Index"""
        if len(prices) < period + 1:
            return 50.0  # Neutral RSI
        
        deltas = np.diff(prices)
        gains = np.where(deltas > 0, deltas, 0)
        losses = np.where(deltas < 0, -deltas, 0)
        
        avg_gain = np.mean(gains[-period:])
        avg_loss = np.mean(losses[-period:])
        
        if avg_loss == 0:
            return 100.0
        
        rs = avg_gain / avg_loss
        rsi = 100 - (100 / (1 + rs))
        
        return rsi
    
    def calculate_macd(self, prices: np.ndarray, fast: int = 12, slow: int = 26, signal: int = 9) -> Tuple[float, float, float]:
        """Calculate MACD, Signal line, and Histogram"""
        if len(prices) < slow:
            return 0.0, 0.0, 0.0
        
        ema_fast = self.calculate_ema(prices, fast)
        ema_slow = self.calculate_ema(prices, slow)
        macd_line = ema_fast - ema_slow
        
        # For signal line, we need more historical MACD values
        # Simplified calculation for current implementation
        signal_line = macd_line * 0.8  # Approximation
        histogram = macd_line - signal_line
        
        return macd_line, signal_line, histogram
    
    def calculate_bollinger_bands(self, prices: np.ndarray, period: int = 20, std_dev: float = 2) -> Tuple[float, float, float]:
        """Calculate Bollinger Bands"""
        if len(prices) < period:
            current_price = prices[-1] if len(prices) > 0 else 0.0
            return current_price, current_price, current_price
        
        sma = self.calculate_sma(prices, period)
        std = np.std(prices[-period:])
        
        upper_band = sma + (std * std_dev)
        lower_band = sma - (std * std_dev)
        
        return upper_band, lower_band, sma
    
    def find_support_resistance(self, prices: np.ndarray, volumes: np.ndarray = None) -> Tuple[float, float]:
        """Find support and resistance levels"""
        if len(prices) < 10:
            current_price = prices[-1] if len(prices) > 0 else 0.0
            return current_price * 0.95, current_price * 1.05
        
        # Find local minima and maxima
        recent_prices = prices[-50:] if len(prices) >= 50 else prices
        
        # Support: recent low levels
        support_candidates = []
        for i in range(2, len(recent_prices) - 2):
            if (recent_prices[i] < recent_prices[i-1] and 
                recent_prices[i] < recent_prices[i-2] and
                recent_prices[i] < recent_prices[i+1] and 
                recent_prices[i] < recent_prices[i+2]):
                support_candidates.append(recent_prices[i])
        
        # Resistance: recent high levels
        resistance_candidates = []
        for i in range(2, len(recent_prices) - 2):
            if (recent_prices[i] > recent_prices[i-1] and 
                recent_prices[i] > recent_prices[i-2] and
                recent_prices[i] > recent_prices[i+1] and 
                recent_prices[i] > recent_prices[i+2]):
                resistance_candidates.append(recent_prices[i])
        
        # Get the most relevant levels
        support = np.mean(support_candidates) if support_candidates else np.min(recent_prices)
        resistance = np.mean(resistance_candidates) if resistance_candidates else np.max(recent_prices)
        
        return support, resistance
    
    def calculate_volatility(self, prices: np.ndarray, period: int = 20) -> float:
        """Calculate price volatility (standard deviation)"""
        if len(prices) < period:
            return 0.0
        
        returns = np.diff(prices[-period:]) / prices[-period:-1]
        return np.std(returns) * 100  # Convert to percentage
    
    def analyze_trend(self, prices: np.ndarray, volumes: np.ndarray = None) -> Dict[str, Any]:
        """Analyze overall trend and strength"""
        if len(prices) < 10:
            return {"trend": "neutral", "strength": "weak", "confidence": 0}
        
        # Short-term vs long-term trend
        short_sma = self.calculate_sma(prices, 10)
        long_sma = self.calculate_sma(prices, 20)
        
        # Price momentum
        price_change = (prices[-1] - prices[-10]) / prices[-10] * 100 if len(prices) >= 10 else 0
        
        # Determine trend
        if short_sma > long_sma and price_change > 2:
            trend = "bullish"
            strength = "strong" if price_change > 10 else "moderate"
        elif short_sma < long_sma and price_change < -2:
            trend = "bearish"
            strength = "strong" if price_change < -10 else "moderate"
        else:
            trend = "neutral"
            strength = "weak"
        
        # Calculate confidence based on data quality and consistency
        confidence = min(100, len(prices) * 2)  # More data = higher confidence
        
        return {
            "trend": trend,
            "strength": strength,
            "confidence": confidence,
            "price_change": price_change
        }
    
    def generate_signals(self, indicators: TechnicalIndicators, trend_analysis: Dict[str, Any]) -> MarketSignals:
        """Generate trading signals based on technical indicators"""
        signals = []
        
        # RSI signals
        if indicators.rsi > 70:
            signals.append("RSI indicates overbought conditions")
        elif indicators.rsi < 30:
            signals.append("RSI indicates oversold conditions")
        
        # MACD signals
        if indicators.macd > indicators.macd_signal:
            signals.append("MACD shows bullish momentum")
        else:
            signals.append("MACD shows bearish momentum")
        
        # Bollinger Bands signals
        current_price = indicators.bollinger_middle  # Approximation
        if current_price > indicators.bollinger_upper:
            signals.append("Price above upper Bollinger Band - potential reversal")
        elif current_price < indicators.bollinger_lower:
            signals.append("Price below lower Bollinger Band - potential bounce")
        
        # Moving average signals
        if indicators.ema_12 > indicators.ema_26:
            signals.append("Short-term EMA above long-term EMA - bullish signal")
        else:
            signals.append("Short-term EMA below long-term EMA - bearish signal")
        
        # Generate recommendation
        bullish_signals = sum(1 for s in signals if "bullish" in s or "oversold" in s or "bounce" in s)
        bearish_signals = sum(1 for s in signals if "bearish" in s or "overbought" in s or "reversal" in s)
        
        if bullish_signals > bearish_signals:
            recommendation = "buy"
        elif bearish_signals > bullish_signals:
            recommendation = "sell"
        else:
            recommendation = "hold"
        
        # Calculate confidence
        signal_strength = abs(bullish_signals - bearish_signals)
        confidence = min(100, (signal_strength / len(signals)) * 100 + trend_analysis["confidence"] * 0.3)
        
        return MarketSignals(
            trend=trend_analysis["trend"],
            strength=trend_analysis["strength"],
            recommendation=recommendation,
            confidence=confidence,
            key_levels={
                "support": indicators.support_level,
                "resistance": indicators.resistance_level,
                "sma_20": indicators.sma_20,
                "sma_50": indicators.sma_50
            },
            signals=signals
        )
    
    def full_analysis(self, ohlc_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Perform complete technical analysis"""
        if not ohlc_data or len(ohlc_data) < 5:
            return self._empty_analysis()
        
        # Extract price and volume data
        prices = np.array([float(candle[4]) for candle in ohlc_data])  # Close prices
        volumes = np.array([float(candle[5]) for candle in ohlc_data if len(candle) > 5])  # Volumes if available
        
        # Calculate all indicators
        sma_20 = self.calculate_sma(prices, 20)
        sma_50 = self.calculate_sma(prices, 50)
        ema_12 = self.calculate_ema(prices, 12)
        ema_26 = self.calculate_ema(prices, 26)
        rsi = self.calculate_rsi(prices)
        macd, macd_signal, macd_histogram = self.calculate_macd(prices)
        bollinger_upper, bollinger_lower, bollinger_middle = self.calculate_bollinger_bands(prices)
        support, resistance = self.find_support_resistance(prices, volumes)
        volatility = self.calculate_volatility(prices)
        
        # Volume analysis
        volume_sma = np.mean(volumes[-20:]) if len(volumes) >= 20 else (np.mean(volumes) if len(volumes) > 0 else 0)
        
        # Price change
        price_change_24h = ((prices[-1] - prices[-2]) / prices[-2] * 100) if len(prices) >= 2 else 0
        
        # Create indicators object
        indicators = TechnicalIndicators(
            sma_20=sma_20,
            sma_50=sma_50,
            ema_12=ema_12,
            ema_26=ema_26,
            rsi=rsi,
            macd=macd,
            macd_signal=macd_signal,
            macd_histogram=macd_histogram,
            bollinger_upper=bollinger_upper,
            bollinger_lower=bollinger_lower,
            bollinger_middle=bollinger_middle,
            support_level=support,
            resistance_level=resistance,
            volume_sma=volume_sma,
            price_change_24h=price_change_24h,
            volatility=volatility
        )
        
        # Trend analysis
        trend_analysis = self.analyze_trend(prices, volumes)
        
        # Generate signals
        signals = self.generate_signals(indicators, trend_analysis)
        
        # Use current price to determine appropriate precision for all price-related values
        current_price = prices[-1] if len(prices) > 0 else 1.0
        price_precision = get_price_precision(current_price)
        
        return {
            "indicators": {
                "sma_20": round_to_precision(sma_20, current_price),
                "sma_50": round_to_precision(sma_50, current_price),
                "ema_12": round_to_precision(ema_12, current_price),
                "ema_26": round_to_precision(ema_26, current_price),
                "rsi": round(rsi, 2),
                "macd": round_to_precision(macd, current_price),
                "macd_signal": round_to_precision(macd_signal, current_price),
                "macd_histogram": round_to_precision(macd_histogram, current_price),
                "bollinger_bands": {
                    "upper": round_to_precision(bollinger_upper, current_price),
                    "middle": round_to_precision(bollinger_middle, current_price),
                    "lower": round_to_precision(bollinger_lower, current_price)
                },
                "support_resistance": {
                    "support": round_to_precision(support, current_price),
                    "resistance": round_to_precision(resistance, current_price)
                },
                "volume_sma": round(volume_sma, 2),
                "volatility": round(volatility, 2)
            },
            "trend_analysis": trend_analysis,
            "signals": {
                "trend": signals.trend,
                "strength": signals.strength,
                "recommendation": signals.recommendation,
                "confidence": round(signals.confidence, 1),
                "key_levels": {k: round_to_precision(v, current_price) for k, v in signals.key_levels.items()},
                "signals": signals.signals
            },
            "summary": {
                "current_price": round_to_precision(current_price, current_price),
                "price_change_24h": round(price_change_24h, 2),
                "data_points": len(ohlc_data),
                "analysis_quality": "high" if len(ohlc_data) >= 50 else "medium" if len(ohlc_data) >= 20 else "low"
            }
        }
    
    def _empty_analysis(self) -> Dict[str, Any]:
        """Return empty analysis when insufficient data"""
        return {
            "indicators": {},
            "trend_analysis": {"trend": "neutral", "strength": "weak", "confidence": 0},
            "signals": {
                "trend": "neutral",
                "strength": "weak", 
                "recommendation": "hold",
                "confidence": 0,
                "key_levels": {},
                "signals": ["Insufficient data for analysis"]
            },
            "summary": {
                "current_price": 0,
                "price_change_24h": 0,
                "data_points": 0,
                "analysis_quality": "insufficient"
            }
        }