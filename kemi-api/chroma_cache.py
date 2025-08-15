"""
ChromaDB Persistent Cache Manager
Provides persistent caching layer to complement the existing in-memory cache
"""

import json
import hashlib
import time
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
import logging

try:
    import chromadb
    from chromadb.config import Settings
    CHROMADB_AVAILABLE = True
except ImportError:
    CHROMADB_AVAILABLE = False
    print("Warning: ChromaDB not available. Persistent caching disabled.")

logger = logging.getLogger(__name__)

class ChromaPersistentCache:
    """Persistent cache using ChromaDB to reduce API calls and provide fallback data"""
    
    def __init__(self, persist_directory: str = "./chroma_cache"):
        self.persist_directory = persist_directory
        self.collection_name = "crypto_market_cache"
        self.collection = None
        self.client = None
        
        if CHROMADB_AVAILABLE:
            self._initialize_client()
        else:
            logger.warning("ChromaDB not available, persistent caching disabled")
    
    def _initialize_client(self):
        """Initialize ChromaDB client and collection"""
        try:
            self.client = chromadb.PersistentClient(
                path=self.persist_directory,
                settings=Settings(
                    anonymized_telemetry=False,
                    allow_reset=True
                )
            )
            
            # Try to get existing collection
            try:
                self.collection = self.client.get_collection(name=self.collection_name)
                logger.info(f"✅ ChromaDB collection '{self.collection_name}' loaded")
            except Exception:
                # Create new collection if it doesn't exist
                self.collection = self.client.create_collection(
                    name=self.collection_name,
                    metadata={"description": "Cryptocurrency market data persistent cache"}
                )
                logger.info(f"✅ ChromaDB collection '{self.collection_name}' created")
                
        except Exception as e:
            logger.error(f"❌ Failed to initialize ChromaDB: {e}")
            self.client = None
            self.collection = None
    
    def _generate_cache_key(self, endpoint: str, params: Dict[str, Any] = None) -> str:
        """Generate unique cache key for API endpoint and parameters"""
        if params is None:
            params = {}
        
        # Create deterministic hash from endpoint and parameters
        key_data = f"{endpoint}:{json.dumps(params, sort_keys=True)}"
        return hashlib.md5(key_data.encode()).hexdigest()
    
    def get(self, endpoint: str, params: Dict[str, Any] = None, max_age_hours: int = 24) -> Optional[Any]:
        """Get cached data if it exists and is not too old"""
        if not self.collection:
            return None
        
        try:
            cache_key = self._generate_cache_key(endpoint, params)
            
            # Query ChromaDB for cached data
            results = self.collection.get(
                ids=[cache_key],
                include=["documents", "metadatas"]
            )
            
            if results['ids']:
                # Check if cache is still valid
                metadata = results['metadatas'][0]
                cached_time = datetime.fromisoformat(metadata['timestamp'])
                max_age = timedelta(hours=max_age_hours)
                
                if datetime.utcnow() - cached_time < max_age:
                    # Cache is still valid
                    cached_data = json.loads(results['documents'][0])
                    age_hours = (datetime.utcnow() - cached_time).total_seconds() / 3600
                    logger.info(f"💾 ChromaDB cache hit for {endpoint} (age: {age_hours:.1f}h)")
                    return cached_data
                else:
                    # Cache expired but keep for potential stale fallback
                    age_hours = (datetime.utcnow() - cached_time).total_seconds() / 3600
                    logger.info(f"⏰ ChromaDB cache expired for {endpoint} (age: {age_hours:.1f}h)")
            
            return None
            
        except Exception as e:
            logger.error(f"⚠️ ChromaDB cache get error for {endpoint}: {e}")
            return None
    
    def get_stale(self, endpoint: str, params: Dict[str, Any] = None, max_stale_days: int = 7) -> Optional[Any]:
        """Get cached data even if expired (for fallback scenarios)"""
        if not self.collection:
            return None
        
        try:
            cache_key = self._generate_cache_key(endpoint, params)
            
            # Query ChromaDB for cached data
            results = self.collection.get(
                ids=[cache_key],
                include=["documents", "metadatas"]
            )
            
            if results['ids']:
                metadata = results['metadatas'][0]
                cached_time = datetime.fromisoformat(metadata['timestamp'])
                max_stale = timedelta(days=max_stale_days)
                
                if datetime.utcnow() - cached_time < max_stale:
                    # Stale data is still acceptable
                    cached_data = json.loads(results['documents'][0])
                    age_hours = (datetime.utcnow() - cached_time).total_seconds() / 3600
                    logger.info(f"🔄 ChromaDB stale cache used for {endpoint} (age: {age_hours:.1f}h)")
                    return cached_data
                else:
                    # Data too old, remove it
                    self.collection.delete(ids=[cache_key])
                    logger.info(f"🗑️ ChromaDB removed very old cache for {endpoint}")
            
            return None
            
        except Exception as e:
            logger.error(f"⚠️ ChromaDB stale cache error for {endpoint}: {e}")
            return None
    
    def set(self, endpoint: str, data: Any, params: Dict[str, Any] = None):
        """Cache data in ChromaDB with proper serialization"""
        if not self.collection:
            return
        
        try:
            cache_key = self._generate_cache_key(endpoint, params)
            
            # Handle different data types
            serializable_data = self._make_serializable(data)
            json_data = json.dumps(serializable_data)
            
            # Store in ChromaDB
            self.collection.upsert(
                ids=[cache_key],
                documents=[json_data],
                metadatas=[{
                    "endpoint": endpoint,
                    "timestamp": datetime.utcnow().isoformat(),
                    "parameters": json.dumps(params or {}),
                    "data_size": len(json_data),
                    "data_type": type(data).__name__
                }]
            )
            
            logger.info(f"💾 ChromaDB cached data for {endpoint}")
            
        except Exception as e:
            logger.error(f"⚠️ ChromaDB cache set error for {endpoint}: {e}")
    
    def _make_serializable(self, data: Any) -> Any:
        """Convert data to JSON-serializable format"""
        try:
            # Handle Pydantic models
            if hasattr(data, 'dict'):
                return data.dict()
            elif hasattr(data, 'model_dump'):
                return data.model_dump()
            elif hasattr(data, '__dict__'):
                # Handle regular objects
                return {k: self._make_serializable(v) for k, v in data.__dict__.items()}
            elif isinstance(data, (list, tuple)):
                return [self._make_serializable(item) for item in data]
            elif isinstance(data, dict):
                return {k: self._make_serializable(v) for k, v in data.items()}
            else:
                # For primitive types, try JSON serialization test
                json.dumps(data)
                return data
        except (TypeError, ValueError):
            # If all else fails, convert to string
            return str(data)
    
    def clear_expired(self, max_age_days: int = 7):
        """Clear expired cache entries"""
        if not self.collection:
            return
        
        try:
            # Get all cached items
            results = self.collection.get(include=["metadatas"])
            
            expired_ids = []
            cutoff_time = datetime.utcnow() - timedelta(days=max_age_days)
            
            for i, metadata in enumerate(results['metadatas']):
                cached_time = datetime.fromisoformat(metadata['timestamp'])
                if cached_time < cutoff_time:
                    expired_ids.append(results['ids'][i])
            
            if expired_ids:
                self.collection.delete(ids=expired_ids)
                logger.info(f"🗑️ ChromaDB cleared {len(expired_ids)} expired cache entries")
            
        except Exception as e:
            logger.error(f"⚠️ ChromaDB cache cleanup error: {e}")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        if not self.collection:
            return {"error": "ChromaDB not available"}
        
        try:
            results = self.collection.get(include=["metadatas"])
            
            total_entries = len(results['ids'])
            endpoint_counts = {}
            total_size = 0
            
            current_time = datetime.utcnow()
            fresh_count = 0
            stale_count = 0
            
            for metadata in results['metadatas']:
                endpoint = metadata.get('endpoint', 'unknown')
                endpoint_counts[endpoint] = endpoint_counts.get(endpoint, 0) + 1
                total_size += metadata.get('data_size', 0)
                
                # Check freshness (24 hours)
                cached_time = datetime.fromisoformat(metadata['timestamp'])
                if current_time - cached_time < timedelta(hours=24):
                    fresh_count += 1
                else:
                    stale_count += 1
            
            return {
                "total_entries": total_entries,
                "fresh_entries": fresh_count,
                "stale_entries": stale_count,
                "endpoint_counts": endpoint_counts,
                "total_size_bytes": total_size,
                "collection_name": self.collection_name,
                "available": True
            }
            
        except Exception as e:
            logger.error(f"⚠️ ChromaDB stats error: {e}")
            return {"error": str(e), "available": False}
    
    def clear_all(self):
        """Clear all cached data"""
        if not self.collection:
            return
        
        try:
            # Reset the collection (clear all data)
            self.client.delete_collection(name=self.collection_name)
            self._initialize_client()
            logger.info("🗑️ ChromaDB cache cleared completely")
            
        except Exception as e:
            logger.error(f"⚠️ ChromaDB clear all error: {e}")

# Global instance
chroma_cache = ChromaPersistentCache()