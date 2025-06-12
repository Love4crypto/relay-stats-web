# 🌉 Relay Stats - Multi-Chain Transaction Analytics

A powerful web application for analyzing blockchain transactions across multiple networks. Get detailed insights into your wallet's cross-chain activity with beautiful visualizations and comprehensive statistics.

## 🚀 How it looks

<div align="center">

### Transaction Analysis Dashboard
<img src="https://github.com/Love4crypto/relay-stats-web/blob/main/public/demo1.png" alt="Relay Stats Demo 1" width="700"/>

### Multi-Chain Analytics Overview  
<img src="https://github.com/Love4crypto/relay-stats-web/blob/main/public/demo2.png" alt="Relay Stats Demo 2" width="700"/>

</div>

## ✨ Features & Current Status

### 🟢 **Active Features**
- **✅ Multi-Chain Address Analysis**
  - Comprehensive transaction history analysis
  - Cross-chain activity tracking
  - Token interaction mapping
  - Historical transaction discovery

- **✅ Wallet Integration**
  - **Ethereum Wallets**: MetaMask, WalletConnect, Coinbase Wallet
  - **Solana Wallets**: Phantom, Backpack, Solflare
  - One-click wallet connection with automatic address detection

- **✅ Comprehensive Analytics**
  - Total transaction count across all supported chains
  - Complete USD value calculations with historical pricing
  - Unique chains and tokens interaction tracking
  - First transaction date discovery
  - Beautiful charts and visualizations
  - Detailed transaction breakdowns per chain

- **✅ Advanced Address Support**
  - ENS domain resolution (e.g., `vitalik.eth`)
  - Case-sensitive Solana address handling
  - Ethereum address normalization
  - Automatic address format detection

### 🟡 **Backend Ready (Frontend Hidden)**
- **⚠️ Leaderboard System** - Fully functional backend with opt-in signature verification, but temporarily hidden from frontend
  - Multi-metric rankings (transactions, volume, chains, tokens)
  - Cryptographic signature verification for privacy
  - GDPR-compliant opt-in/opt-out system
  - SQLite database with ACID transactions and WAL mode

### 🔴 **Planned Features**
- Additional blockchain networks
- Historical portfolio tracking
- NFT transaction analysis
- DeFi protocol interaction mapping
- Export functionality (CSV, PDF reports)

## 🏗️ Architecture

### **Frontend**
- Pure JavaScript (ES6+) - No frameworks, lightning fast
- Responsive CSS with modern design
- Web3 integration for wallet connectivity
- Real-time transaction processing

### **Backend**
- Node.js with Express.js
- SQLite database with WAL mode for performance
- Multi-chain transaction analysis
- Cryptographic signature verification (Ethereum & Solana)

## 📦 Installation

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn package manager

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/relay-stats-app.git
cd relay-stats-app
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory:

```env
# Server Configuration
MAX_RETRIES=3

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
ANALYSIS_RATE_LIMIT_WINDOW_MS=300000
ANALYSIS_RATE_LIMIT_MAX_REQUESTS=10

# Cache Configuration
CACHE_TTL=43200000
CACHE_MAX_SIZE=100

# NFT Configuration
NFT_ELIGIBILITY_THRESHOLD=4

# External APIs
RELAY_API_BASE_URL=https://api.relay.link
ETHEREUM_RPC_URL=your_ethereum_rpc_url
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# Security
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Logging
LOG_LEVEL=info
LOG_MAX_SIZE=5m
LOG_MAX_FILES=5

# Features
ENABLE_ANALYTICS=false
ENABLE_CACHE_COMPRESSION=true
ENABLE_REQUEST_LOGGING=true
```

### 4. Initialize Database
The database will be automatically created when you first run the application.

### 5. Start the Application
```bash
# Development mode
npm start

# Or if you have nodemon installed
npm run dev
```

### 6. Access the Application
Open your browser and navigate to: `http://localhost:3000`

## 🛠️ Development

### Project Structure
```
relay-stats-app/
├── server.js              # Main Express server & API routes
├── leaderboard.js          # Database operations & leaderboard logic
├── analysis.js             # Multi-chain transaction analysis engine
├── public/
│   ├── index.html         # Frontend HTML
│   ├── app.js             # Frontend JavaScript & wallet integration
│   └── styles.css         # Frontend styling
├── package.json           # Dependencies
└── README.md             # This file
```

### Key Files
- **`server.js`** - Express server, API routes, signature verification, wallet integration
- **`analysis.js`** - Core logic for fetching and processing blockchain transaction data
- **`leaderboard.js`** - SQLite database operations, ranking calculations, user stats
- **`public/app.js`** - Frontend wallet connection, UI interactions, Web3 integration

### Database Schema
```sql
CREATE TABLE user_stats (
  address TEXT PRIMARY KEY NOT NULL,
  transaction_count INTEGER DEFAULT 0,
  total_usd_value REAL DEFAULT 0,
  unique_chains INTEGER DEFAULT 0,
  unique_tokens INTEGER DEFAULT 0,
  first_transaction_date TEXT,
  last_updated INTEGER,
  last_activity INTEGER,
  opt_in_leaderboard INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);
```

## 🔧 Configuration

### Supported Chains
Check your `analysis.js` file to see which blockchain networks are currently supported and configured.

### Rate Limiting
The app includes built-in rate limiting to respect API limits and prevent abuse.

## 🚀 Deployment

### Digital Ocean App Platform (Recommended)
1. Fork this repository
2. Connect your GitHub to Digital Ocean App Platform
3. Add environment variables in Digital Ocean dashboard
4. Deploy automatically from GitHub

### Traditional VPS/Server
```bash
# Install PM2 for process management
npm install -g pm2

# Start application with PM2
pm2 start server.js --name "relay-stats"

# Set up nginx reverse proxy (optional)
# Configure SSL with Let's Encrypt (recommended)
```

### Environment Variables for Production
```env
NODE_ENV=production
PORT=3000
# Add any API keys your analysis.js requires
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines
- Follow existing code style and structure
- Add proper error handling for new features
- Test thoroughly with multiple wallet types
- Update README for any new functionality

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Common Issues

**Issue**: "Database connection fails"
**Solution**: Ensure the app has write permissions in the directory for SQLite database creation

**Issue**: "Wallet connection fails"
**Solution**: Check that wallet extension is installed, unlocked, and supports the required networks

**Issue**: "Transaction data not loading"
**Solution**: Check your API keys and rate limits in the analysis.js configuration

### Getting Help
- Open an issue on GitHub
- Check existing issues for solutions
- Review the server logs for detailed error messages

## 🙏 Acknowledgments

- **Web3 Community** for wallet integration standards
- **SQLite** for reliable local database storage
- **Express.js** for robust API framework

---

**Built with ❤️ for multi-chain transaction analysis**
