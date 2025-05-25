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
  
  // Add new modal element references
  const connectWalletBtn = document.getElementById('connect-wallet-btn');
  const walletModal = document.getElementById('wallet-modal');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const walletModalOverlay = document.querySelector('.wallet-modal-overlay');
  
  // Add refresh button reference
  const refreshAnalysisBtn = document.getElementById('refresh-analysis-btn');
  
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
  
  // Store current connected address globally
  let currentConnectedAddress = null;
  
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
  
  // Event listener for refresh button
  if (refreshAnalysisBtn) {
    refreshAnalysisBtn.addEventListener('click', () => {
      if (currentConnectedAddress) {
        analyzeAddress(currentConnectedAddress, true); // Force refresh = true
      }
    });
  }
  
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
    currentConnectedAddress = null; // Clear stored address
    hideAllSections();
    
    // Hide refresh button when disconnected
    if (refreshAnalysisBtn) {
      refreshAnalysisBtn.classList.add('hidden');
    }
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
    currentConnectedAddress = address; // Store the connected address
    hideWalletModal(); // Close the modal after successful connection
    
    // Show refresh button when wallet is connected
    if (refreshAnalysisBtn) {
      refreshAnalysisBtn.classList.remove('hidden');
    }
  }
  
  // Get current connected address
  function getCurrentConnectedAddress() {
    return currentConnectedAddress;
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
  
  // Make API call to analyze address - WITH FORCE REFRESH SUPPORT
  async function analyzeAddress(address, forceRefresh = false) {
    // Reset and show loading
    hideAllSections();
    loadingSection.classList.remove('hidden');
    
    // Update loading text if force refresh
    const loadingText = document.querySelector('#loading h2');
    if (loadingText) {
      loadingText.textContent = forceRefresh ? 'Fetching fresh data...' : 'Analyzing address...';
    }
    
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          address: address,
          forceRefresh: forceRefresh  // Add force refresh parameter
        })
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
    
    // Add cache indicator if data is from cache
    if (data.metadata && data.metadata.fromCache !== undefined) {
      const cacheIndicator = document.createElement('div');
      cacheIndicator.className = 'cache-indicator';
      cacheIndicator.innerHTML = data.metadata.fromCache 
        ? '📋 Data from cache (use refresh button for latest data)'
        : '🔄 Fresh data fetched';
      cacheIndicator.style.cssText = `
        margin-top: 10px;
        padding: 8px 12px;
        background: ${data.metadata.fromCache ? '#fff3cd' : '#d4edda'};
        border: 1px solid ${data.metadata.fromCache ? '#ffeaa7' : '#c3e6cb'};
        border-radius: 6px;
        font-size: 14px;
        color: ${data.metadata.fromCache ? '#856404' : '#155724'};
      `;
      
      // Insert after the summary section
      const summarySection = document.querySelector('.summary-grid');
      if (summarySection && summarySection.parentNode) {
        summarySection.parentNode.insertBefore(cacheIndicator, summarySection.nextSibling);
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
    
    // Remove any existing cache indicators
    const existingIndicator = document.querySelector('.cache-indicator');
    if (existingIndicator) {
      existingIndicator.remove();
    }
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
});