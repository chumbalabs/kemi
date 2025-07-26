"""
Smart Price Formatting Module
Handles proper formatting of cryptocurrency prices with appropriate precision
"""

def format_crypto_price(price: float, currency: str = "USD") -> str:
    """
    Format cryptocurrency price with appropriate precision based on value
    
    Args:
        price: The price value to format
        currency: Currency symbol (default: USD)
    
    Returns:
        Formatted price string with appropriate precision
    """
    if price is None or price == 0:
        return f"${0:.2f}" if currency.upper() == "USD" else f"{price:.2f}"
    
    abs_price = abs(price)
    
    # For very small values (< 0.000001), use scientific notation
    if abs_price < 0.000001:
        return f"${price:.2e}" if currency.upper() == "USD" else f"{price:.2e}"
    
    # For small values (< 0.01), use up to 8 decimal places
    elif abs_price < 0.01:
        # Remove trailing zeros and ensure at least 2 significant digits
        formatted = f"{price:.8f}".rstrip('0').rstrip('.')
        # Ensure we have at least 2 decimal places for very small numbers
        if '.' in formatted and len(formatted.split('.')[1]) < 2:
            formatted = f"{price:.8f}"
        return f"${formatted}" if currency.upper() == "USD" else formatted
    
    # For medium values (< 1), use up to 6 decimal places
    elif abs_price < 1:
        formatted = f"{price:.6f}".rstrip('0').rstrip('.')
        return f"${formatted}" if currency.upper() == "USD" else formatted
    
    # For larger values (>= 1), use standard formatting
    elif abs_price < 1000:
        return f"${price:.4f}" if currency.upper() == "USD" else f"{price:.4f}"
    
    # For very large values, use comma separators
    else:
        return f"${price:,.2f}" if currency.upper() == "USD" else f"{price:,.2f}"

def format_crypto_price_for_display(price: float) -> str:
    """
    Format price for frontend display with consistent precision
    """
    return format_crypto_price(price, "USD")

def format_crypto_price_raw(price: float) -> str:
    """
    Format price without currency symbol for calculations
    """
    return format_crypto_price(price, "").lstrip('$')

def get_price_precision(price: float) -> int:
    """
    Get appropriate decimal precision for a given price
    
    Returns:
        Number of decimal places to use
    """
    if price is None or price == 0:
        return 2
    
    abs_price = abs(price)
    
    if abs_price < 0.000001:
        return 8  # Use scientific notation elsewhere
    elif abs_price < 0.01:
        return 8
    elif abs_price < 1:
        return 6
    elif abs_price < 1000:
        return 4
    else:
        return 2

def round_to_precision(value: float, price_reference: float = None) -> float:
    """
    Round a value to appropriate precision based on a reference price
    
    Args:
        value: Value to round
        price_reference: Reference price to determine precision (optional)
    
    Returns:
        Rounded value
    """
    if value is None:
        return 0.0
    
    if price_reference is not None:
        precision = get_price_precision(price_reference)
    else:
        precision = get_price_precision(value)
    
    return round(value, precision)

# Test the formatter
if __name__ == "__main__":
    test_prices = [
        0.00288026,  # PUMP token
        0.000000123, # Very small token
        0.0001234,   # Small token
        0.123456,    # Medium small token
        1.23456,     # Regular token
        123.456,     # Higher value token
        12345.67     # High value token
    ]
    
    print("Price Formatting Tests:")
    print("=" * 50)
    for price in test_prices:
        formatted = format_crypto_price(price)
        precision = get_price_precision(price)
        print(f"Price: {price:>12} -> {formatted:<15} (precision: {precision})")