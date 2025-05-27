const leaderboard = require('./leaderboard');

async function testLeaderboard() {
  try {
    console.log('🧪 Testing leaderboard functionality...\n');
    
    // Initialize database
    await leaderboard.initializeDatabase();
    console.log('✅ Database initialized\n');
    
    // Test all leaderboard types
    const types = ['transactions', 'volume', 'chains', 'tokens'];
    
    for (const type of types) {
      console.log(`📊 Testing ${type} leaderboard:`);
      
      const result = await leaderboard.getLeaderboardPaginated(type, 10, 0);
      
      if (result.data && result.data.length > 0) {
        console.log(`   ✅ Found ${result.data.length} entries (total: ${result.total})`);
        result.data.forEach((user, i) => {
          console.log(`   ${i + 1}. ${user.address.substring(0, 20)}... - ${user[type === 'transactions' ? 'transaction_count' : type === 'volume' ? 'total_usd_value' : type === 'chains' ? 'unique_chains' : 'unique_tokens']}`);
        });
      } else {
        console.log('   ⚠️  No entries found');
      }
      console.log('');
    }
    
    // Test user rank for opted-in users
    console.log('🎯 Testing user ranks:');
    const testAddresses = [
      '8hi1pwkhcofh2tcu4paf34jdkrhltpqpyjayxwyah2ta',
      '0x3d4233ff0fecc8bd801ee0f80d3ec4f9f28f91d6'
    ];
    
    for (const address of testAddresses) {
      const rankResult = await leaderboard.getUserRank(address);
      if (rankResult.success) {
        console.log(`   ${address.substring(0, 20)}...:`);
        console.log(`   - Transactions rank: ${rankResult.ranks.transactions}`);
        console.log(`   - Volume rank: ${rankResult.ranks.volume}`);
        console.log(`   - Chains rank: ${rankResult.ranks.chains}`);
        console.log(`   - Tokens rank: ${rankResult.ranks.tokens}`);
        console.log(`   - Opted in: ${rankResult.userStats.opt_in_leaderboard ? 'Yes' : 'No'}\n`);
      }
    }
    
    console.log('🎉 All leaderboard tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testLeaderboard();