const express = require('express');
const cors = require('cors');
const path = require('path');
const analysisModule = require('./analysis');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// API endpoint to analyze an address
app.post('/api/analyze', async (req, res) => {
  try {
    const { address } = req.body;
    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }
    
    const results = await analysisModule.analyzeAddress(address);
    res.json(results);
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to verify eligibility for NFT minting
app.post('/api/verify-eligibility', async (req, res) => {
  try {
    const { address } = req.body;
    
    if (!address) {
      return res.status(400).json({
        eligible: false,
        error: 'Address is required'
      });
    }
    
    // Use the existing analysis module
    const analysisResult = await analysisModule.analyzeAddress(address);
    
    if (analysisResult.success) {
      const transactionCount = analysisResult.summary.transactionCount;
      // User is eligible if they have 4+ transactions
      return res.json({
        eligible: transactionCount >= 4,
        transactionCount: transactionCount,
        requiredCount: 4
      });
    }
    
    // If analysis failed, return not eligible
    return res.json({
      eligible: false,
      error: 'Failed to analyze transactions',
      transactionCount: 0
    });
    
  } catch (error) {
    console.error('Eligibility check error:', error);
    res.status(500).json({
      eligible: false,
      error: 'Internal server error',
      transactionCount: 0
    });
  }
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Open your browser and visit: http://localhost:${PORT}`);
});