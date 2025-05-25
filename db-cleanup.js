const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./leaderboard.db');

db.run("DELETE FROM user_stats WHERE address = '8Hi1pwKHcoFH2TCu4Paf34JdKRhLtPQPYJaYXWyah2Ta'", 
  function(err) {
    if (err) console.error(err);
    else console.log(`✅ Removed ${this.changes} test addresses`);
    db.close();
  }
);