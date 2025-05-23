require('dotenv').config();

module.exports = {
  // Server Configuration
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // API Configuration
  API_TIMEOUT: parseInt(process.env.API_TIMEOUT) || 30000, // 30 seconds
  MAX_RETRIES: parseInt(process.env.MAX_RETRIES) || 3,
  
  // Cache Configuration
  CACHE_TTL: parseInt(process.env.CACHE_TTL) || 12 * 60 * 60 * 1000, // 12 hours
  CACHE_MAX_SIZE: parseInt(process.env.CACHE_MAX_SIZE) || 100, // 100 MB
  
  // Rate Limiting Configuration
  RATE_LIMIT: {
    WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    
    // Analysis-specific rate limiting
    ANALYSIS_WINDOW_MS: parseInt(process.env.ANALYSIS_RATE_LIMIT_WINDOW_MS) || 5 * 60 * 1000, // 5 minutes
    ANALYSIS_MAX_REQUESTS: parseInt(process.env.ANALYSIS_RATE_LIMIT_MAX_REQUESTS) || 10,
  },
  
  // NFT Configuration
  NFT_ELIGIBILITY_THRESHOLD: parseInt(process.env.NFT_ELIGIBILITY_THRESHOLD) || 4,
  
  // External API Configuration
  RELAY_API_BASE_URL: process.env.RELAY_API_BASE_URL || 'https://api.relay.link',
  ETHEREUM_RPC_URL: process.env.ETHEREUM_RPC_URL || 'https://eth-mainnet.alchemyapi.io/v2/your-api-key',
  SOLANA_RPC_URL: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  
  // Security Configuration
  CORS_ORIGINS: process.env.CORS_ORIGINS ? 
    process.env.CORS_ORIGINS.split(',') : 
    ['http://localhost:3000', 'http://127.0.0.1:3000'],
  
  // Logging Configuration
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  LOG_MAX_SIZE: process.env.LOG_MAX_SIZE || '5m',
  LOG_MAX_FILES: process.env.LOG_MAX_FILES || '5',
  
  // Feature Flags
  FEATURES: {
    ANALYTICS: process.env.ENABLE_ANALYTICS === 'true',
    CACHE_COMPRESSION: process.env.ENABLE_CACHE_COMPRESSION !== 'false',
    REQUEST_LOGGING: process.env.ENABLE_REQUEST_LOGGING !== 'false',
  }
};