const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'leaderboard.db');
let db;

// Initialize the database
function initializeDatabase() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Database connection error:', err);
        return reject(err);
      }
      
      console.log('Connected to leaderboard database');
      
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

// Update user stats (without circular dependency)
async function updateUserStats(address, autoOptIn = false) {
  return new Promise((resolve, reject) => {
    try {
      // Get current analysis data from cache or API
      const analysis = require('./analysis');
      
      // Call analyzeAddress to get the latest data
      analysis.analyzeAddress(address, { forceRefresh: false })
        .then(result => {
          if (!result.success || result.summary.transactionCount === 0) {
            return resolve({
              success: false,
              error: 'No valid transaction data to update leaderboard stats'
            });
          }

          const stats = {
            address: address.toLowerCase(),
            transaction_count: result.summary.transactionCount,
            total_usd_value: result.summary.totalUSDValue || 0,
            unique_chains: result.summary.uniqueChains || 0,
            unique_tokens: result.summary.uniqueTokens || 0,
            first_transaction_date: result.summary.firstDate,
            last_updated: new Date().toISOString(),
            opt_in_leaderboard: autoOptIn ? 1 : 0
          };

          // Use INSERT OR REPLACE but preserve existing opt_in_leaderboard status
          const sql = `
            INSERT OR REPLACE INTO user_stats (
              address, transaction_count, total_usd_value, unique_chains, 
              unique_tokens, first_transaction_date, last_updated, opt_in_leaderboard
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 
              CASE 
                WHEN EXISTS(SELECT 1 FROM user_stats WHERE address = ?) 
                THEN COALESCE((SELECT opt_in_leaderboard FROM user_stats WHERE address = ?), ?)
                ELSE ?
              END
            )
          `;

          db.run(sql, [
            stats.address, stats.transaction_count, stats.total_usd_value,
            stats.unique_chains, stats.unique_tokens, stats.first_transaction_date,
            stats.last_updated,
            stats.address, // for EXISTS check
            stats.address, // for SELECT opt_in_leaderboard
            stats.opt_in_leaderboard, // COALESCE fallback
            stats.opt_in_leaderboard  // ELSE value
          ], function(err) {
            if (err) {
              console.error('Database error updating user stats:', err);
              return reject(err);
            }

            console.log(`✅ User stats updated for ${address} (opted in: ${autoOptIn})`);
            
            resolve({
              success: true,
              stats: stats,
              message: 'User stats updated successfully'
            });
          });

        })
        .catch(analysisError => {
          console.error('Error getting analysis data for leaderboard update:', analysisError);
          reject(analysisError);
        });

    } catch (error) {
      console.error('Error in updateUserStats:', error);
      reject(error);
    }
  });
}

// Get leaderboard by type
async function getLeaderboard(type = 'transactions', limit = 50) {
  return new Promise((resolve, reject) => {
    let orderColumn;
    
    switch (type) {
      case 'transactions':
        orderColumn = 'transaction_count';
        break;
      case 'volume':
        orderColumn = 'total_usd_value';
        break;
      case 'chains':
        orderColumn = 'unique_chains';
        break;
      case 'tokens':
        orderColumn = 'unique_tokens';
        break;
      default:
        orderColumn = 'transaction_count';
    }

    const sql = `
      SELECT 
        ROW_NUMBER() OVER (ORDER BY ${orderColumn} DESC) as rank,
        address,
        transaction_count,
        total_usd_value,
        unique_chains,
        unique_tokens,
        first_transaction_date,
        last_updated
      FROM user_stats 
      WHERE opt_in_leaderboard = 1 
        AND ${orderColumn} > 0
      ORDER BY ${orderColumn} DESC 
      LIMIT ?
    `;

    db.all(sql, [limit], (err, rows) => {
      if (err) {
        console.error('Leaderboard query error:', err);
        return reject(err);
      }

      resolve(rows || []);
    });
  });
}

// Get user rank
async function getUserRank(address) {
  return new Promise((resolve, reject) => {
    const normalizedAddress = address.toLowerCase();
    
    // First check if user exists in database
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
            ranks: {
              transactions: null,
              volume: null,
              chains: null,
              tokens: null
            }
          });
        }

        // Get ranks regardless of opt-in status
        const rankQueries = [
          `SELECT COUNT(*) + 1 as rank FROM user_stats 
           WHERE transaction_count > ? AND opt_in_leaderboard = 1`,
          `SELECT COUNT(*) + 1 as rank FROM user_stats 
           WHERE total_usd_value > ? AND opt_in_leaderboard = 1`,
          `SELECT COUNT(*) + 1 as rank FROM user_stats 
           WHERE unique_chains > ? AND opt_in_leaderboard = 1`,
          `SELECT COUNT(*) + 1 as rank FROM user_stats 
           WHERE unique_tokens > ? AND opt_in_leaderboard = 1`
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

// Update opt-in status
async function updateOptInStatus(address, optIn) {
  return new Promise((resolve, reject) => {
    const normalizedAddress = address.toLowerCase();
    
    // First check if user exists
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
            error: 'User not found. Please analyze the address first.'
          });
        }

        // Update opt-in status
        const sql = `
          UPDATE user_stats 
          SET opt_in_leaderboard = ?, last_updated = ?
          WHERE address = ?
        `;

        db.run(sql, [optIn ? 1 : 0, new Date().toISOString(), normalizedAddress], function(err) {
          if (err) {
            console.error('Error updating opt-in status:', err);
            return reject(err);
          }

          if (this.changes === 0) {
            return resolve({
              success: false,
              error: 'No user found to update'
            });
          }

          // Get updated user stats
          db.get(
            'SELECT * FROM user_stats WHERE address = ?',
            [normalizedAddress],
            (err, updatedStats) => {
              if (err) {
                return reject(err);
              }

              resolve({
                success: true,
                message: optIn ? 'Successfully joined leaderboard' : 'Successfully left leaderboard',
                userStats: updatedStats
              });
            }
          );
        });
      }
    );
  });
}

// Export all functions
module.exports = {
  initializeDatabase,
  updateUserStats,
  getLeaderboard,
  getUserRank,
  updateOptInStatus
};