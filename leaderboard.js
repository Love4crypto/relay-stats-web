const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'leaderboard.db');
let db;

// Initialize the database with proper connection handling
function initializeDatabase() {
  return new Promise((resolve, reject) => {
    // Close existing connection if any
    if (db) {
      db.close((err) => {
        if (err) console.warn('Error closing existing database:', err);
      });
    }
    
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Database connection error:', err);
        return reject(err);
      }
      
      console.log('Connected to leaderboard database');
      
      // Enable WAL mode for better concurrency
      db.run('PRAGMA journal_mode=WAL', (err) => {
        if (err) console.warn('Failed to enable WAL mode:', err);
      });
      
      // Set synchronous mode for better performance
      db.run('PRAGMA synchronous=NORMAL', (err) => {
        if (err) console.warn('Failed to set synchronous mode:', err);
      });
      
      // Create user_stats table
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS user_stats (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          address TEXT UNIQUE NOT NULL,
          transaction_count INTEGER DEFAULT 0,
          total_usd_value REAL DEFAULT 0,
          unique_chains INTEGER DEFAULT 0,
          unique_tokens INTEGER DEFAULT 0,
          first_transaction_date TEXT,
          last_updated TEXT,
          opt_in_leaderboard INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;
      
      db.run(createTableSQL, (err) => {
        if (err) {
          console.error('Error creating user_stats table:', err);
          return reject(err);
        }
        
        console.log('✅ user_stats table ready');
        
        // Create indexes for better performance
        const createIndexes = [
          'CREATE INDEX IF NOT EXISTS idx_transaction_count ON user_stats(transaction_count DESC)',
          'CREATE INDEX IF NOT EXISTS idx_total_usd_value ON user_stats(total_usd_value DESC)',
          'CREATE INDEX IF NOT EXISTS idx_unique_chains ON user_stats(unique_chains DESC)',
          'CREATE INDEX IF NOT EXISTS idx_unique_tokens ON user_stats(unique_tokens DESC)',
          'CREATE INDEX IF NOT EXISTS idx_opt_in ON user_stats(opt_in_leaderboard)',
          'CREATE INDEX IF NOT EXISTS idx_address ON user_stats(address)'
        ];
        
        Promise.all(createIndexes.map(sql => {
          return new Promise((resolveIndex, rejectIndex) => {
            db.run(sql, (err) => {
              if (err) {
                console.error('Index creation error:', err);
                rejectIndex(err);
              } else {
                resolveIndex();
              }
            });
          });
        })).then(() => {
          console.log('✅ Database indexes created');
          resolve();
        }).catch(reject);
      });
    });
  });
}

// FIXED: Update user stats with proper transaction handling
async function updateUserStats(address, autoOptIn = false) {
  return new Promise(async (resolve, reject) => {
    try {
      // ⚠️ CRITICAL FIX: Only normalize Ethereum addresses, preserve Solana case
      let normalizedAddress;
      if (address.startsWith('0x')) {
        normalizedAddress = address.toLowerCase();
      } else {
        normalizedAddress = address;
      }
      
      console.log('📊 Updating user stats...');
      console.log('Original address:', address);
      console.log('Normalized address:', normalizedAddress);
      
      const analysis = require('./analysis');
      
      const result = await analysis.analyzeAddress(address, { forceRefresh: false });
      
      if (!result.success || result.summary.transactionCount === 0) {
        return resolve({
          success: false,
          error: 'No valid transaction data to update leaderboard stats'
        });
      }

      const stats = {
        address: normalizedAddress,
        transaction_count: result.summary.transactionCount,
        total_usd_value: result.summary.totalUSDValue || 0,
        unique_chains: result.summary.uniqueChains || 0,
        unique_tokens: result.summary.uniqueTokens || 0,
        first_transaction_date: result.summary.firstDate,
        last_updated: new Date().toISOString(),
        opt_in_leaderboard: autoOptIn ? 1 : 0
      };

      // FIXED: Use a transaction to ensure data consistency
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        // First check if user exists
        db.get('SELECT opt_in_leaderboard FROM user_stats WHERE address = ?', [normalizedAddress], (err, existing) => {
          if (err) {
            db.run('ROLLBACK');
            return reject(err);
          }
          
          // Preserve existing opt-in status if user exists
          const finalOptIn = existing ? existing.opt_in_leaderboard : stats.opt_in_leaderboard;
          
          const sql = `
            INSERT OR REPLACE INTO user_stats (
              address, transaction_count, total_usd_value, unique_chains, 
              unique_tokens, first_transaction_date, last_updated, opt_in_leaderboard
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `;

          db.run(sql, [
            stats.address, stats.transaction_count, stats.total_usd_value,
            stats.unique_chains, stats.unique_tokens, stats.first_transaction_date,
            stats.last_updated, finalOptIn
          ], function(err) {
            if (err) {
              db.run('ROLLBACK');
              console.error('Database error updating user stats:', err);
              return reject(err);
            }

            db.run('COMMIT', (commitErr) => {
              if (commitErr) {
                console.error('Transaction commit error:', commitErr);
                return reject(commitErr);
              }
              
              console.log(`✅ User stats updated for ${normalizedAddress} (opted in: ${finalOptIn})`);
              
              resolve({
                success: true,
                stats: { ...stats, opt_in_leaderboard: finalOptIn },
                message: 'User stats updated successfully'
              });
            });
          });
        });
      });

    } catch (error) {
      console.error('Error in updateUserStats:', error);
      reject(error);
    }
  });
}

// FIXED: Improved leaderboard query with better filtering
async function getLeaderboardPaginated(type, limit = 50, offset = 0, search = null) {
  return new Promise((resolve, reject) => {
    const validTypes = {
      'transactions': 'transaction_count',
      'volume': 'total_usd_value', 
      'chains': 'unique_chains',
      'tokens': 'unique_tokens'
    };

    const column = validTypes[type];
    if (!column) {
      return reject(new Error('Invalid leaderboard type'));
    }

    try {
      // FIXED: Ensure we only show opted-in users with valid data
      let whereClause = 'WHERE opt_in_leaderboard = 1 AND transaction_count > 0';
      let params = [];
      
      if (search) {
        whereClause += ' AND address LIKE ?';
        params.push(`%${search}%`);
      }

      // Get total count for pagination
      const countQuery = `SELECT COUNT(*) as total FROM user_stats ${whereClause}`;
      
      db.get(countQuery, params, (err, countResult) => {
        if (err) {
          return reject(err);
        }
        
        const total = countResult.total;

        // Get paginated data with consistent ordering
        const dataQuery = `
          SELECT 
            address,
            transaction_count,
            total_usd_value,
            unique_chains,
            unique_tokens,
            first_transaction_date,
            last_updated,
            opt_in_leaderboard,
            ROW_NUMBER() OVER (ORDER BY ${column} DESC, address ASC) as rank
          FROM user_stats 
          ${whereClause}
          ORDER BY ${column} DESC, address ASC
          LIMIT ? OFFSET ?
        `;
        
        const dataParams = [...params, limit, offset];
        
        db.all(dataQuery, dataParams, (err, users) => {
          if (err) {
            return reject(err);
          }

          resolve({
            data: users.map(user => ({
              ...user,
              rank: user.rank,
              total_usd_value: parseFloat(user.total_usd_value) || 0
            })),
            total: total
          });
        });
      });

    } catch (error) {
      console.error('Database error in getLeaderboardPaginated:', error);
      reject(error);
    }
  });
}

// FIXED: Improved user rank calculation
async function getUserRank(address) {
  return new Promise((resolve, reject) => {
    let normalizedAddress;
    if (address.startsWith('0x')) {
      normalizedAddress = address.toLowerCase();
    } else {
      normalizedAddress = address;
    }
    
    console.log('🎯 Getting user rank...');
    console.log('Original address:', address);
    console.log('Normalized address:', normalizedAddress);
    
    db.get(
      'SELECT * FROM user_stats WHERE address = ?',
      [normalizedAddress],
      (err, userStats) => {
        if (err) {
          return reject(err);
        }

        if (!userStats) {
          return resolve({
            success: false,
            error: 'User not found in database',
            userStats: null,
            ranks: { transactions: null, volume: null, chains: null, tokens: null }
          });
        }

        // FIXED: Calculate ranks against opted-in users only
        const rankQueries = [
          `SELECT COUNT(*) + 1 as rank FROM user_stats 
           WHERE transaction_count > ? AND opt_in_leaderboard = 1 AND transaction_count > 0`,
          `SELECT COUNT(*) + 1 as rank FROM user_stats 
           WHERE total_usd_value > ? AND opt_in_leaderboard = 1 AND transaction_count > 0`,
          `SELECT COUNT(*) + 1 as rank FROM user_stats 
           WHERE unique_chains > ? AND opt_in_leaderboard = 1 AND transaction_count > 0`,
          `SELECT COUNT(*) + 1 as rank FROM user_stats 
           WHERE unique_tokens > ? AND opt_in_leaderboard = 1 AND transaction_count > 0`
        ];

        const rankParams = [
          userStats.transaction_count,
          userStats.total_usd_value,
          userStats.unique_chains,
          userStats.unique_tokens
        ];

        Promise.all(
          rankQueries.map((query, index) => {
            return new Promise((resolveRank) => {
              db.get(query, [rankParams[index]], (err, result) => {
                if (err) {
                  console.error('Rank query error:', err);
                  resolveRank(null);
                } else {
                  resolveRank(result.rank);
                }
              });
            });
          })
        ).then(ranks => {
          resolve({
            success: true,
            userStats: userStats,
            ranks: {
              transactions: ranks[0],
              volume: ranks[1],
              chains: ranks[2],
              tokens: ranks[3]
            }
          });
        });
      }
    );
  });
}

// FIXED: Improved opt-in status update with proper locking
async function updateOptInStatus(address, optIn) {
  return new Promise((resolve, reject) => {
    let normalizedAddress;
    if (address.startsWith('0x')) {
      normalizedAddress = address.toLowerCase();
    } else {
      normalizedAddress = address;
    }
    
    console.log('🔄 Updating opt-in status...');
    console.log('Original address:', address);
    console.log('Normalized address:', normalizedAddress);
    console.log('Opt-in value:', optIn);
    
    // Use a transaction to ensure atomicity
    db.serialize(() => {
      db.run('BEGIN IMMEDIATE TRANSACTION');
      
      db.get(
        'SELECT * FROM user_stats WHERE address = ?',
        [normalizedAddress],
        (err, userStats) => {
          if (err) {
            db.run('ROLLBACK');
            return reject(err);
          }

          if (!userStats) {
            db.run('ROLLBACK');
            return resolve({
              success: false,
              error: 'User not found. Please analyze the address first.'
            });
          }

          const sql = `
            UPDATE user_stats 
            SET opt_in_leaderboard = ?, last_updated = ?
            WHERE address = ?
          `;

          db.run(sql, [optIn ? 1 : 0, new Date().toISOString(), normalizedAddress], function(err) {
            if (err) {
              db.run('ROLLBACK');
              console.error('Error updating opt-in status:', err);
              return reject(err);
            }

            if (this.changes === 0) {
              db.run('ROLLBACK');
              return resolve({
                success: false,
                error: 'No user found to update'
              });
            }

            db.run('COMMIT', (commitErr) => {
              if (commitErr) {
                console.error('Commit error:', commitErr);
                return reject(commitErr);
              }

              // Get updated user stats
              db.get(
                'SELECT * FROM user_stats WHERE address = ?',
                [normalizedAddress],
                (err, updatedStats) => {
                  if (err) {
                    return reject(err);
                  }

                  console.log(`✅ User ${normalizedAddress} opt-in status updated to: ${optIn}`);

                  resolve({
                    success: true,
                    message: optIn ? 'Successfully joined leaderboard' : 'Successfully left leaderboard',
                    userStats: updatedStats
                  });
                }
              );
            });
          });
        }
      );
    });
  });
}

module.exports = {
  initializeDatabase,
  updateUserStats,
  getLeaderboardPaginated,
  getUserRank,
  updateOptInStatus
};