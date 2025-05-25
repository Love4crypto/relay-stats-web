const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// --- Configuration
const API_BASE_URL = 'https://api.relay.link';
const CACHE_DIR = path.join(__dirname, 'cache');
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes for wallet data
const PRICE_CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes for prices

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// Format numbers for better readability
function formatNumber(num) {
  if (num === 0) return "0";
  if (num < 0.000001) return num.toExponential(6);
  return num.toFixed(6).replace(/\.?0+$/, "");
}

// Format USD values
function formatUSD(num) {
  if (typeof num !== 'number' || isNaN(num)) return '(unknown)';
  if (num === 0) return "$0.00";
  if (num < 0.01) return "$<0.01";
  if (num < 1) return "$" + num.toFixed(2);
  if (num < 1000) return "$" + num.toFixed(2);
  if (num < 1000000) return "$" + (num/1000).toFixed(1) + "K";
  return "$" + (num/1000000).toFixed(1) + "M";
}

// Get address type based on format
function getAddressType(address) {
  if (!address) return "unknown";
  
  address = address.trim();
  
  if (address.startsWith('0x') && address.length === 42) {
    return 'evm';
  } else if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
    return 'solana';
  } else if (/^(cosmos|osmo|juno|stars)[a-zA-Z0-9]{39,59}$/.test(address)) {
    return 'cosmos';
  }
  
  return 'unknown';
}

// Create a safe cache key that preserves case for non-EVM addresses
function safeCacheKey(address) {
  const addressType = getAddressType(address);
  
  // Only lowercase EVM addresses (which are case-insensitive)
  if (addressType === 'evm') {
    return address.toLowerCase();
  }
  
  // For Solana and others, preserve case but encode special chars
  return encodeURIComponent(address);
}

// Helper for delayed retry
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Fetch token price
async function fetchTokenPrice(tokenAddress, chainId) {
  // Skip price fetch for tokens without proper addresses
  if (!tokenAddress || tokenAddress.length < 10) {
    return null;
  }
  
  const cacheKey = `price_${chainId}_${tokenAddress}`;
  const cacheFile = path.join(CACHE_DIR, `${cacheKey}.json`);
  
  // Check cache first
  if (fs.existsSync(cacheFile)) {
    try {
      const cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      if (Date.now() - cache.timestamp < PRICE_CACHE_DURATION_MS) {
        console.log(`Using cached price for ${tokenAddress} on chain ${chainId}: ${cache.price}`);
        return cache.price;
      }
    } catch (err) {
      console.log(`Cache read error for price: ${err.message}`);
    }
  }
  
  try {
    console.log(`Fetching price for token ${tokenAddress} on chain ${chainId}`);
    const response = await axios.get(`${API_BASE_URL}/currencies/token/price`, {
      params: {
        address: tokenAddress,
        chainId: chainId
      },
      timeout: 5000
    });
    
    if (response.data && typeof response.data.price === 'number') {
      // Cache the price
      fs.writeFileSync(cacheFile, JSON.stringify({
        timestamp: Date.now(),
        price: response.data.price
      }));
      return response.data.price;
    }
    
    return null;
  } catch (error) {
    console.warn(`Failed to fetch price for token ${tokenAddress} on chain ${chainId}: ${error.message}`);
    return null;
  }
}

// Fetch transactions with retry logic - UPDATED WITH FORCE REFRESH AND DEBUG
async function fetchTransactions(address, forceRefresh = false) {
  const addressType = getAddressType(address);
  console.log(`🔍 Address type detected: ${addressType}`);
  
  // Create a safe cache key that preserves case for Solana addresses
  const safeKey = safeCacheKey(address);
  const cacheFile = path.join(CACHE_DIR, `${safeKey}.json`);
  
  console.log(`📁 Cache file: ${cacheFile}`);
  console.log(`🔄 Force refresh: ${forceRefresh}`);
  
  // Check cache first (unless force refresh is requested)
  if (!forceRefresh && fs.existsSync(cacheFile)) {
    try {
      const cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      const cacheAge = Date.now() - cache.timestamp;
      const cacheAgeMinutes = Math.floor(cacheAge / (1000 * 60));
      
      console.log(`📋 Cache found - Age: ${cacheAgeMinutes} minutes (max: ${CACHE_DURATION_MS / (1000 * 60)} minutes)`);
      
      if (cacheAge < CACHE_DURATION_MS) {
        console.log(`✅ Using cached data with ${cache.transactions.length} transactions`);
        return cache.transactions;
      } else {
        console.log(`⏰ Cache expired, fetching fresh data`);
      }
    } catch (err) {
      console.warn('❌ Cache read error, will fetch fresh data:', err.message);
    }
  }
  
  if (forceRefresh) {
    console.log('🚀 Force refresh requested - fetching fresh data from API');
  }
  
  const transactions = [];
  const queryTypes = ['user'];
  
  for (const queryType of queryTypes) {
    console.log(`\n🔎 Attempting to fetch transactions with ${queryType}=${address}`);
    
    const params = { limit: 50 }; // ← INCREASED FROM 20 TO 50
    params[queryType] = address;
    
    let continuation = null;
    let pageCount = 0;
    let retryCount = 0;
    const MAX_RETRIES = 3;
    
    try {
      do {
        if (continuation) {
          params.continuation = continuation;
        }
        
        pageCount++;
        console.log(`📄 Fetching ${queryType} page ${pageCount}...`);
        
        try {
          const response = await axios.get(`${API_BASE_URL}/requests/v2`, { 
            params,
            timeout: 15000 // ← INCREASED TIMEOUT
          });
          
          console.log(`📊 API Response status: ${response.status}`);
          
          if (response.data && Array.isArray(response.data.requests)) {
            const pageTransactions = response.data.requests;
            console.log(`📦 Received ${pageTransactions.length} transactions on this page`);
            
            // LOG FIRST FEW TRANSACTIONS FROM THIS PAGE
            if (pageTransactions.length > 0) {
              console.log(`📅 Page ${pageCount} transactions (showing first 3):`);
              pageTransactions.slice(0, 3).forEach((tx, i) => {
                console.log(`   ${i + 1}. ${tx.id.substring(0, 20)}... - ${tx.createdAt} - Status: ${tx.status}`);
              });
            }
            
            // Filter out duplicates
            const newTxs = pageTransactions.filter(tx => 
              !transactions.some(existing => existing.id === tx.id)
            );
            
            transactions.push(...newTxs);
            console.log(`✅ Added ${newTxs.length} new unique transactions (total: ${transactions.length})`);
                               
            continuation = response.data.continuation;
            console.log(`🔗 Continuation token: ${continuation ? 'YES' : 'NO'}`);
            retryCount = 0;
          } else {
            console.log('❌ Unexpected API response format');
            console.log('Response data keys:', Object.keys(response.data || {}));
            break;
          }
        } catch (error) {
          retryCount++;
          console.warn(`⚠️ API error (attempt ${retryCount}/${MAX_RETRIES}): ${error.message}`);
          
          if (retryCount >= MAX_RETRIES) {
            console.error(`💥 Max retries reached for ${queryType}`);
            break;
          }
          
          const backoff = Math.pow(2, retryCount - 1) * 1000;
          console.log(`⏳ Retrying in ${backoff/1000} seconds...`);
          await sleep(backoff);
        }
        
        await sleep(1000);
        
      } while (continuation && pageCount < 20); // ← INCREASED FROM 10 TO 20 PAGES
      
    } catch (error) {
      console.warn(`💥 Error in ${queryType} transaction cycle:`, error.message);
    }
  }
  
  console.log(`\n📊 FINAL RESULTS:`);
  console.log(`   Total unique transactions found: ${transactions.length}`);
  
  // COMPREHENSIVE DEBUG: Show latest transactions
  if (transactions.length > 0) {
    console.log(`\n📅 Latest 10 transactions by date:`);
    transactions
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10)
      .forEach((tx, i) => {
        console.log(`   ${i + 1}. ${tx.id.substring(0, 20)}... - ${tx.createdAt} - Status: ${tx.status}`);
      });
       
    // Cache the results
    const cacheData = {
      timestamp: Date.now(),
      transactions
    };
    
    fs.writeFileSync(cacheFile, JSON.stringify(cacheData, null, 2));
    console.log(`💾 Cached ${transactions.length} transactions to ${cacheFile}`);
  } else {
    console.log(`❌ No transactions found to cache`);
  }
  
  return transactions;
}

// Extract raw totals from currency metadata
function extractRawTotals(transactions) {
  const rawTotals = {}; // { symbol: { symbol, address, chainId, in, out } }
  
  for (const req of transactions) {
    if (!req.data?.metadata) continue;
    
    const md = req.data.metadata;
    
    // Aggregate raw totals
    if (md.currencyIn) {
      const sym = md.currencyIn.currency.symbol;
      const addr = md.currencyIn.currency.address || '0x0000000000000000000000000000000000000000';
      const chainId = md.currencyIn.currency.chainId;
      
      rawTotals[sym] = rawTotals[sym] || { 
        symbol: sym, 
        address: addr,
        chainId: chainId,
        in: 0, 
        out: 0 
      };
      
      rawTotals[sym].in += parseFloat(md.currencyIn.amountFormatted || 0);
    }
    
    if (md.currencyOut) {
      const sym = md.currencyOut.currency.symbol;
      const addr = md.currencyOut.currency.address || '0x0000000000000000000000000000000000000000';
      const chainId = md.currencyOut.currency.chainId;
      
      rawTotals[sym] = rawTotals[sym] || { 
        symbol: sym, 
        address: addr,
        chainId: chainId,
        in: 0, 
        out: 0 
      };
      
      rawTotals[sym].out += parseFloat(md.currencyOut.amountFormatted || 0);
    }
  }
  
  return rawTotals;
}

// Main analysis function - UPDATED WITH FORCE REFRESH SUPPORT AND DEBUG
async function analyzeAddress(address, options = {}) {
  const { forceRefresh = false } = options;
  
  console.log(`\n🚀 STARTING ANALYSIS`);
  console.log(`   Address: ${address}`);
  console.log(`   Force refresh: ${forceRefresh}`);
  console.log(`   Timestamp: ${new Date().toISOString()}`);
  
  // Fetch transactions with force refresh option
  const transactions = await fetchTransactions(address, forceRefresh);
  
  console.log(`\n📈 ANALYSIS RESULTS:`);
  console.log(`   Transactions found: ${transactions.length}`);
  
  if (transactions.length === 0) {
    console.log(`❌ No transactions found - returning error response`);
    return {
      success: false,
      error: 'No transactions found',
      troubleshooting: [
        'Verify the address is correct',
        'Check if this address has used Relay bridge',
        'Try again later'
      ]
    };
  }
  
  // Extract raw totals for simple volume reporting
  const rawTotals = extractRawTotals(transactions);
  console.log(`💰 Tokens found: ${Object.keys(rawTotals).length}`);
  
  // Prepare summary data
  const uniqueDates = new Set();
  const chainsUsed = new Set();
  const tokens = new Set();
  
  for (const tx of transactions) {
    if (tx.createdAt) {
      uniqueDates.add(tx.createdAt.split('T')[0]);
    }
    
    if (tx.data && tx.data.metadata) {
      const md = tx.data.metadata;
      if (md.currencyIn) {
        chainsUsed.add(md.currencyIn.currency.chainId);
        tokens.add(md.currencyIn.currency.symbol);
      }
      if (md.currencyOut) {
        chainsUsed.add(md.currencyOut.currency.chainId);
        tokens.add(md.currencyOut.currency.symbol);
      }
    }
    
    // Track chains from transactions
    if (tx.data) {
      if (tx.data.inTxs) {
        for (const inTx of tx.data.inTxs) {
          if (inTx.chainId) chainsUsed.add(inTx.chainId);
        }
      }
      if (tx.data.outTxs) {
        for (const outTx of tx.data.outTxs) {
          if (outTx.chainId) chainsUsed.add(outTx.chainId);
        }
      }
    }
  }
  
  console.log(`📊 Summary calculated:`);
  console.log(`   Unique dates: ${uniqueDates.size}`);
  console.log(`   Chains used: ${chainsUsed.size}`);
  console.log(`   Tokens: ${tokens.size}`);
  
  // Fetch prices
  console.log(`\n💲 Fetching token prices...`);
  for (const tokenSymbol in rawTotals) {
    const token = rawTotals[tokenSymbol];
    if (token.address && token.chainId) {
      token.price = await fetchTokenPrice(token.address, token.chainId);
      await sleep(300);
    }
  }
  
  // Calculate total USD value
  let totalUSDValue = 0;
  const formattedTokens = [];
  
  for (const [sym, token] of Object.entries(rawTotals)) {
    const usdValue = token.price ? token.in * token.price : null;
    if (usdValue) totalUSDValue += usdValue;
    
    formattedTokens.push({
      symbol: sym,
      amount: token.in,
      price: token.price,
      usdValue: usdValue
    });
  }
  
  const result = {
    success: true,
    summary: {
      firstDate: Array.from(uniqueDates).sort()[0] || 'N/A',
      transactionCount: transactions.length,
      uniqueChains: chainsUsed.size,
      uniqueTokens: tokens.size,
      totalUSDValue: totalUSDValue
    },
    tokens: formattedTokens
  };
  
  console.log(`\n✅ ANALYSIS COMPLETE:`);
  console.log(`   Success: ${result.success}`);
  console.log(`   Transaction count: ${result.summary.transactionCount}`);
  console.log(`   Total USD value: ${formatUSD(result.summary.totalUSDValue)}`);
  console.log(`   First date: ${result.summary.firstDate}`);
  
  return result;
}

module.exports = { analyzeAddress };