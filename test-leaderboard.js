const leaderboard = require('./leaderboard');

async function test() {
  try {
    await leaderboard.initializeDatabase();
    console.log('✅ Database initialized');
    
    // Test adding a user
    const result = await leaderboard.updateUserStats('0x768f8ece2601a05c5d2bea98013dfd91ea6740b9', true);
    console.log('✅ User stats updated:', result);
    
    // Test getting leaderboard
    const board = await leaderboard.getLeaderboard('transactions', 10);
    console.log('✅ Leaderboard:', board);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

test();