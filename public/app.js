document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements for all wallet buttons
  const connectMetaMaskBtn = document.getElementById('connect-metamask');
  const connectWalletConnectBtn = document.getElementById('connect-walletconnect');
  const connectCoinbaseBtn = document.getElementById('connect-coinbase');
  const connectPhantomBtn = document.getElementById('connect-phantom');
  const connectSolflareBtn = document.getElementById('connect-solflare');
  const connectBackpackBtn = document.getElementById('connect-backpack');
  const connectKeplrBtn = document.getElementById('connect-keplr');
  const connectLeapBtn = document.getElementById('connect-leap');
  connectWalletConnectBtn.addEventListener('touchstart', function(e) {
  e.preventDefault();
  connectWalletConnect();
});
  
  // Add new modal element references
  const connectWalletBtn = document.getElementById('connect-wallet-btn');
  const walletModal = document.getElementById('wallet-modal');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const walletModalOverlay = document.querySelector('.wallet-modal-overlay');
  
  const walletStatus = document.getElementById('wallet-status');
  const disconnectBtn = document.getElementById('disconnect-btn');
  const addressInput = document.getElementById('address-input');
  const analyzeBtn = document.getElementById('analyze-btn');
  const loadingSection = document.getElementById('loading');
  const resultsSection = document.getElementById('results');
  const errorSection = document.getElementById('error-message');
  const errorText = document.getElementById('error-text');
  const troubleshootingList = document.getElementById('troubleshooting-list');
  
  // Ensure disconnect button is hidden initially
  disconnectBtn.classList.add('hidden');
  
  // Results elements
  const firstDate = document.getElementById('first-date');
  const txCount = document.getElementById('tx-count');
  const chainsCount = document.getElementById('chains-count');
  const tokensCount = document.getElementById('tokens-count');
  const totalValueDisplay = document.getElementById('total-value-display');
  const tokensTableBody = document.getElementById('tokens-tbody');
  
  // NFT minting button reference
  const mintNFTBtn = document.getElementById('mint-nft-btn');
  if (mintNFTBtn) {
    mintNFTBtn.addEventListener('click', mintNFTBadge);
  }
  
  // Event Listeners for wallet connections
  connectMetaMaskBtn.addEventListener('click', connectMetaMask);
  connectWalletConnectBtn.addEventListener('click', connectWalletConnect);
  connectCoinbaseBtn.addEventListener('click', connectCoinbase);
  connectPhantomBtn.addEventListener('click', connectPhantom);
  connectSolflareBtn.addEventListener('click', connectSolflare);
  connectBackpackBtn.addEventListener('click', connectBackpack);
  connectKeplrBtn.addEventListener('click', connectKeplr);
  connectLeapBtn.addEventListener('click', connectLeap);
  
  analyzeBtn.addEventListener('click', analyzeManualAddress);
  disconnectBtn.addEventListener('click', disconnectWallet);
  
  // Event listeners for wallet modal
  connectWalletBtn.addEventListener('click', showWalletModal);
  closeModalBtn.addEventListener('click', hideWalletModal);
  walletModalOverlay.addEventListener('click', hideWalletModal);
  
  // Functions to show/hide wallet modal
  function showWalletModal() {
    walletModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // Prevent scrolling when modal is open
  }
  
  function hideWalletModal() {
    walletModal.classList.add('hidden');
    document.body.style.overflow = ''; // Restore scrolling
  }
  
  // Check wallet availability when page loads
  checkWalletAvailability();
  
  // Add CSS for ineligible status
  addIneligibleStyles();
  
  // EVM Wallet Connections
  async function connectMetaMask() {
    if (!window.ethereum) {
      showInstallInstructions('connect-metamask');
      return;
    }
    
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const address = accounts[0];
      updateWalletStatus(address, 'MetaMask');
      analyzeAddress(address);
    } catch (error) {
      console.error('MetaMask connection error:', error);
      walletStatus.textContent = 'Connection failed';
    }
  }
  
async function connectWalletConnect() {
  try {
    // Check if WalletConnect is available
    if (typeof WalletConnectProvider === 'undefined') {
      console.error("WalletConnect provider not found");
      alert("WalletConnect library not loaded. Please refresh the page and try again.");
      return;
    }

    // Check if we're on mobile
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    console.log("Device detection:", isMobile ? "Mobile" : "Desktop");
    
    // Mobile-optimized configuration
    const providerOptions = {
      rpc: {
        1: "https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
        137: "https://polygon-rpc.com", 
        56: "https://bsc-dataseed.binance.org"
      },
      qrcodeModalOptions: {
        mobileLinks: [
          "metamask",
          "trust",
          "rainbow",
          "argent",
          "imtoken"
        ]
      }
    };
    
    // Create a new provider instance
    console.log("Creating WalletConnect provider...");
    const provider = new WalletConnectProvider.default(providerOptions);
    
    console.log("Enabling WalletConnect provider...");
    await provider.enable();
    window.walletConnectProvider = provider;
    
    // Create Web3 instance
    console.log("Creating Web3 instance...");
    const web3 = new Web3(provider);
    
    // Get accounts
    console.log("Getting accounts...");
    const accounts = await web3.eth.getAccounts();
    const address = accounts[0];
    
    console.log("Connected with address:", address);
    updateWalletStatus(address, 'WalletConnect');
    analyzeAddress(address);
    
    // Handle disconnect
    provider.on("disconnect", (code, reason) => {
      console.log("WalletConnect disconnected:", code, reason);
      resetConnectionUI();
    });
    
  } catch (error) {
    console.error('WalletConnect error:', error);
    walletStatus.textContent = 'Connection failed';
    alert("WalletConnect connection failed: " + error.message);
  }
}
  
  async function connectCoinbase() {
    try {
      if (!window.CoinbaseWalletSDK) {
        showInstallInstructions('connect-coinbase');
        return;
      }
      
      const coinbaseWallet = new CoinbaseWalletSDK({
        appName: 'Relay Stats App',
        appLogoUrl: 'https://example.com/logo.png',
        darkMode: false
      });
      
      const ethereum = coinbaseWallet.makeWeb3Provider();
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      const address = accounts[0];
      
      updateWalletStatus(address, 'Coinbase Wallet');
      analyzeAddress(address);
      
    } catch (error) {
      console.error('Coinbase Wallet error:', error);
      walletStatus.textContent = 'Connection failed';
    }
  }
  
  // Solana Wallet Connections
  async function connectPhantom() {
    if (!window.solana || !window.solana.isPhantom) {
      showInstallInstructions('connect-phantom');
      return;
    }
    
    try {
      const resp = await window.solana.connect();
      const address = resp.publicKey.toString();
      
      updateWalletStatus(address, 'Phantom');
      analyzeAddress(address);
      
    } catch (error) {
      console.error('Phantom connection error:', error);
      walletStatus.textContent = 'Connection failed';
    }
  }
  
  async function connectSolflare() {
    if (!window.solflare) {
      showInstallInstructions('connect-solflare');
      return;
    }
    
    try {
      await window.solflare.connect();
      const address = window.solflare.publicKey.toString();
      
      updateWalletStatus(address, 'Solflare');
      analyzeAddress(address);
      
    } catch (error) {
      console.error('Solflare connection error:', error);
      walletStatus.textContent = 'Connection failed';
    }
  }
  
  async function connectBackpack() {
    if (!window.backpack) {
      showInstallInstructions('connect-backpack');
      return;
    }
    
    try {
      await window.backpack.connect();
      const address = window.backpack.publicKey.toString();
      
      updateWalletStatus(address, 'Backpack');
      analyzeAddress(address);
      
    } catch (error) {
      console.error('Backpack connection error:', error);
      walletStatus.textContent = 'Connection failed';
    }
  }
  
  // Cosmos Wallet Connections
  async function connectKeplr() {
    if (!window.keplr) {
      showInstallInstructions('connect-keplr');
      return;
    }
    
    try {
      // Use a common Cosmos chain
      await window.keplr.enable("cosmoshub-4");
      const offlineSigner = window.keplr.getOfflineSigner("cosmoshub-4");
      const accounts = await offlineSigner.getAccounts();
      const address = accounts[0].address;
      
      updateWalletStatus(address, 'Keplr');
      analyzeAddress(address);
      
    } catch (error) {
      console.error('Keplr connection error:', error);
      walletStatus.textContent = 'Connection failed';
    }
  }
  
  async function connectLeap() {
    if (!window.leap) {
      showInstallInstructions('connect-leap');
      return;
    }
    
    try {
      // Use a common Cosmos chain
      await window.leap.enable("cosmoshub-4");
      const offlineSigner = window.leap.getOfflineSigner("cosmoshub-4");
      const accounts = await offlineSigner.getAccounts();
      const address = accounts[0].address;
      
      updateWalletStatus(address, 'Leap');
      analyzeAddress(address);
      
    } catch (error) {
      console.error('Leap connection error:', error);
      walletStatus.textContent = 'Connection failed';
    }
  }

  // Disconnect wallet function
  async function disconnectWallet() {
    try {
      // Perform wallet-specific disconnect if applicable
      if (window.ethereum && window.ethereum._state && window.ethereum._state.isConnected) {
        // MetaMask doesn't provide a true disconnect method, we just update the UI
        console.log('Disconnected from MetaMask');
      } 
      else if (window.walletConnectProvider) {
        await window.walletConnectProvider.disconnect();
        window.walletConnectProvider = null;
      }
      else if (window.solana && window.solana.isPhantom) {
        await window.solana.disconnect();
      }
      else if (window.solflare) {
        await window.solflare.disconnect();
      }
      else if (window.backpack) {
        await window.backpack.disconnect();
      }
      else if (window.keplr) {
        // Keplr doesn't provide a direct disconnect method
        console.log('Disconnected from Keplr');
      }
      else if (window.leap) {
        // Leap doesn't provide a direct disconnect method
        console.log('Disconnected from Leap');
      }
      
      // Reset UI state regardless of wallet type
      resetConnectionUI();
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
    }
  }
  
  // Reset connection UI
  function resetConnectionUI() {
    walletStatus.textContent = 'Not connected';
    walletStatus.classList.remove('connected');
    disconnectBtn.classList.add('hidden');
    connectWalletBtn.classList.remove('hidden'); // Show the connect button again
    addressInput.value = '';
    hideAllSections();
  }
  
  // Check wallet availability
  function checkWalletAvailability() {
    const walletChecks = [
      { id: 'connect-metamask', check: () => window.ethereum },
      { id: 'connect-walletconnect', check: () => typeof WalletConnectProvider !== 'undefined' },
      { id: 'connect-coinbase', check: () => typeof CoinbaseWalletSDK !== 'undefined' },
      { id: 'connect-phantom', check: () => window.solana && window.solana.isPhantom },
      { id: 'connect-solflare', check: () => window.solflare },
      { id: 'connect-backpack', check: () => window.backpack },
      { id: 'connect-keplr', check: () => window.keplr },
      { id: 'connect-leap', check: () => window.leap }
    ];
    
    walletChecks.forEach(({ id, check }) => {
      const button = document.getElementById(id);
      if (button && !check()) {
        button.classList.add('wallet-not-installed');
        button.title = 'Wallet not detected. Click to get installation instructions.';
      }
    });
  }
  
  // Add CSS for ineligible status directly via JavaScript
  function addIneligibleStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .ineligible-heading {
        color: #888888;
        opacity: 0.8;
        font-style: italic;
        position: relative;
      }
      
      .ineligible-heading::after {
        content: "😔";
        margin-left: 8px;
        font-style: normal;
      }
      
      .ineligible-description {
        color: #999999;
      }
      
      /* Style for checkmark in eligible criteria */
      .eligibility-criteria.met .checkmark::before {
        content: "✓";
        color: #4CAF50;
      }
      
      /* Style for X mark in ineligible criteria */
      .eligibility-criteria:not(.met) .checkmark::before {
        content: "❌";
        color: #ff5252;
      }
    `;
    document.head.appendChild(style);
  }
  
  function showInstallInstructions(buttonId) {
    const walletName = buttonId.replace('connect-', '');
    let installLink = '';
    
    switch (walletName) {
      case 'metamask':
        installLink = 'https://metamask.io/download/';
        break;
      case 'phantom':
        installLink = 'https://phantom.app/download';
        break;
      case 'solflare':
        installLink = 'https://solflare.com/download';
        break;
      case 'backpack':
        installLink = 'https://www.backpack.app/';
        break;
      case 'keplr':
        installLink = 'https://www.keplr.app/download';
        break;
      case 'leap':
        installLink = 'https://www.leapwallet.io/download';
        break;
      case 'coinbase':
        installLink = 'https://www.coinbase.com/wallet/downloads';
        break;
      case 'walletconnect':
        installLink = 'https://walletconnect.com/';
        break;
      default:
        installLink = 'https://relay.link/bridge'; // Fallback to Relay
    }
    
    alert(`${walletName.charAt(0).toUpperCase() + walletName.slice(1)} wallet is not installed. Please visit ${installLink} to install it.`);
  }
  
  // Update wallet status UI
  function updateWalletStatus(address, walletName) {
    walletStatus.textContent = `Connected to ${walletName}: ${formatAddress(address)}`;
    walletStatus.classList.add('connected');
    addressInput.value = address;
    disconnectBtn.classList.remove('hidden');
    connectWalletBtn.classList.add('hidden'); // Hide connect button when connected
    hideWalletModal(); // Close the modal after successful connection
  }
  
  // Analyze manually entered address
  function analyzeManualAddress() {
    const address = addressInput.value.trim();
    if (!address) {
      alert('Please enter a valid address');
      return;
    }
    
    analyzeAddress(address);
  }
  
  // Make API call to analyze address
  async function analyzeAddress(address) {
    // Reset and show loading
    hideAllSections();
    loadingSection.classList.remove('hidden');
    
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ address })
      });
      
      const data = await response.json();
      
      if (data.success) {
        displayResults(data);
      } else {
        displayError(data);
      }
    } catch (error) {
      console.error('Analysis error:', error);
      errorText.textContent = 'Failed to analyze address. Please try again later.';
      loadingSection.classList.add('hidden');
      errorSection.classList.remove('hidden');
    }
  }
  
  // Display results
  function displayResults(data) {
    // Update summary section
    firstDate.textContent = data.summary.firstDate;
    txCount.textContent = data.summary.transactionCount;
    chainsCount.textContent = data.summary.uniqueChains;
    tokensCount.textContent = data.summary.uniqueTokens;
    
    // Format and display total value
    totalValueDisplay.textContent = formatUSD(data.summary.totalUSDValue);
    
    // Clear previous tokens table
    tokensTableBody.innerHTML = '';
    
    // Sort tokens by USD value (if available)
    const sortedTokens = [...data.tokens].sort((a, b) => {
      // If both have USD values, sort by value
      if (a.usdValue && b.usdValue) return b.usdValue - a.usdValue;
      // If only one has USD value, prioritize it
      if (a.usdValue) return -1;
      if (b.usdValue) return 1;
      // Otherwise sort by amount
      return b.amount - a.amount;
    });
    
    // Add token rows
    sortedTokens.forEach(token => {
      const row = document.createElement('tr');
      
      const symbolCell = document.createElement('td');
      symbolCell.textContent = token.symbol;
      
      const amountCell = document.createElement('td');
      amountCell.textContent = formatNumber(token.amount);
      
      const priceCell = document.createElement('td');
      priceCell.textContent = token.price ? formatUSD(token.price) : 'Unknown';
      
      const valueCell = document.createElement('td');
      valueCell.textContent = token.usdValue ? formatUSD(token.usdValue) : '-';
      
      row.appendChild(symbolCell);
      row.appendChild(amountCell);
      row.appendChild(priceCell);
      row.appendChild(valueCell);
      
      tokensTableBody.appendChild(row);
    });
    
    // Check eligibility for NFT minting (minimum required transactions)
    const minTransactions = 4;
    const isEligibleForNFT = data.summary.transactionCount >= minTransactions;
    
    // Get NFT badge section
    const nftSection = document.getElementById('nft-badge-section');
    if (nftSection) {
      // Always show the NFT section
      nftSection.classList.remove('hidden');
      
      // Update the transaction requirement text
      const txCriteria = nftSection.querySelector('.eligibility-criteria');
      const txRequirementText = txCriteria ? txCriteria.querySelector('span') : null;
      if (txRequirementText) {
        txRequirementText.textContent = `${minTransactions}+ transactions`;
      }
      
      // Title always stays the same
      const nftTitle = nftSection.querySelector('h2');
      if (nftTitle) nftTitle.textContent = '🏆 Relay Bridge Contributor Badge';
      
      // Get references to elements inside the NFT section
      const nftHeading = nftSection.querySelector('h3');
      const nftDescription = nftSection.querySelector('p');
      const nftMintStatus = document.getElementById('nft-mint-status');
      
      if (isEligibleForNFT) {
        // User is eligible - show success message with normal styling
        if (nftHeading) {
          nftHeading.textContent = 'Congratulations! You\'re eligible for a special NFT badge';
          nftHeading.classList.remove('ineligible-heading');
        }
        if (nftDescription) {
          nftDescription.textContent = 'As a multi-transaction Relay bridge user, you can mint this exclusive NFT on Base blockchain.';
          nftDescription.classList.remove('ineligible-description');
        }
        
        // Show checkmark for transaction criteria
        if (txCriteria) txCriteria.classList.add('met');
        
        // Clear any previous status
        if (nftMintStatus) {
          nftMintStatus.textContent = '';
          nftMintStatus.className = 'nft-status';
        }
        
        // Check if connected with EVM wallet
        const isEVMWallet = isConnectedWithEVMWallet();
        const walletCriteria = nftSection.querySelector('.eligibility-criteria.connected');
        if (walletCriteria) {
          if (isEVMWallet) {
            walletCriteria.classList.add('met');
          } else {
            walletCriteria.classList.remove('met');
          }
        }
        
        // Enable mint button if using EVM wallet
        if (mintNFTBtn) {
          mintNFTBtn.classList.remove('hidden');
          mintNFTBtn.disabled = !isEVMWallet;
          if (!isEVMWallet) {
            mintNFTBtn.title = "Please connect with an EVM wallet (MetaMask, WalletConnect, Coinbase)";
          } else {
            mintNFTBtn.title = "Mint your exclusive Relay Badge NFT";
          }
        }
      } else {
        // User is NOT eligible - show ineligibility message with styled text
        if (nftHeading) {
          nftHeading.textContent = 'You\'re not eligible for a special NFT badge, Relay Harder!';
          nftHeading.classList.add('ineligible-heading');
        }
        if (nftDescription) {
          nftDescription.textContent = 'You need to be a multi-transaction Relay bridge user, then you can mint this exclusive NFT on Base.';
          nftDescription.classList.add('ineligible-description');
        }
        
        // Remove checkmark for transaction criteria (shows X instead via CSS)
        if (txCriteria) txCriteria.classList.remove('met');
        
        // Hide the mint button
        if (mintNFTBtn) {
          mintNFTBtn.classList.add('hidden');
        }
        
        // Add an error status message showing current transaction count
        if (nftMintStatus) {
          nftMintStatus.textContent = `You currently have ${data.summary.transactionCount} Relay transaction${data.summary.transactionCount !== 1 ? 's' : ''}. You need at least ${minTransactions} to become eligible.`;
          nftMintStatus.className = 'nft-status error';
        }
      }
    }
    
    // Show results section
    loadingSection.classList.add('hidden');
    resultsSection.classList.remove('hidden');
  }
  
  // Display error
  function displayError(data) {
    errorText.textContent = data.error || 'An unknown error occurred';
    
    // Clear and populate troubleshooting list
    troubleshootingList.innerHTML = '';
    if (data.troubleshooting && Array.isArray(data.troubleshooting)) {
      data.troubleshooting.forEach(tip => {
        const li = document.createElement('li');
        li.textContent = tip;
        troubleshootingList.appendChild(li);
      });
    }
    
    loadingSection.classList.add('hidden');
    errorSection.classList.remove('hidden');
  }
  
  // Helper functions
  function hideAllSections() {
    loadingSection.classList.add('hidden');
    resultsSection.classList.add('hidden');
    errorSection.classList.add('hidden');
  }
  
  function formatAddress(address) {
    if (!address || address.length < 10) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }
  
  function formatUSD(num) {
    if (typeof num !== 'number' || isNaN(num)) return '(unknown)';
    if (num === 0) return "$0.00";
    if (num < 0.01) return "$<0.01";
    if (num < 1) return "$" + num.toFixed(2);
    if (num < 1000) return "$" + num.toFixed(2);
    if (num < 1000000) return "$" + (num/1000).toFixed(1) + "K";
    return "$" + (num/1000000).toFixed(1) + "M";
  }
  
  function formatNumber(num) {
    if (num === 0) return "0";
    if (num < 0.000001) return num.toExponential(6);
    return num.toFixed(6).replace(/\.?0+$/, "");
  }
  
  // Check if user is connected with an EVM wallet
  function isConnectedWithEVMWallet() {
    return window.ethereum !== undefined || window.walletConnectProvider !== undefined;
  }
  
// Find your mintNFTBadge function and fix the error at line 1092
// Replace your current mintNFTBadge function with this updated version

async function mintNFTBadge() {
  const mintStatus = document.getElementById('nft-mint-status');
  const contractAddress = "0x51922A02fE28b9ca20608D3DBEf92894ADA3027C";
  const mintNFTBtn = document.getElementById('mint-nft-btn');
  
  if (!mintStatus) return;
  
  try {
    mintStatus.textContent = 'Initializing minting...';
    mintStatus.className = 'nft-status pending';
    
    // Check for MetaMask
    if (!window.ethereum) {
      throw new Error('MetaMask not detected. Please install MetaMask to mint.');
    }
    
    // Request accounts
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    const address = accounts[0];
    
    // Switch to Base Sepolia
    mintStatus.textContent = 'Switching to Base Sepolia network...';
    
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x14a34' }] // Base Sepolia (84532 in hex)
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0x14a34',
            chainName: 'Base Sepolia Testnet',
            nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
            rpcUrls: ['https://sepolia.base.org'],
            blockExplorerUrls: ['https://sepolia-explorer.base.org']
          }]
        });
      } else {
        throw switchError;
      }
    }
    
    // Verify eligibility
    mintStatus.textContent = 'Verifying eligibility...';
    
    const verifyResponse = await fetch('/api/verify-eligibility', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address })
    });
    
    const eligibilityData = await verifyResponse.json();
    if (!eligibilityData.eligible) {
      mintStatus.textContent = `Not eligible: You have ${eligibilityData.transactionCount || 0} transactions, need 4+`;
      mintStatus.className = 'nft-status error';
      return;
    }
    
    // Attempt to mint
    mintStatus.textContent = 'Preparing to mint your NFT...';
    
    // Try different ABIs and mint approaches to handle various contract configurations
    
    // Basic ERC721 functions
    const baseAbi = [
      {
        "inputs": [{"internalType": "address", "name": "owner", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
      }
    ];
    
    // Create Web3 instance
    const web3 = new Web3(window.ethereum);
    
    // Create base contract instance first to check balance
    const baseContract = new web3.eth.Contract(baseAbi, contractAddress);
    
    // Check if already minted
    mintStatus.textContent = 'Checking current NFT balance...';
    const balance = await baseContract.methods.balanceOf(address).call();
    if (parseInt(balance) > 0) {
      mintStatus.textContent = 'You have already minted your Relay Badge!';
      mintStatus.className = 'nft-status error';
      return;
    }
    
    // Now attempt to mint using ThirdWeb Drop contract interface
    const dropAbi = [
      {
        "inputs": [
          {"internalType": "uint256", "name": "_quantity", "type": "uint256"}
        ],
        "name": "claim",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
      }
    ];
    
    // Create drop contract instance
    const dropContract = new web3.eth.Contract(dropAbi, contractAddress);
    
    // Calculate the payment amount (0.0002 ETH in wei)
    const paymentAmount = web3.utils.toWei('0.0002', 'ether');
    
    mintStatus.textContent = 'Preparing to claim your NFT... Please confirm in your wallet';
    
    try {
      // Use more gas than necessary to ensure it goes through
      const gasLimit = 250000; // Fixed gas limit instead of estimation which can fail
      
      console.log(`Attempting to mint with ${web3.utils.fromWei(paymentAmount, 'ether')} ETH payment`);
      
      const tx = await dropContract.methods.claim(1).send({
        from: address,
        gas: gasLimit,
        value: paymentAmount
      });
      
      // Success! We managed to mint
      mintStatus.textContent = 'Success! Your Relay Badge has been minted!';
      mintStatus.className = 'nft-status success';
      
      // Add transaction links
      const linksContainer = document.createElement('div');
      linksContainer.style.marginTop = '10px';
      
      const txLink = document.createElement('a');
      txLink.href = `https://sepolia-explorer.base.org/tx/${tx.transactionHash}`;
      txLink.target = '_blank';
      txLink.textContent = 'View Transaction';
      txLink.className = 'tx-link';
      txLink.style.marginRight = '10px';
      
      const openSeaLink = document.createElement('a');
      openSeaLink.href = `https://testnets.opensea.io/assets/base-sepolia/${contractAddress}`;
      openSeaLink.target = '_blank';
      openSeaLink.textContent = 'View on OpenSea';
      openSeaLink.className = 'tx-link';
      
      linksContainer.appendChild(txLink);
      linksContainer.appendChild(openSeaLink);
      mintStatus.appendChild(linksContainer);
      
      // Disable mint button
      if (mintNFTBtn) {
        mintNFTBtn.disabled = true;
        mintNFTBtn.textContent = 'Badge Minted ✓';
        mintNFTBtn.style.opacity = '0.6';
      }
      
    } catch (mintError) {
      console.error('Mint attempt error:', mintError);
      
      // Contract rejected the transaction - check for common issues
      mintStatus.textContent = 'Minting failed';
      mintStatus.className = 'nft-status error';
      
      // Create container for minting info
      const infoContainer = document.createElement('div');
      infoContainer.style.marginTop = '15px';
      
      // Add different potential reasons for the failure
      const errorInfo = document.createElement('div');
      errorInfo.innerHTML = `<p><strong>The contract rejected the mint. This could be due to:</strong></p>
                            <ul style="margin-top: 10px; margin-bottom: 15px; padding-left: 20px;">
                              <li>Incorrect payment amount (try exactly 0.0002 ETH)</li>
                              <li>Contract owner needs to add your address to an allowlist</li>
                              <li>Your wallet needs to have enough ETH for gas + mint price</li>
                              <li>The contract may have other special requirements</li>
                            </ul>`;
      errorInfo.style.backgroundColor = '#fff3f3';
      errorInfo.style.padding = '12px';
      errorInfo.style.borderRadius = '6px';
      errorInfo.style.border = '1px solid #ffcccc';
      errorInfo.style.marginBottom = '15px';
      infoContainer.appendChild(errorInfo);
      
      // Add explorer link
      const explorerLink = document.createElement('a');
      explorerLink.href = `https://sepolia-explorer.base.org/address/${contractAddress}`;
      explorerLink.target = '_blank';
      explorerLink.textContent = 'View Contract';
      explorerLink.className = 'tx-link';
      explorerLink.style.marginRight = '10px';
      infoContainer.appendChild(explorerLink);
      
      // Add get ETH button
      const ethButton = document.createElement('a');
      ethButton.href = 'https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet';
      ethButton.target = '_blank';
      ethButton.textContent = 'Get Test ETH';
      ethButton.className = 'tx-link';
      ethButton.style.marginRight = '10px';
      infoContainer.appendChild(ethButton);
      
      // Add contact link
      const contactLink = document.createElement('a');
      contactLink.href = 'https://twitter.com/love_4_crypto';
      contactLink.target = '_blank';
      contactLink.textContent = 'Contact Developer';
      contactLink.className = 'tx-link';
      infoContainer.appendChild(contactLink);
      
      // Add try again button
      const tryAgainBtn = document.createElement('button');
      tryAgainBtn.textContent = 'Try Again';
      tryAgainBtn.className = 'tx-link';
      tryAgainBtn.style.display = 'block';
      tryAgainBtn.style.marginTop = '15px';
      tryAgainBtn.style.padding = '8px 15px';
      tryAgainBtn.style.cursor = 'pointer';
      tryAgainBtn.onclick = () => mintNFTBadge(); // Call the mint function again
      infoContainer.appendChild(tryAgainBtn);
      
      mintStatus.appendChild(infoContainer);
    }
    
  } catch (error) {
    console.error('NFT Minting Error:', error);
    
    let errorMessage = 'Failed to mint NFT. Please try again.';
    
    if (error.message && error.message.includes('insufficient funds')) {
      errorMessage = 'Insufficient ETH for gas and mint price. Get testnet ETH from Base faucet.';
    } else if (error.code === 4001 || (error.message && error.message.includes('user rejected'))) {
      errorMessage = 'Transaction cancelled by user.';
    } else if (error.message && error.message.includes('already minted')) {
      errorMessage = 'You have already minted your Relay Badge!';
    }
    
    mintStatus.textContent = errorMessage;
    mintStatus.className = 'nft-status error';
    
    // Add helpful links
    const helpContainer = document.createElement('div');
    helpContainer.style.marginTop = '15px';
    
    const contractLink = document.createElement('a');
    contractLink.href = `https://sepolia-explorer.base.org/address/${contractAddress}`;
    contractLink.target = '_blank';
    contractLink.textContent = 'View NFT Contract';
    contractLink.className = 'tx-link';
    contractLink.style.display = 'block';
    helpContainer.appendChild(contractLink);
    
    // Add faucet link for insufficient funds
    if (error.message && error.message.includes('insufficient funds')) {
      const faucetLink = document.createElement('a');
      faucetLink.href = 'https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet';
      faucetLink.target = '_blank';
      faucetLink.textContent = 'Get testnet ETH';
      faucetLink.className = 'tx-link';
      faucetLink.style.display = 'block';
      faucetLink.style.marginTop = '5px';
      helpContainer.appendChild(faucetLink);
    }
    
    mintStatus.appendChild(helpContainer);
    
    // Add try again button
    const tryAgainBtn = document.createElement('button');
    tryAgainBtn.textContent = 'Try Again';
    tryAgainBtn.className = 'tx-link';
    tryAgainBtn.style.display = 'block';
    tryAgainBtn.style.marginTop = '15px';
    tryAgainBtn.style.padding = '8px 15px';
    tryAgainBtn.onclick = () => mintNFTBadge(); // Call the mint function again
    helpContainer.appendChild(tryAgainBtn);
  }
}
});