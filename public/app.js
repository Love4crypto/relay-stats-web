document.addEventListener('DOMContentLoaded', () => {
  // Existing DOM Elements
  const connectMetaMaskBtn = document.getElementById('connect-metamask');
  const connectWalletConnectBtn = document.getElementById('connect-walletconnect');
  const connectCoinbaseBtn = document.getElementById('connect-coinbase');
  const connectPhantomBtn = document.getElementById('connect-phantom');
  const connectSolflareBtn = document.getElementById('connect-solflare');
  const connectBackpackBtn = document.getElementById('connect-backpack');
  const connectKeplrBtn = document.getElementById('connect-keplr');
  const connectLeapBtn = document.getElementById('connect-leap');
  
  const connectWalletBtn = document.getElementById('connect-wallet-btn');
  const walletModal = document.getElementById('wallet-modal');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const walletModalOverlay = document.querySelector('.wallet-modal-overlay');
  
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
  
  // Results elements
  const firstDate = document.getElementById('first-date');
  const txCount = document.getElementById('tx-count');
  const chainsCount = document.getElementById('chains-count');
  const tokensCount = document.getElementById('tokens-count');
  const totalValueDisplay = document.getElementById('total-value-display');
  const tokensTableBody = document.getElementById('tokens-tbody');

  // NEW: Leaderboard DOM elements
  const leaderboardTabs = document.querySelectorAll('.tab-btn');
  const leaderboardContent = document.getElementById('leaderboard-content');
  const leaderboardLoading = document.getElementById('leaderboard-loading');
  const leaderboardTable = document.getElementById('leaderboard-table');
  const leaderboardBody = document.getElementById('leaderboard-body');
  const leaderboardError = document.getElementById('leaderboard-error');
  const userRankCard = document.getElementById('user-rank-card');
  const optInBtn = document.getElementById('opt-in-btn');
  const optInModal = document.getElementById('opt-in-modal');
  const optInYes = document.getElementById('opt-in-yes');
  const optInNo = document.getElementById('opt-in-no');
  const modalClose = document.querySelector('.modal-close');
  
  // Ensure disconnect button is hidden initially
  disconnectBtn.classList.add('hidden');
  
  // Store current connected address globally
  let currentConnectedAddress = null;
  let currentLeaderboardType = 'transactions';
  let connectedWalletType = null; // Track which wallet type is connected
  
  // NEW: Signature verification functions
// Replace the signMessageWithWallet function (around line 65) with this improved version:

async function signMessageWithWallet(message, address) {
  try {
    if (address.startsWith('0x')) {
      // Ethereum signature
      if (typeof window.ethereum !== 'undefined') {
        const signature = await window.ethereum.request({
          method: 'personal_sign',
          params: [message, address]
        });
        return signature;
      } else {
        throw new Error('Ethereum wallet (MetaMask) not available');
      }
    } else {
      // Solana signature - enhanced handling with better error checking
      console.log('Attempting Solana signature for address:', address);
      
      const messageUint8 = new TextEncoder().encode(message);
      
      // Try Phantom wallet
      if (window.solana && window.solana.isPhantom) {
        console.log('Using Phantom wallet for signing');
        try {
          const result = await window.solana.signMessage(messageUint8, 'utf8');
          console.log('Phantom signMessage result:', result);
          
          // Handle different Phantom response formats
          if (result && result.signature) {
            if (result.signature instanceof Uint8Array) {
              return arrayToBase58(result.signature);
            } else if (Array.isArray(result.signature)) {
              return arrayToBase58(new Uint8Array(result.signature));
            } else {
              console.error('Unexpected Phantom signature format:', typeof result.signature);
              throw new Error('Unexpected signature format from Phantom');
            }
          } else {
            console.error('No signature in Phantom response:', result);
            throw new Error('No signature returned from Phantom');
          }
        } catch (phantomError) {
          console.error('Phantom signing error:', phantomError);
          throw new Error(`Phantom signing failed: ${phantomError.message}`);
        }
      }
      
      // Try Solflare wallet
      else if (window.solflare && window.solflare.isConnected) {
        console.log('Using Solflare wallet for signing');
        try {
          const result = await window.solflare.signMessage(messageUint8, 'utf8');
          console.log('Solflare signMessage result:', result);
          
          if (result && result.signature) {
            if (result.signature instanceof Uint8Array) {
              return arrayToBase58(result.signature);
            } else if (Array.isArray(result.signature)) {
              return arrayToBase58(new Uint8Array(result.signature));
            } else {
              throw new Error('Unexpected signature format from Solflare');
            }
          } else {
            throw new Error('No signature returned from Solflare');
          }
        } catch (solflareError) {
          console.error('Solflare signing error:', solflareError);
          throw new Error(`Solflare signing failed: ${solflareError.message}`);
        }
      }
      
      // Try Backpack wallet  
      else if (window.backpack && window.backpack.isBackpack) {
        console.log('Using Backpack wallet for signing');
        try {
          const result = await window.backpack.signMessage(messageUint8, 'utf8');
          console.log('Backpack signMessage result:', result);
          
          if (result && result.signature) {
            if (result.signature instanceof Uint8Array) {
              return arrayToBase58(result.signature);
            } else if (Array.isArray(result.signature)) {
              return arrayToBase58(new Uint8Array(result.signature));
            } else {
              throw new Error('Unexpected signature format from Backpack');
            }
          } else {
            throw new Error('No signature returned from Backpack');
          }
        } catch (backpackError) {
          console.error('Backpack signing error:', backpackError);
          throw new Error(`Backpack signing failed: ${backpackError.message}`);
        }
      }
      
      // If no Solana wallet is available
      else {
        throw new Error('No Solana wallet available for signing. Please connect Phantom, Solflare, or Backpack wallet.');
      }
    }
  } catch (error) {
    console.error('Signing error:', error);
    throw error;
  }
}

// Improved base58 encoding function
function arrayToBase58(uint8Array) {
  try {
    console.log('Converting to base58, input type:', typeof uint8Array, 'length:', uint8Array?.length);
    
    // Ensure we have a proper Uint8Array
    if (!uint8Array) {
      throw new Error('No data to encode');
    }
    
    if (!(uint8Array instanceof Uint8Array)) {
      if (Array.isArray(uint8Array)) {
        uint8Array = new Uint8Array(uint8Array);
      } else {
        throw new Error('Invalid data type for base58 encoding');
      }
    }
    
    // Use bs58 library if available (recommended)
    if (typeof bs58 !== 'undefined' && bs58.encode) {
      console.log('Using bs58 library for encoding');
      return bs58.encode(uint8Array);
    }
    
    // Fallback: manual base58 encoding
    console.log('Using manual base58 encoding');
    const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let result = '';
    
    // Handle leading zeros
    let leadingZeros = 0;
    for (let i = 0; i < uint8Array.length && uint8Array[i] === 0; i++) {
      leadingZeros++;
    }
    
    // Convert to big integer
    let num = BigInt(0);
    for (let i = 0; i < uint8Array.length; i++) {
      num = num * BigInt(256) + BigInt(uint8Array[i]);
    }
    
    // Convert to base58
    while (num > 0) {
      result = alphabet[Number(num % BigInt(58))] + result;
      num = num / BigInt(58);
    }
    
    // Add leading '1's for leading zeros
    result = '1'.repeat(leadingZeros) + result;
    
    console.log('Base58 encoding result length:', result.length);
    return result;
    
  } catch (error) {
    console.error('Base58 encoding error:', error);
    
    // Final fallback: base64 encoding with warning
    console.warn('Falling back to base64 encoding due to base58 error');
    try {
      return btoa(String.fromCharCode.apply(null, uint8Array));
    } catch (base64Error) {
      console.error('Base64 encoding also failed:', base64Error);
      throw new Error('Failed to encode signature data');
    }
  }
}

  // Get current wallet address
  function getCurrentWalletAddress() {
    return currentConnectedAddress || null;
  }

  // Updated opt-in function with signature verification
  async function handleOptIn() {
    try {
      const currentAddress = getCurrentWalletAddress();
      
      if (!currentAddress) {
        showMessage('Please connect your wallet first to join the leaderboard.', 'error');
        return;
      }

      // Show loading
      optInBtn.disabled = true;
      optInBtn.textContent = '🔐 Preparing signature...';

      // Get signature message from server
      const messageResponse = await fetch('/api/leaderboard/get-signature-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          address: currentAddress, 
          action: 'join' 
        })
      });

      const messageData = await messageResponse.json();
      
      if (!messageData.success) {
        throw new Error(messageData.error);
      }

      optInBtn.textContent = '✍️ Please sign the message...';

      // Sign the message
      const signature = await signMessageWithWallet(messageData.message, currentAddress);

      optInBtn.textContent = '🚀 Joining leaderboard...';

      // Submit to server with signature
      const response = await fetch('/api/leaderboard/update-opt-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: currentAddress,
          optIn: true,
          signature: signature,
          message: messageData.message,
          timestamp: messageData.timestamp
        })
      });

      const result = await response.json();
      
      if (result.success) {
        showMessage(result.message, 'success');
        
        // Refresh leaderboard and user rank
        await loadLeaderboard(currentLeaderboardType);
        await loadUserRank(currentAddress);
        
        optInBtn.textContent = '✅ Joined Leaderboard';
        optInBtn.disabled = true;
        
        // Add opt-out button
        addOptOutButton(currentAddress);
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      console.error('Opt-in error:', error);
      showMessage(`Failed to join leaderboard: ${error.message}`, 'error');
      
      optInBtn.disabled = false;
      optInBtn.textContent = '🏆 Join Leaderboard';
    }
  }

  // Add opt-out functionality
  async function handleOptOut(address) {
    try {
      // Show confirmation modal first
      if (!confirm('Are you sure you want to leave the leaderboard? You can rejoin anytime.')) {
        return;
      }

      const optOutBtn = document.getElementById('opt-out-btn');
      if (optOutBtn) {
        optOutBtn.disabled = true;
        optOutBtn.textContent = '🔐 Preparing signature...';
      }

      // Get signature message for opt-out
      const messageResponse = await fetch('/api/leaderboard/get-signature-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          address: address, 
          action: 'leave' 
        })
      });

      const messageData = await messageResponse.json();
      
      if (!messageData.success) {
        throw new Error(messageData.error);
      }

      if (optOutBtn) optOutBtn.textContent = '✍️ Please sign...';

      // Sign the message
      const signature = await signMessageWithWallet(messageData.message, address);

      if (optOutBtn) optOutBtn.textContent = '🚀 Leaving...';

      // Submit opt-out request
      const response = await fetch('/api/leaderboard/update-opt-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: address,
          optIn: false,
          signature: signature,
          message: messageData.message,
          timestamp: messageData.timestamp
        })
      });

      const result = await response.json();
      
      if (result.success) {
        showMessage(result.message, 'success');
        
        // Refresh leaderboard and user rank
        await loadLeaderboard(currentLeaderboardType);
        await loadUserRank(address);
        
        // Show join button again
        optInBtn.textContent = '🏆 Join Leaderboard';
        optInBtn.disabled = false;
        
        // Remove opt-out button
        removeOptOutButton();
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      console.error('Opt-out error:', error);
      showMessage(`Failed to leave leaderboard: ${error.message}`, 'error');
      
      const optOutBtn = document.getElementById('opt-out-btn');
      if (optOutBtn) {
        optOutBtn.disabled = false;
        optOutBtn.textContent = '❌ Leave Leaderboard';
      }
    }
  }

  // Helper functions for opt-out button
  function addOptOutButton(address) {
    const existingBtn = document.getElementById('opt-out-btn');
    if (existingBtn) return;

    const optOutBtn = document.createElement('button');
    optOutBtn.id = 'opt-out-btn';
    optOutBtn.className = 'btn-secondary';
    optOutBtn.textContent = '❌ Leave Leaderboard';
    optOutBtn.style.marginTop = '10px';
    optOutBtn.style.width = '100%';
    optOutBtn.onclick = () => handleOptOut(address);
    
    optInBtn.parentNode.appendChild(optOutBtn);
  }

  function removeOptOutButton() {
    const optOutBtn = document.getElementById('opt-out-btn');
    if (optOutBtn) {
      optOutBtn.remove();
    }
  }

  // Update the displayUserRank function to show opt-out button for opted-in users
  function displayUserRank(data) {
    const ranks = data.ranks;
    const userStats = data.userStats;

    document.getElementById('user-rank-transactions').textContent = 
      ranks.transactions ? `#${ranks.transactions}` : 'Not ranked';
    document.getElementById('user-rank-volume').textContent = 
      ranks.volume ? `#${ranks.volume}` : 'Not ranked';
    document.getElementById('user-rank-chains').textContent = 
      ranks.chains ? `#${ranks.chains}` : 'Not ranked';
    document.getElementById('user-rank-tokens').textContent = 
      ranks.tokens ? `#${ranks.tokens}` : 'Not ranked';

    // Update opt-in button based on user status
    const currentAddress = getCurrentWalletAddress();
    const addressMatches = currentAddress && userStats && 
      currentAddress.toLowerCase() === userStats.address.toLowerCase();

    if (userStats && userStats.opt_in_leaderboard === 1) {
      if (addressMatches) {
        // User is opted in and it's their own address
        optInBtn.textContent = '✅ Joined Leaderboard';
        optInBtn.disabled = true;
        addOptOutButton(currentAddress);
      } else {
        // User is opted in but not connected to this wallet
        optInBtn.textContent = '✅ On Leaderboard';
        optInBtn.disabled = true;
        removeOptOutButton();
      }
    } else {
      // User is not opted in
      if (addressMatches) {
        // User can opt in with their connected wallet
        optInBtn.textContent = '🏆 Join Leaderboard';
        optInBtn.disabled = false;
        removeOptOutButton();
      } else {
        // Not their wallet - show generic message
        optInBtn.textContent = '🔐 Connect wallet to join';
        optInBtn.disabled = true;
        removeOptOutButton();
      }
    }
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
  
  // Update the refresh button event listener
  if (refreshAnalysisBtn) {
    refreshAnalysisBtn.addEventListener('click', () => {
      const address = currentConnectedAddress || addressInput.value.trim();
      
      if (address) {
        analyzeAddress(address, true); // Force refresh = true
      } else {
        alert('No address to refresh. Please connect wallet or enter an address.');
      }
    });
  }

  // NEW: Leaderboard Event Listeners
  
  // Leaderboard tab switching
  leaderboardTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Update active tab
      leaderboardTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // Load new leaderboard type
      currentLeaderboardType = tab.dataset.type;
      loadLeaderboard(currentLeaderboardType);
    });
  });

  // Updated opt-in button event listener
  optInBtn.addEventListener('click', () => {
    const currentAddress = getCurrentWalletAddress();
    const manualAddress = addressInput.value.trim();
    
    if (currentAddress) {
      // User has connected wallet - proceed with secure opt-in
      handleOptIn();
    } else if (manualAddress) {
      // User entered address manually but no wallet connected
      showMessage('Please connect your wallet to join the leaderboard. Manual addresses cannot be verified.', 'error');
    } else {
      // No address available
      showMessage('Please connect your wallet or analyze an address first.', 'error');
    }
  });

  // Modal controls - Remove old opt-in modal since we use signature flow
  if (optInYes) {
    optInYes.addEventListener('click', () => {
      optInModal.classList.add('hidden');
      handleOptIn();
    });
  }

  if (optInNo) {
    optInNo.addEventListener('click', () => {
      optInModal.classList.add('hidden');
    });
  }

  if (modalClose) {
    modalClose.addEventListener('click', () => {
      optInModal.classList.add('hidden');
    });
  }

  // Close modal on outside click
  if (optInModal) {
    optInModal.addEventListener('click', (e) => {
      if (e.target === optInModal) {
        optInModal.classList.add('hidden');
      }
    });
  }
  
  // Functions to show/hide wallet modal
  function showWalletModal() {
    walletModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
  
  function hideWalletModal() {
    walletModal.classList.add('hidden');
    document.body.style.overflow = '';
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
      if (typeof WalletConnectProvider === 'undefined') {
        console.error("WalletConnect provider not found");
        alert("WalletConnect library not loaded. Please refresh the page and try again.");
        return;
      }

      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      console.log("Device detection:", isMobile ? "Mobile" : "Desktop");
      
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
      
      console.log("Creating WalletConnect provider...");
      const provider = new WalletConnectProvider.default(providerOptions);
      
      console.log("Enabling WalletConnect provider...");
      await provider.enable();
      window.walletConnectProvider = provider;
      
      console.log("Creating Web3 instance...");
      const web3 = new Web3(provider);
      
      console.log("Getting accounts...");
      const accounts = await web3.eth.getAccounts();
      const address = accounts[0];
      
      console.log("Connected with address:", address);
      updateWalletStatus(address, 'WalletConnect');
      analyzeAddress(address);
      
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
      if (window.ethereum && window.ethereum._state && window.ethereum._state.isConnected) {
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
        console.log('Disconnected from Keplr');
      }
      else if (window.leap) {
        console.log('Disconnected from Leap');
      }
      
      resetConnectionUI();
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
    }
  }
  
function resetConnectionUI() {
  walletStatus.textContent = 'Not connected';
  walletStatus.classList.remove('connected');
  disconnectBtn.classList.add('hidden');
  connectWalletBtn.classList.remove('hidden');
  addressInput.value = '';
  currentConnectedAddress = null;
  connectedWalletType = null; // Add this line
  hideAllSections();
  
  if (refreshAnalysisBtn) {
    refreshAnalysisBtn.classList.add('hidden');
  }

  // Hide user rank card and remove opt-out button
  userRankCard.classList.add('hidden');
  removeOptOutButton();
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
        installLink = 'https://relay.link/bridge';
    }
    
    alert(`${walletName.charAt(0).toUpperCase() + walletName.slice(1)} wallet is not installed. Please visit ${installLink} to install it.`);
  }
  
function updateWalletStatus(address, walletName) {
  walletStatus.textContent = `Connected to ${walletName}: ${formatAddress(address)}`;
  walletStatus.classList.add('connected');
  addressInput.value = address;
  disconnectBtn.classList.remove('hidden');
  connectWalletBtn.classList.add('hidden');
  currentConnectedAddress = address;
  
  // Track wallet type for signing
  connectedWalletType = walletName.toLowerCase();
  
  hideWalletModal();
  
  if (refreshAnalysisBtn) {
    refreshAnalysisBtn.classList.remove('hidden');
  }
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
    
    const loadingText = document.querySelector('#loading p');
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
          forceRefresh: forceRefresh
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        displayResults(data);
        
        // Load user rank after successful analysis
        if (data.summary.transactionCount > 0) {
          await loadUserRank(address);
        }
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
    firstDate.textContent = data.summary.firstDate;
    txCount.textContent = data.summary.transactionCount;
    chainsCount.textContent = data.summary.uniqueChains;
    tokensCount.textContent = data.summary.uniqueTokens;
    
    totalValueDisplay.textContent = formatUSD(data.summary.totalUSDValue);

    if (refreshAnalysisBtn) {
      refreshAnalysisBtn.classList.remove('hidden');
    }
    
    // Clear previous tokens table
    tokensTableBody.innerHTML = '';
    
    // Sort tokens by USD value (if available)
    const sortedTokens = [...data.tokens].sort((a, b) => {
      if (a.usdValue && b.usdValue) return b.usdValue - a.usdValue;
      if (a.usdValue) return -1;
      if (b.usdValue) return 1;
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

  // NEW: Leaderboard Functions

  async function loadLeaderboard(type = 'transactions') {
    try {
      leaderboardLoading.classList.remove('hidden');
      leaderboardTable.classList.add('hidden');
      leaderboardError.classList.add('hidden');

      const response = await fetch(`/api/leaderboard/${type}?limit=50`);
      const data = await response.json();

      if (data.success) {
        displayLeaderboard(data.leaderboard, type);
        leaderboardTable.classList.remove('hidden');
      } else {
        throw new Error(data.error || 'Failed to load leaderboard');
      }
    } catch (err) {
      console.error('Leaderboard error:', err);
      leaderboardError.textContent = `Failed to load leaderboard: ${err.message}`;
      leaderboardError.classList.remove('hidden');
    } finally {
      leaderboardLoading.classList.add('hidden');
    }
  }

  function displayLeaderboard(data, type) {
    leaderboardBody.innerHTML = '';

    if (!data || data.length === 0) {
      leaderboardBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 2rem;">
            No leaderboard data available yet. Be the first to join! 🚀
          </td>
        </tr>
      `;
      return;
    }

    data.forEach((user, index) => {
      const row = document.createElement('tr');
      const rankClass = index < 3 ? `rank-${index + 1}` : 'rank-other';
      
      row.innerHTML = `
        <td>
          <span class="rank-badge ${rankClass}">
            ${user.rank}
          </span>
        </td>
        <td>
          <span class="address-short">
            ${user.address.substring(0, 6)}...${user.address.substring(user.address.length - 4)}
          </span>
        </td>
        <td><strong>${user.transaction_count}</strong></td>
        <td><strong>${formatUSD(user.total_usd_value)}</strong></td>
        <td><strong>${user.unique_chains}</strong></td>
        <td><strong>${user.unique_tokens}</strong></td>
      `;

      // Highlight current user
      const currentAddress = getCurrentWalletAddress() || addressInput.value.trim();
      if (currentAddress && user.address.toLowerCase() === currentAddress.toLowerCase()) {
        row.style.background = 'rgba(255, 215, 0, 0.2)';
        row.style.border = '2px solid rgba(255, 215, 0, 0.5)';
      }

      leaderboardBody.appendChild(row);
    });
  }

  async function loadUserRank(address) {
    try {
      const response = await fetch(`/api/user-rank/${address}`);
      const data = await response.json();

      if (data.success) {
        displayUserRank(data);
        userRankCard.classList.remove('hidden');
      } else {
        // Even if user is not in leaderboard, show the rank card
        console.log('User not found in leaderboard, but showing rank card for opt-in');
        userRankCard.classList.remove('hidden');
        
        // Set default values
        document.getElementById('user-rank-transactions').textContent = 'Not ranked';
        document.getElementById('user-rank-volume').textContent = 'Not ranked';
        document.getElementById('user-rank-chains').textContent = 'Not ranked';
        document.getElementById('user-rank-tokens').textContent = 'Not ranked';
        
        // Update button based on wallet connection
        const currentAddress = getCurrentWalletAddress();
        const addressMatches = currentAddress && 
          currentAddress.toLowerCase() === address.toLowerCase();

        if (addressMatches) {
          optInBtn.textContent = '🏆 Join Leaderboard';
          optInBtn.disabled = false;
        } else {
          optInBtn.textContent = '🔐 Connect wallet to join';
          optInBtn.disabled = true;
        }
        
        removeOptOutButton();
      }
    } catch (err) {
      console.error('User rank error:', err);
      // Still show the rank card for opt-in
      userRankCard.classList.remove('hidden');
      
      // Set default values
      document.getElementById('user-rank-transactions').textContent = 'Not ranked';
      document.getElementById('user-rank-volume').textContent = 'Not ranked';
      document.getElementById('user-rank-chains').textContent = 'Not ranked';
      document.getElementById('user-rank-tokens').textContent = 'Not ranked';
      
      // Update button
      const currentAddress = getCurrentWalletAddress();
      if (currentAddress) {
        optInBtn.textContent = '🏆 Join Leaderboard';
        optInBtn.disabled = false;
      } else {
        optInBtn.textContent = '🔐 Connect wallet to join';
        optInBtn.disabled = true;
      }
      
      removeOptOutButton();
    }
  }
  
  // Helper functions
  function hideAllSections() {
    loadingSection.classList.add('hidden');
    resultsSection.classList.add('hidden');
    errorSection.classList.add('hidden');
    
    if (refreshAnalysisBtn) {
      refreshAnalysisBtn.classList.add('hidden');
    }
    
    // Remove any existing cache indicators
    const existingIndicator = document.querySelector('.cache-indicator');
    if (existingIndicator) {
      existingIndicator.remove();
    }

    // Hide user rank card when clearing results
    userRankCard.classList.add('hidden');
    removeOptOutButton();
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

  function showMessage(message, type = 'info') {
    // Enhanced message display
    const messageDiv = document.createElement('div');
    messageDiv.className = `message-toast ${type}`;
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 8px;
      color: white;
      font-weight: 500;
      z-index: 10000;
      max-width: 300px;
      background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#6c757d'};
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    
    document.body.appendChild(messageDiv);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.parentNode.removeChild(messageDiv);
      }
    }, 4000);
  }
  function debugWalletAvailability() {
  console.log('=== WALLET DEBUG INFO ===');
  console.log('window.solana:', !!window.solana);
  console.log('window.solana.isPhantom:', window.solana?.isPhantom);
  console.log('window.solflare:', !!window.solflare);
  console.log('window.solflare.isConnected:', window.solflare?.isConnected);
  console.log('window.backpack:', !!window.backpack);
  console.log('window.backpack.isBackpack:', window.backpack?.isBackpack);
  console.log('connectedWalletType:', connectedWalletType);
  console.log('currentConnectedAddress:', currentConnectedAddress);
  console.log('bs58 available:', typeof bs58 !== 'undefined');
  console.log('========================');
}

  // Initialize leaderboard on page load
  loadLeaderboard('transactions');
});