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

// Signature verification dependencies
const { ethers } = require('ethers');
const nacl = require('tweetnacl');
// Replace the bs58 import section (around lines 15-100) with this corrected version:

// Enhanced bs58 import with working fallback
let bs58;
try {
  const bs58Library = require('bs58');
  console.log('📦 bs58 library imported, type:', typeof bs58Library);
  console.log('📦 bs58 library keys:', Object.keys(bs58Library || {}));
  
  // Check if it's a direct export or has methods
  if (typeof bs58Library === 'function') {
    // Some versions export the encode function directly
    console.log('🔧 bs58 is a function, checking for methods...');
    bs58 = bs58Library;
  } else if (bs58Library && typeof bs58Library.encode === 'function') {
    // Standard structure
    console.log('✅ bs58 has encode/decode methods');
    bs58 = bs58Library;
  } else if (bs58Library && bs58Library.default) {
    // ES6 default export
    console.log('🔧 Using bs58.default export');
    bs58 = bs58Library.default;
  } else {
    throw new Error('bs58 library structure not recognized');
  }
  
  // Verify the functions exist
  if (typeof bs58.encode !== 'function' || typeof bs58.decode !== 'function') {
    throw new Error('bs58 encode/decode functions not available');
  }
  
  console.log('✅ bs58 library loaded successfully');
  console.log('bs58.decode type:', typeof bs58.decode);
  console.log('bs58.encode type:', typeof bs58.encode);
  
} catch (err) {
  console.error('❌ Failed to load bs58 library:', err.message);
  console.log('🔧 Using fallback base58 implementation');
  
  // Working fallback implementation
  const base58Alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  
  function decodeBase58(string) {
    if (!string || typeof string !== 'string') {
      throw new Error('Invalid input for base58 decode');
    }
    
    let decoded = 0n;
    let multi = 1n;
    
    // Decode from base58
    for (let i = string.length - 1; i >= 0; i--) {
      const char = string[i];
      const index = base58Alphabet.indexOf(char);
      if (index === -1) {
        throw new Error(`Invalid base58 character: ${char}`);
      }
      decoded += BigInt(index) * multi;
      multi *= 58n;
    }
    
    // Convert BigInt to byte array
    const bytes = [];
    while (decoded > 0) {
      bytes.unshift(Number(decoded % 256n));
      decoded = decoded / 256n;
    }
    
    // Handle leading zeros (represented as '1' in base58)
    for (let i = 0; i < string.length && string[i] === '1'; i++) {
      bytes.unshift(0);
    }
    
    return new Uint8Array(bytes);
  }
  
  function encodeBase58(buffer) {
    if (!buffer || buffer.length === 0) {
      return '';
    }
    
    // Convert bytes to BigInt
    let num = 0n;
    for (let i = 0; i < buffer.length; i++) {
      num = num * 256n + BigInt(buffer[i]);
    }
    
    // Convert to base58
    let encoded = '';
    while (num > 0) {
      encoded = base58Alphabet[Number(num % 58n)] + encoded;
      num = num / 58n;
    }
    
    // Handle leading zeros
    for (let i = 0; i < buffer.length && buffer[i] === 0; i++) {
      encoded = '1' + encoded;
    }
    
    return encoded;
  }
  
  bs58 = {
    decode: decodeBase58,
    encode: encodeBase58
  };
}

// Test the bs58 implementation
try {
  console.log('🧪 Testing bs58 implementation...');
  const testString = 'Hello';
  const testBytes = new TextEncoder().encode(testString);
  const encoded = bs58.encode(testBytes);
  const decoded = bs58.decode(encoded);
  const decodedString = new TextDecoder().decode(decoded);
  
  console.log('Test input:', testString);
  console.log('Test encoded:', encoded);
  console.log('Test decoded:', decodedString);
  
  if (decodedString === testString) {
    console.log('✅ bs58 implementation test passed');
  } else {
    console.error('❌ bs58 implementation test failed');
    console.error('Expected:', testString, 'Got:', decodedString);
  }
} catch (testError) {
  console.error('❌ bs58 test error:', testError.message);
  console.error('❌ bs58 test stack:', testError.stack);
}

// Import leaderboard module (optional - graceful fallback if not available)
let leaderboard;
try {
  leaderboard = require('./leaderboard');
  console.log('✅ Leaderboard module loaded successfully');
} catch (err) {
  console.log('❌ Leaderboard module not available - leaderboard features disabled');
}

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

// Signature verification functions
// Updated signature verification functions for ethers v6
function verifyEthereumSignature(address, message, signature) {
  try {
    // For ethers v6, use verifyMessage directly from ethers
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === address.toLowerCase();
  } catch (error) {
    console.error('Ethereum signature verification error:', error);
    
    // Fallback for ethers v5 if v6 fails
    try {
      if (ethers.utils && ethers.utils.verifyMessage) {
        const recoveredAddress = ethers.utils.verifyMessage(message, signature);
        return recoveredAddress.toLowerCase() === address.toLowerCase();
      }
    } catch (fallbackError) {
      console.error('Ethereum signature verification fallback error:', fallbackError);
    }
    
    return false;
  }
}

// Replace the verifySolanaSignature function (around line 176):

function verifySolanaSignature(address, message, signature) {
  try {
    console.log('🔐 Verifying Solana signature...');
    console.log('Address:', address);
    console.log('Message length:', message.length);
    console.log('Signature length:', signature.length);
    console.log('bs58 type:', typeof bs58);
    console.log('bs58.decode type:', typeof bs58.decode);
    
    const messageBytes = new TextEncoder().encode(message);
    let signatureBytes;
    let publicKeyBytes;
    
    // Decode public key (address) with enhanced error handling
    try {
      console.log('🔍 Attempting to decode Solana address...');
      
      if (!bs58) {
        throw new Error('bs58 object not available');
      }
      
      if (typeof bs58.decode !== 'function') {
        throw new Error(`bs58.decode is not a function (type: ${typeof bs58.decode})`);
      }
      
      publicKeyBytes = bs58.decode(address);
      console.log('✅ Public key decoded successfully, length:', publicKeyBytes.length);
      
      if (publicKeyBytes.length !== 32) {
        throw new Error(`Invalid public key length: ${publicKeyBytes.length}, expected 32`);
      }
      
    } catch (addressError) {
      console.error('❌ Failed to decode Solana address:', addressError);
      console.error('Address value:', address);
      console.error('Address type:', typeof address);
      console.error('Address length:', address?.length);
      return false;
    }
    
    // Try to decode signature - first as base58, then base64
    try {
      console.log('🔍 Attempting to decode signature...');
      
      // Try base58 decoding first
      signatureBytes = bs58.decode(signature);
      console.log('✅ Signature decoded as base58, length:', signatureBytes.length);
      
    } catch (base58Error) {
      console.log('⚠️ Base58 decode failed, trying base64:', base58Error.message);
      try {
        // Fallback to base64 decoding
        const base64Decoded = Buffer.from(signature, 'base64');
        signatureBytes = new Uint8Array(base64Decoded);
        console.log('✅ Signature decoded as base64, length:', signatureBytes.length);
      } catch (base64Error) {
        console.error('❌ Both base58 and base64 decoding failed:', base64Error);
        console.error('Signature sample:', signature.substring(0, 50) + '...');
        return false;
      }
    }
    
    // Verify signature length (should be 64 bytes for Ed25519)
    if (signatureBytes.length !== 64) {
      console.error('❌ Invalid signature length:', signatureBytes.length, 'expected 64');
      return false;
    }
    
    // Perform signature verification
    console.log('🔍 Performing nacl signature verification...');
    console.log('Message bytes length:', messageBytes.length);
    console.log('Signature bytes length:', signatureBytes.length);
    console.log('Public key bytes length:', publicKeyBytes.length);
    
    const isValid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
    console.log('🎯 Solana signature verification result:', isValid);
    
    if (!isValid) {
      console.log('❌ Signature verification failed');
      console.log('Message sample:', message.substring(0, 100) + '...');
      console.log('Signature sample:', signature.substring(0, 20) + '...');
      console.log('Address:', address);
    }
    
    return isValid;
  } catch (error) {
    console.error('💥 Solana signature verification error:', error);
    console.error('Error stack:', error.stack);
    return false;
  }
}

// Initialize leaderboard database on startup
if (leaderboard) {
  leaderboard.initializeDatabase()
    .then(() => {
      console.log('🗄️ Leaderboard database initialized successfully');
      logger.info('🏆 Leaderboard database initialized successfully');
    })
    .catch(err => {
      console.error('❌ Failed to initialize leaderboard database:', err);
      logger.error('❌ Failed to initialize leaderboard database:', err);
    });
}

// Cache Control
app.use((req, res, next) => {
  res.header('Cache-Control', 'no-store, max-age=0');
  res.header('Pragma', 'no-cache');
  res.header('Expires', '0');
  next();
});

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

// Enhanced rate limiting (Updated for v7.5.0)
const limiter = rateLimit({
  windowMs: config.RATE_LIMIT.WINDOW_MS,
  limit: config.RATE_LIMIT.MAX_REQUESTS,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    code: 'RATE_LIMIT',
    retryAfter: config.RATE_LIMIT.WINDOW_MS / 1000
  },
  headers: true,
  skipSuccessfulRequests: false,
  skip: (req) => {
    return req.url === '/health';
  }
});

const analysisLimiter = rateLimit({
  windowMs: config.RATE_LIMIT.ANALYSIS_WINDOW_MS,
  limit: config.RATE_LIMIT.ANALYSIS_MAX_REQUESTS,
  message: {
    error: 'Too many analysis requests, please try again later.',
    code: 'ANALYSIS_RATE_LIMIT',
    retryAfter: config.RATE_LIMIT.ANALYSIS_WINDOW_MS / 1000
  },
  headers: true
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
    ['https://relaystats.xyz'] : 
    ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));

// Express 5 json parsing with error handling
app.use(express.json({ 
  limit: '10mb'
}));

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    logger.error('Invalid JSON in request body');
    return res.status(400).json({
      error: 'Invalid JSON',
      code: 'INVALID_JSON'
    });
  }
  next(err);
});

app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Static file serving with Express 5 options
app.use(express.static(path.join(__dirname, 'public'), {
  etag: false,
  maxAge: '0',
  lastModified: false,
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

// Health check endpoint
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
    },
    features: {
      leaderboard: !!leaderboard
    }
  };

  res.json(healthcheck);
});

// ==================== MAIN ANALYSIS ENDPOINT ====================

// API endpoint to analyze an address - WITH FORCE REFRESH SUPPORT
app.post('/api/analyze', analysisLimiter, async (req, res) => {
  const startTime = Date.now();
  const { address, forceRefresh = false } = req.body;
  
  try {  
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
    
    logger.info('Starting analysis for address:', { 
      address: trimmedAddress, 
      forceRefresh,
      ip: req.ip 
    });
    
    // Pass forceRefresh option to analysis module
    const results = await analysisModule.analyzeAddress(trimmedAddress, { 
      forceRefresh: forceRefresh === true || forceRefresh === 'true' 
    });
    
    // Update leaderboard stats if analysis was successful (but don't auto opt-in)
    if (leaderboard && results.success && results.summary.transactionCount > 0) {
      try {
        await leaderboard.updateUserStats(trimmedAddress, false);
        logger.debug('Leaderboard stats updated for address:', trimmedAddress);
      } catch (leaderboardError) {
        logger.warn('Failed to update leaderboard stats:', leaderboardError.message);
        // Don't fail the analysis if leaderboard update fails
      }
    }
    
    const duration = Date.now() - startTime;
    logger.info('Analysis completed successfully', { 
      address: trimmedAddress, 
      duration: `${duration}ms`,
      transactionCount: results.summary?.transactionCount || 0,
      fromCache: !forceRefresh
    });
    
    res.json({
      ...results,
      metadata: {
        analyzedAt: new Date().toISOString(),
        duration: duration,
        fromCache: !forceRefresh
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

// ==================== LEADERBOARD ENDPOINTS ====================

if (leaderboard) {
  // Get leaderboard by type (no authentication required for viewing)
  app.get('/api/leaderboard/:type', async (req, res) => {
    try {
      const { type } = req.params;
      const limit = parseInt(req.query.limit) || 50;
      
      console.log(`📊 Fetching ${type} leaderboard (limit: ${limit})`);
      
      const result = await leaderboard.getLeaderboard(type, limit);
      
      res.json({
        success: true,
        leaderboard: result,
        type: type,
        limit: limit
      });
    } catch (error) {
      console.error('Leaderboard fetch error:', error);
      logger.error('Leaderboard fetch error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch leaderboard data'
      });
    }
  });

  // Get user rank (no authentication required for viewing)
  app.get('/api/user-rank/:address', async (req, res) => {
    try {
      const { address } = req.params;
      
      console.log(`🎯 Fetching user rank for ${address}`);
      
      const result = await leaderboard.getUserRank(address);
      
      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('User rank fetch error:', error);
      logger.error('User rank fetch error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user rank'
      });
    }
  });

  // Generate signature message for leaderboard actions
  app.post('/api/leaderboard/get-signature-message', async (req, res) => {
    try {
      const { address, action } = req.body; // action: 'join' or 'leave'
      
      if (!address || !action) {
        return res.status(400).json({
          success: false,
          error: 'Address and action are required'
        });
      }

      if (!['join', 'leave'].includes(action)) {
        return res.status(400).json({
          success: false,
          error: 'Action must be either "join" or "leave"'
        });
      }

      const timestamp = Date.now();
      const message = `${action === 'join' ? 'Join' : 'Leave'} Relay Stats Leaderboard\nAddress: ${address}\nTimestamp: ${timestamp}`;

      console.log(`📝 Generated signature message for ${address} to ${action}`);

      res.json({
        success: true,
        message: message,
        timestamp: timestamp
      });
    } catch (error) {
      console.error('Message generation error:', error);
      logger.error('Message generation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate signature message'
      });
    }
  });

  // SECURED: Update user opt-in status (requires wallet signature)
  app.post('/api/leaderboard/update-opt-in', async (req, res) => {
    try {
      const { address, optIn, signature, message, timestamp } = req.body;
      
      // Validate required fields
      if (!address) {
        return res.status(400).json({
          success: false,
          error: 'Address is required'
        });
      }

      if (!signature || !message || !timestamp) {
        return res.status(400).json({
          success: false,
          error: 'Wallet signature required for leaderboard changes. Please connect your wallet and sign the message.'
        });
      }

      // Verify timestamp (must be within last 5 minutes)
      const now = Date.now();
      const messageTime = parseInt(timestamp);
      if (now - messageTime > 5 * 60 * 1000) {
        return res.status(400).json({
          success: false,
          error: 'Signature expired. Please sign again.'
        });
      }

      // Verify message format
      const expectedMessage = `${optIn ? 'Join' : 'Leave'} Relay Stats Leaderboard\nAddress: ${address}\nTimestamp: ${timestamp}`;
      if (message !== expectedMessage) {
        return res.status(400).json({
          success: false,
          error: 'Invalid message format. Please generate a new signature.'
        });
      }

      // Verify signature based on address type
      let isValidSignature = false;
      if (address.startsWith('0x')) {
        // Ethereum signature
        isValidSignature = verifyEthereumSignature(address, message, signature);
      } else {
        // Solana signature  
        isValidSignature = verifySolanaSignature(address, message, signature);
      }

      if (!isValidSignature) {
        return res.status(401).json({
          success: false,
          error: 'Invalid signature. Please sign with the correct wallet that owns this address.'
        });
      }

      console.log(`🔐 Verified signature for ${address} to ${optIn ? 'join' : 'leave'} leaderboard`);
      
      const result = await leaderboard.updateOptInStatus(address, optIn);
      
      if (result.success) {
        logger.info(`Leaderboard opt-in status updated`, { 
          address: address, 
          optIn: optIn,
          ip: req.ip 
        });

        res.json({
          success: true,
          message: optIn ? 'Successfully joined the leaderboard!' : 'Successfully left the leaderboard.',
          userStats: result.userStats
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error || 'Failed to update opt-in status'
        });
      }
    } catch (error) {
      console.error('Secured opt-in update error:', error);
      logger.error('Secured opt-in update error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update leaderboard status'
      });
    }
  });

  // Remove the old unsecured opt-in endpoint completely
  // Legacy endpoint - now returns error directing users to use wallet signature
  app.post('/api/leaderboard/opt-in', async (req, res) => {
    res.status(400).json({
      success: false,
      error: 'This endpoint is deprecated. Please connect your wallet and use the secure opt-in method.',
      code: 'DEPRECATED_ENDPOINT'
    });
  });

} else {
  // Fallback routes when leaderboard is not available
  app.get('/api/leaderboard/:type', (req, res) => {
    res.status(503).json({
      success: false,
      error: 'Leaderboard feature not available'
    });
  });

  app.get('/api/user-rank/:address', (req, res) => {
    res.status(503).json({
      success: false,
      error: 'Leaderboard feature not available'
    });
  });

  app.post('/api/leaderboard/get-signature-message', (req, res) => {
    res.status(503).json({
      success: false,
      error: 'Leaderboard feature not available'
    });
  });

  app.post('/api/leaderboard/update-opt-in', (req, res) => {
    res.status(503).json({
      success: false,
      error: 'Leaderboard feature not available'
    });
  });

  app.post('/api/leaderboard/opt-in', (req, res) => {
    res.status(503).json({
      success: false,
      error: 'Leaderboard feature not available'
    });
  });
}

// ==================== OTHER ENDPOINTS ====================

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API documentation endpoint
app.get('/api', (req, res) => {
  const endpoints = {
    '/health': 'GET - Health check',
    '/api/analyze': 'POST - Analyze wallet address (supports forceRefresh parameter)'
  };

  // Add leaderboard endpoints if available
  if (leaderboard) {
    endpoints['/api/leaderboard/:type'] = 'GET - Get leaderboard (transactions|volume|chains|tokens)';
    endpoints['/api/leaderboard/get-signature-message'] = 'POST - Generate signature message for wallet';
    endpoints['/api/leaderboard/update-opt-in'] = 'POST - Secure opt-in/out with wallet signature';
    endpoints['/api/user-rank/:address'] = 'GET - Get user ranks in all categories';
  }

  res.json({
    name: 'Relay Stats API',
    version: '1.0.0',
    features: {
      analysis: true,
      forceRefresh: true,
      leaderboard: !!leaderboard,
      secureLeaderboard: !!leaderboard
    },
    endpoints,
    documentation: 'https://github.com/Love4crypto/relay-stats-app'
  });
});

// Enhanced 404 handler for Express 5
app.use((req, res) => {
  logger.warn('404 - Route not found:', { url: req.originalUrl, ip: req.ip, userAgent: req.get('User-Agent') });
  
  const availableEndpoints = ['/health', '/api/analyze'];
  if (leaderboard) {
    availableEndpoints.push('/api/leaderboard/:type', '/api/user-rank/:address');
  }
  
  res.status(404).json({
    error: 'Route not found',
    code: 'NOT_FOUND',
    path: req.originalUrl,
    availableEndpoints
  });
});

// Enhanced global error handler for Express 5
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
  
  if (job) {
    job.cancel();
    logger.info('Scheduled jobs cancelled');
  }
  
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

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
    platform: process.platform,
    leaderboardEnabled: !!leaderboard,
    secureLeaderboard: !!leaderboard
  });
  
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📊 Environment: ${config.NODE_ENV}`);
  console.log(`🏆 Leaderboard: ${leaderboard ? 'ENABLED' : 'DISABLED'}`);
  console.log(`🔐 Secure Leaderboard: ${leaderboard ? 'ENABLED' : 'DISABLED'}`);
  console.log(`🔧 Cache cleanup scheduled to run every 12 hours`);
  console.log(`📖 API docs available at: http://localhost:${PORT}/api`);
  console.log(`❤️  Health check at: http://localhost:${PORT}/health`);
});

module.exports = app;