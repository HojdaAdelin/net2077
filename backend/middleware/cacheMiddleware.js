const cache = new Map();

/**
 * Cache middleware
 * @param {number} duration - Cache duration in seconds
 * @returns {Function} Express middleware
 */
export const cacheMiddleware = (duration = 300) => {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const key = req.originalUrl || req.url;
    const cachedResponse = cache.get(key);

    if (cachedResponse) {
      const { data, timestamp } = cachedResponse;
      const age = (Date.now() - timestamp) / 1000; // age in seconds

      // Check if cache is still valid
      if (age < duration) {
        return res.json(data);
      } else {
        // Cache expired, remove it
        cache.delete(key);
      }
    }

    // Store original res.json
    const originalJson = res.json.bind(res);

    // Override res.json to cache the response
    res.json = (data) => {
      cache.set(key, {
        data,
        timestamp: Date.now()
      });
      return originalJson(data);
    };

    next();
  };
};

/**
 * Clear cache for a specific key or all cache
 * @param {string} key - Optional key to clear, if not provided clears all
 */
export const clearCache = (key = null) => {
  if (key) {
    cache.delete(key);
  } else {
    cache.clear();
  }
};

/**
 * Get cache statistics
 */
export const getCacheStats = () => {
  const stats = {
    size: cache.size,
    keys: Array.from(cache.keys()),
    entries: []
  };

  cache.forEach((value, key) => {
    const age = (Date.now() - value.timestamp) / 1000;
    stats.entries.push({
      key,
      age: Math.round(age),
      timestamp: new Date(value.timestamp).toISOString()
    });
  });

  return stats;
};

/**
 * Cleanup expired cache entries
 * Should be called periodically
 */
export const cleanupCache = (maxAge = 600) => {
  const now = Date.now();
  let cleaned = 0;

  cache.forEach((value, key) => {
    const age = (now - value.timestamp) / 1000;
    if (age > maxAge) {
      cache.delete(key);
      cleaned++;
    }
  });

  return cleaned;
};

// Auto cleanup every 10 minutes
setInterval(() => {
  cleanupCache(600); // Remove entries older than 10 minutes
}, 10 * 60 * 1000);
