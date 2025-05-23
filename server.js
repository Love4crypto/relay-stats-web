const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const schedule = require('node-schedule');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');
const winston = require('winston');
const config = require('./config');
const analysisModule = require('./analysis');

const app = express();
const PORT = config.PORT;

// Enhanced Logger setup
const logger = winston.createLogger({
  level: config.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

if (config.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Enhanced cache cleanup function
function cleanupCacheFiles() {
  const cacheDir = path.join(__dirname, 'cache');
  const maxAgeMs = config.CACHE_TTL;
  
  logger.info('Starting scheduled cache cleanup...');
  
  if (!fs.existsSync(cacheDir)) {
    logger.info('Cache directory does not exist. Nothing to clean up.');
    return;
  }
  
  try {
    const files = fs.readdirSync(cacheDir);
    const now = Date.now();
    let deletedCount = 0;
    let totalSize = 0;
    
    for (const file of files) {
      try {
        const filePath = path.join(cacheDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isDirectory()) continue;
        
        const fileAgeMs = now - stats.mtimeMs;
        
        if (fileAgeMs > maxAgeMs) {
          totalSize += stats.size;
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      } catch (fileErr) {
        logger.error('Error processing cache file, skipping:', fileErr.message);
      }
    }
    
    logger.info(`Cache cleanup complete. Deleted ${deletedCount} files (${(totalSize / 1024 / 1024).toFixed(2)} MB).`);
  } catch (err) {
    logger.error('Error during cache cleanup:', err);
  }
}

// Schedule cache cleanup to run every 12 hours
const job = schedule.scheduleJob('0 */12 * * *', cleanupCacheFiles);

// Enhanced security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'", 
        "'unsafe-inline'", 
        "https://cdn.jsdelivr.net", 
        "https://unpkg.com", 
        "https://www.googletagmanager.com",
        "https://www.google-analytics.com"
      ],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: ["'self'", "https:", "wss:"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// Compression middleware
app.use(compression({
  level: 6,
  threshold: 1000,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Enhanced rate limiting
const limiter = rateLimit({
  windowMs: config.RATE_LIMIT.WINDOW_MS,
  max: config.RATE_LIMIT.MAX_REQUESTS,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    code: 'RATE_LIMIT',
    retryAfter: config.RATE_LIMIT.WINDOW_MS / 1000
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.url === '/health';
  }
});

const analysisLimiter = rateLimit({
  windowMs: config.RATE_LIMIT.ANALYSIS_WINDOW_MS,
  max: config.RATE_LIMIT.ANALYSIS_MAX_REQUESTS,
  message: {
    error: 'Too many analysis requests, please try again later.',
    code: 'ANALYSIS_RATE_LIMIT',
    retryAfter: config.RATE_LIMIT.ANALYSIS_WINDOW_MS / 1000
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Request timeout middleware
app.use((req, res, next) => {
  const timeout = req.url.includes('/api/analyze') ? config.API_TIMEOUT : 10000;
  
  res.setTimeout(timeout, () => {
    logger.error('Request timeout for:', req.url);
    if (!res.headersSent) {
      res.status(408).json({ 
        error: 'Request timeout',
        code: 'TIMEOUT'
      });
    }
  });
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
  });
  
  next();
});

// Basic middleware
app.use(cors({
  origin: config.NODE_ENV === 'production' ? 
    ['https://yourdomain.com'] : 
    ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));

app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      logger.error('Invalid JSON in request body');
      throw new Error('Invalid JSON');
    }
  }
}));

app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Enhanced static file serving with caching
app.use(express.static('public', {
  maxAge: config.NODE_ENV === 'production' ? '1d' : '1h',
  etag: true,
  lastModified: true,
  cacheControl: true,
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

// Apply rate limiting
app.use('/api/', limiter);

// Cache headers for API responses
app.use('/api/', (req, res, next) => {
  res.set({
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block'
  });
  next();
});

// Enhanced health check endpoint
app.get('/health', (req, res) => {
  const healthcheck = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: config.NODE_ENV,
    memory: process.memoryUsage(),
    system: {
      platform: process.platform,
      nodeVersion: process.version
    }
  };

  try {
    res.json(healthcheck);
  } catch (error) {
    healthcheck.status = 'error';
    res.status(503).json(healthcheck);
  }
});

// Enhanced API endpoint to analyze an address
app.post('/api/analyze', analysisLimiter, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { address } = req.body;
    
    // Enhanced address validation
    if (!address || typeof address !== 'string' || address.trim().length === 0) {
      logger.warn('Invalid address provided:', { address, ip: req.ip });
      return res.status(400).json({ 
        error: 'Valid address is required',
        code: 'INVALID_ADDRESS',
        details: 'Please provide a valid wallet address'
      });
    }

    const trimmedAddress = address.trim();
    
    // Basic format validation
    if (!/^0x[a-fA-F0-9]{40}$/.test(trimmedAddress) && 
        !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(trimmedAddress)) {
      logger.warn('Invalid address format:', { address: trimmedAddress, ip: req.ip });
      return res.status(400).json({
        error: 'Invalid address format',
        code: 'INVALID_FORMAT',
        details: 'Address must be a valid Ethereum or Solana address'
      });
    }
    
    logger.info('Starting analysis for address:', { address: trimmedAddress, ip: req.ip });
    
    const results = await analysisModule.analyzeAddress(trimmedAddress);
    
    const duration = Date.now() - startTime;
    logger.info('Analysis completed successfully', { 
      address: trimmedAddress, 
      duration: `${duration}ms`,
      transactionCount: results.summary?.transactionCount || 0
    });
    
    res.json({
      ...results,
      metadata: {
        analyzedAt: new Date().toISOString(),
        duration: duration
      }
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Analysis error:', { 
      error: error.message, 
      stack: error.stack,
      duration: `${duration}ms`,
      address: req.body?.address
    });
    
    // Enhanced error responses
    if (error.message.includes('rate limit') || error.message.includes('429')) {
      return res.status(429).json({ 
        error: 'Too many requests to external services. Please try again later.',
        code: 'EXTERNAL_RATE_LIMIT',
        retryAfter: 60
      });
    }
    
    if (error.message.includes('timeout') || error.code === 'ECONNABORTED') {
      return res.status(504).json({ 
        error: 'Request timed out. Please try again.',
        code: 'TIMEOUT',
        details: 'The analysis took too long to complete'
      });
    }

    if (error.message.includes('Network Error') || error.code === 'ENOTFOUND') {
      return res.status(503).json({
        error: 'Network error. Please check your connection and try again.',
        code: 'NETWORK_ERROR'
      });
    }
    
    res.status(500).json({ 
      error: 'Analysis failed. Please try again.',
      code: 'ANALYSIS_ERROR',
      details: config.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Enhanced API endpoint to verify eligibility for NFT minting
app.post('/api/verify-eligibility', analysisLimiter, async (req, res) => {
  try {
    const { address } = req.body;
    
    if (!address || typeof address !== 'string' || address.trim().length === 0) {
      logger.warn('Invalid address for eligibility check:', { address, ip: req.ip });
      return res.status(400).json({
        eligible: false,
        error: 'Valid address is required',
        code: 'INVALID_ADDRESS'
      });
    }
    
    const trimmedAddress = address.trim();
    logger.info('Checking eligibility for:', { address: trimmedAddress, ip: req.ip });
    
    const analysisResult = await analysisModule.analyzeAddress(trimmedAddress);
    
    if (analysisResult.success) {
      const transactionCount = analysisResult.summary.transactionCount;
      const eligible = transactionCount >= config.NFT_ELIGIBILITY_THRESHOLD;
      
      logger.info(`Eligibility check completed`, { 
        address: trimmedAddress,
        eligible,
        transactionCount,
        threshold: config.NFT_ELIGIBILITY_THRESHOLD
      });
      
      return res.json({
        eligible: eligible,
        transactionCount: transactionCount,
        requiredCount: config.NFT_ELIGIBILITY_THRESHOLD,
        checkedAt: new Date().toISOString()
      });
    }
    
    logger.warn('Analysis failed for eligibility check:', trimmedAddress);
    return res.json({
      eligible: false,
      error: 'Failed to analyze transactions',
      transactionCount: 0,
      code: 'ANALYSIS_FAILED'
    });
    
  } catch (error) {
    logger.error('Eligibility check error:', { error: error.message, address: req.body?.address });
    res.status(500).json({
      eligible: false,
      error: 'Internal server error',
      transactionCount: 0,
      code: 'INTERNAL_ERROR'
    });
  }
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'Relay Stats API',
    version: '1.0.0',
    endpoints: {
      '/health': 'GET - Health check',
      '/api/analyze': 'POST - Analyze wallet address',
      '/api/verify-eligibility': 'POST - Check NFT eligibility'
    },
    documentation: 'https://github.com/your-repo/relay-stats-app'
  });
});

// Enhanced 404 handler
app.use('*', (req, res) => {
  logger.warn('404 - Route not found:', { url: req.originalUrl, ip: req.ip, userAgent: req.get('User-Agent') });
  res.status(404).json({
    error: 'Route not found',
    code: 'NOT_FOUND',
    path: req.originalUrl,
    availableEndpoints: ['/health', '/api/analyze', '/api/verify-eligibility']
  });
});

// Enhanced global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', { 
    error: err.message, 
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });
  
  if (res.headersSent) {
    return next(err);
  }
  
  res.status(err.status || 500).json({
    error: config.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    code: 'INTERNAL_ERROR',
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown
function gracefulShutdown(signal) {
  logger.info(`${signal} received, shutting down gracefully`);
  
  // Cancel scheduled job
  if (job) {
    job.cancel();
    logger.info('Scheduled jobs cancelled');
  }
  
  // Close server
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

app.listen(PORT, () => {
  logger.info(`Server starting`, {
    port: PORT,
    environment: config.NODE_ENV,
    nodeVersion: process.version,
    platform: process.platform
  });
  
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📊 Environment: ${config.NODE_ENV}`);
  console.log(`🔧 Cache cleanup scheduled to run every 12 hours`);
  console.log(`📖 API docs available at: http://localhost:${PORT}/api`);
  console.log(`❤️  Health check at: http://localhost:${PORT}/health`);
});

module.exports = app;