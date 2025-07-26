interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class CacheService {
  private cache = new Map<string, CacheItem<any>>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes default

  /**
   * Set an item in cache with TTL (time to live)
   * @param key - Cache key
   * @param data - Data to cache
   * @param ttl - Time to live in milliseconds (optional)
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const timeToLive = ttl || this.defaultTTL;
    const timestamp = Date.now();
    const expiresAt = timestamp + timeToLive;

    this.cache.set(key, {
      data,
      timestamp,
      expiresAt,
    });

    if (import.meta.env.DEV) {
      console.log(`Cache SET: ${key} (expires in ${timeToLive / 1000}s)`);
    }
  }

  /**
   * Get an item from cache
   * @param key - Cache key
   * @returns Cached data or null if not found/expired
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      if (import.meta.env.DEV) {
        console.log(`Cache MISS: ${key} (not found)`);
      }
      return null;
    }

    const now = Date.now();
    
    // Check if item has expired
    if (now > item.expiresAt) {
      this.cache.delete(key);
      if (import.meta.env.DEV) {
        console.log(`Cache MISS: ${key} (expired)`);
      }
      return null;
    }

    if (import.meta.env.DEV) {
      const remainingTime = Math.round((item.expiresAt - now) / 1000);
      console.log(`Cache HIT: ${key} (expires in ${remainingTime}s)`);
    }

    return item.data;
  }

  /**
   * Check if a key exists and is not expired
   * @param key - Cache key
   * @returns True if key exists and is valid
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Delete a specific key from cache
   * @param key - Cache key
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (import.meta.env.DEV && deleted) {
      console.log(`Cache DELETE: ${key}`);
    }
    return deleted;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    if (import.meta.env.DEV) {
      console.log('Cache CLEARED');
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (import.meta.env.DEV && cleaned > 0) {
      console.log(`Cache CLEANUP: Removed ${cleaned} expired entries`);
    }

    return cleaned;
  }

  /**
   * Generate cache key for API requests
   * @param endpoint - API endpoint
   * @param params - Request parameters
   * @returns Cache key string
   */
  generateCacheKey(endpoint: string, params?: Record<string, any>): string {
    if (!params) {
      return `api:${endpoint}`;
    }

    // Sort params for consistent key generation
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {} as Record<string, any>);

    const paramString = new URLSearchParams(sortedParams).toString();
    return `api:${endpoint}:${paramString}`;
  }
}

// Create singleton instance
const cacheService = new CacheService();

// Setup automatic cleanup every 10 minutes
setInterval(() => {
  cacheService.cleanup();
}, 10 * 60 * 1000);

export default cacheService; 