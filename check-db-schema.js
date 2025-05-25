const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'leaderboard.db');

function fixLeaderboardData() {
  const db = new sqlite3.Database(dbPath);
  
  console.log('🔧 Starting leaderboard data integrity check...');
  
  db.serialize(() => {
    // 1. Fix any null opt_in_leaderboard values
    db.run(`
      UPDATE user_stats 
      SET opt_in_leaderboard = 0 
      WHERE opt_in_leaderboard IS NULL
    `, function(err) {
      if (err) {
        console.error('Error fixing null opt_in values:', err);
      } else {
        console.log(`✅ Fixed ${this.changes} null opt_in values`);
      }
    });
    
    // 2. Fix any invalid opt_in values (should be 0 or 1)
    db.run(`
      UPDATE user_stats 
      SET opt_in_leaderboard = 
        CASE 
          WHEN opt_in_leaderboard > 0 THEN 1 
          ELSE 0 
        END
      WHERE opt_in_leaderboard NOT IN (0, 1)
    `, function(err) {
      if (err) {
        console.error('Error fixing invalid opt_in values:', err);
      } else {
        console.log(`✅ Fixed ${this.changes} invalid opt_in values`);
      }
    });
    
    // 3. Fix any users with zero transactions but opted in
    db.run(`
      UPDATE user_stats 
      SET opt_in_leaderboard = 0 
      WHERE transaction_count <= 0 AND opt_in_leaderboard = 1
    `, function(err) {
      if (err) {
        console.error('Error fixing zero transaction counts:', err);
      } else {
        console.log(`✅ Fixed ${this.changes} users with zero transactions but opted in`);
      }
    });
    
    // 4. Update timestamps for entries that need them
    db.run(`
      UPDATE user_stats 
      SET 
        last_updated = strftime('%s', 'now'),
        last_activity = strftime('%s', 'now')
      WHERE last_updated IS NULL OR last_activity IS NULL
    `, function(err) {
      if (err) {
        console.error('Error fixing timestamps:', err);
      } else {
        console.log(`✅ Fixed ${this.changes} timestamp entries`);
      }
    });
    
    // 5. Show final stats
    db.get(`
      SELECT 
        COUNT(*) as total, 
        COUNT(CASE WHEN opt_in_leaderboard = 1 THEN 1 END) as opted_in,
        COUNT(CASE WHEN transaction_count > 0 THEN 1 END) as with_transactions
      FROM user_stats
    `, (err, result) => {
      if (err) {
        console.error('Error getting stats:', err);
      } else {
        console.log(`\n📊 Final stats:`);
        console.log(`   Total users: ${result.total}`);
        console.log(`   Opted in: ${result.opted_in}`);
        console.log(`   With transactions: ${result.with_transactions}`);
      }
      
      // 6. Show the current opted-in users
      db.all(`
        SELECT address, transaction_count, opt_in_leaderboard 
        FROM user_stats 
        WHERE opt_in_leaderboard = 1 
        ORDER BY transaction_count DESC
      `, (err, users) => {
        if (err) {
          console.error('Error getting opted-in users:', err);
        } else {
          console.log(`\n✅ Current opted-in users:`);
          users.forEach((user, i) => {
            console.log(`   ${i + 1}. ${user.address.substring(0, 20)}... (${user.transaction_count} txns)`);
          });
        }
        db.close();
        console.log('\n🎉 Database integrity check completed!');
      });
    });
  });
}

if (require.main === module) {
  fixLeaderboardData();
}

module.exports = { fixLeaderboardData };