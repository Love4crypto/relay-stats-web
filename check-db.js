const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'leaderboard.db');
console.log('🔍 Checking database at:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Database connection error:', err);
    return;
  }
  console.log('✅ Connected to database');
});

// Check if tables exist
db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='user_stats'", (err, row) => {
  if (err) {
    console.error('❌ Table check error:', err);
    return;
  }
  
  if (row) {
    console.log('✅ user_stats table exists');
    
    // Count total users
    db.get("SELECT COUNT(*) as count FROM user_stats", (err, row) => {
      if (err) {
        console.error('❌ Count error:', err);
        return;
      }
      console.log(`📊 Total users in database: ${row.count}`);
      
      // Show sample data
      db.all("SELECT address, transaction_count, total_usd_value, opt_in_leaderboard FROM user_stats LIMIT 5", (err, rows) => {
        if (err) {
          console.error('❌ Sample data error:', err);
          return;
        }
        
        console.log('\n📋 Sample user data:');
        rows.forEach((row, i) => {
          console.log(`${i + 1}. ${row.address.substring(0, 10)}... - ${row.transaction_count} txs - $${row.total_usd_value.toFixed(2)} - Opted in: ${row.opt_in_leaderboard ? 'Yes' : 'No'}`);
        });
        
        db.close();
      });
    });
  } else {
    console.log('❌ user_stats table does not exist');
    db.close();
  }
});