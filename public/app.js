document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Relay Stats App loading...');
  
  // ========== PURE JAVASCRIPT BASE58 IMPLEMENTATION ==========
  const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  
  function base58Encode(bytes) {
    if (!bytes || bytes.length === 0) return '';
    
    let num = 0n;
    for (let i = 0; i < bytes.length; i++) {
      num = num * 256n + BigInt(bytes[i]);
    }
    
    let result = '';
    while (num > 0n) {
      result = BASE58_ALPHABET[Number(num % 58n)] + result;
      num = num / 58n;
    }
    
    for (let i = 0; i < bytes.length && bytes[i] === 0; i++) {
      result = '1' + result;
    }
    
    return result;
  }
  
  window.base58Encode = base58Encode;

  // ========== DOM ELEMENTS (matching your actual HTML structure) ==========
  
  // Wallet modal elements (based on your HTML)
  const connectWalletBtn = document.getElementById('connect-wallet-btn');
  const walletModal = document.getElementById('wallet-modal');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const walletModalOverlay = document.querySelector('.wallet-modal-overlay');
  
  // Individual wallet buttons (based on your HTML)
  const connectMetaMaskBtn = document.getElementById('connect-metamask');
  const connectPhantomBtn = document.getElementById('connect-phantom');
  const connectSolflareBtn = document.getElementById('connect-solflare');
  const connectBackpackBtn = document.getElementById('connect-backpack');
  const connectWalletConnectBtn = document.getElementById('connect-walletconnect');
  const connectCoinbaseBtn = document.getElementById('connect-coinbase');
  const connectKeplrBtn = document.getElementById('connect-keplr');
  const connectLeapBtn = document.getElementById('connect-leap');
  
  // Wallet status elements (based on your HTML)
  const walletStatus = document.getElementById('wallet-status');
  const disconnectBtn = document.getElementById('disconnect-btn');
  const refreshAnalysisBtn = document.getElementById('refresh-analysis-btn');
  
  // Analysis elements (based on your HTML)
  const addressInput = document.getElementById('address-input');
  const analyzeBtn = document.getElementById('analyze-btn');
  const loadingDiv = document.getElementById('loading');
  const resultsDiv = document.getElementById('results');
  const errorDiv = document.getElementById('error-message');
  
  // Results display elements (based on your HTML)
  const firstDateEl = document.getElementById('first-date');
  const txCountEl = document.getElementById('tx-count');
  const chainsCountEl = document.getElementById('chains-count');
  const tokensCountEl = document.getElementById('tokens-count');
  const totalValueEl = document.getElementById('total-value-display');
  const tokensTableBody = document.getElementById('tokens-tbody');
  
  // Leaderboard elements (based on your HTML)
  const leaderboardLoading = document.getElementById('leaderboard-loading');
  const leaderboardTable = document.getElementById('leaderboard-table');
  const leaderboardError = document.getElementById('leaderboard-error');
  const leaderboardBody = document.getElementById('leaderboard-body');
  
  // ========== STATE VARIABLES ==========
  
  let currentConnectedAddress = null;
  let connectedWalletType = null;
  let currentLeaderboardType = 'transactions';
  let currentLeaderboardPage = 1;
  let totalLeaderboardPages = 1;
  let leaderboardSearch = '';
  
  // Add this near the top of your app.js file (around line 50):

// ========== IMPROVED STATE MANAGEMENT ==========

let currentUserStats = null;
let leaderboardCache = new Map();
let lastOptInAction = null;

function clearLeaderboardCache() {
  leaderboardCache.clear();
  console.log('🧹 Leaderboard cache cleared');
}

function updateCurrentUserStats(userStats) {
  currentUserStats = userStats;
  console.log('📊 Current user stats updated:', userStats);
}

// ========== IMPROVED LEADERBOARD FUNCTIONS ==========

// Replace your loadLeaderboardWithPagination function with this improved version:
async function loadLeaderboardWithPagination(type = 'transactions', page = 1, search = '') {
  try {
    showLoadingSpinner();
    
    console.log(`📊 Loading ${type} leaderboard, page ${page}, search: ${search}`);
    
    // Clear cache if user just performed an opt-in/out action
    if (lastOptInAction && Date.now() - lastOptInAction < 5000) {
      clearLeaderboardCache();
      lastOptInAction = null;
    }
    
    const cacheKey = `${type}_${page}_${search}`;
    
    // Check cache first (but only if no recent opt-in action)
    if (leaderboardCache.has(cacheKey) && !lastOptInAction) {
      const cached = leaderboardCache.get(cacheKey);
      if (Date.now() - cached.timestamp < 30000) { // 30 second cache
        console.log('Using cached leaderboard data');
        displayLeaderboard(cached.data.leaderboard, type);
        displayPaginationControls(cached.data.pagination, type);
        hideLoadingSpinner();
        return;
      }
    }
    
    const params = new URLSearchParams({
      page: page,
      limit: 50,
      ...(search && { search: search })
    });
    
    const response = await fetch(`/api/leaderboard/${type}?${params}`);
    const data = await response.json();
    
    if (data.success) {
      currentLeaderboardPage = data.pagination.currentPage;
      totalLeaderboardPages = data.pagination.totalPages;
      leaderboardSearch = search;
      
      // Cache the result
      leaderboardCache.set(cacheKey, {
        data: data,
        timestamp: Date.now()
      });
      
      displayLeaderboard(data.leaderboard, type);
      displayPaginationControls(data.pagination, type);
      
      // Update URL without page reload
      const url = new URL(window.location);
      url.searchParams.set('page', page);
      if (search) {
        url.searchParams.set('search', search);
      } else {
        url.searchParams.delete('search');
      }
      window.history.replaceState({}, '', url);
      
    } else {
      showMessage('Failed to load leaderboard: ' + data.error, 'error');
    }
  } catch (error) {
    showMessage('Error loading leaderboard: ' + error.message, 'error');
  } finally {
    hideLoadingSpinner();
  }
}

// Replace your handleOptIn function with this improved version:
async function handleOptIn() {
  try {
    const currentAddress = getCurrentWalletAddress();
    if (!currentAddress) {
      showMessage('Please connect a wallet first', 'error');
      return;
    }

    console.log('🔄 Starting opt-in process...');
    showMessage('Preparing signature request...', 'info');

    const messageData = await getSignatureMessage(currentAddress, 'join');
    showMessage('Please sign the message in your wallet...', 'info');
    
    const signature = await signMessageWithWallet(messageData, currentAddress);
    showMessage('Submitting to leaderboard...', 'info');
    
    const response = await fetch('/api/leaderboard/update-opt-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: currentAddress,
        optIn: true,
        signature: signature,
        message: messageData.message,
        timestamp: messageData.timestamp,
        nonce: messageData.nonce
      })
    });

    const data = await response.json();
    
    if (data.success) {
      showMessage('Successfully joined the leaderboard!', 'success');
      
      // FIXED: Mark opt-in action timestamp and clear cache
      lastOptInAction = Date.now();
      clearLeaderboardCache();
      
      // Update user stats
      updateCurrentUserStats(data.userStats);
      
      // Reload user rank and leaderboard
      await loadUserRank(currentAddress);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      loadLeaderboardWithPagination(currentLeaderboardType, currentLeaderboardPage, leaderboardSearch);
      
    } else {
      showMessage('Failed to join leaderboard: ' + data.error, 'error');
    }
    
  } catch (error) {
    console.error('Opt-in error:', error);
    if (error.message.includes('User rejected')) {
      showMessage('Signature was cancelled by user', 'info');
    } else {
      showMessage('Failed to join leaderboard: ' + error.message, 'error');
    }
  }
}

// Replace your handleOptOut function with this improved version:
async function handleOptOut(address) {
  try {
    if (!confirm('Are you sure you want to leave the leaderboard? You can rejoin anytime.')) {
      return;
    }

    console.log('🔄 Starting opt-out process...');
    showMessage('Preparing signature request...', 'info');

    const messageData = await getSignatureMessage(address, 'leave');
    showMessage('Please sign the message in your wallet...', 'info');
    
    const signature = await signMessageWithWallet(messageData, address);
    showMessage('Submitting to leaderboard...', 'info');
    
    const response = await fetch('/api/leaderboard/update-opt-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: address,
        optIn: false,
        signature: signature,
        message: messageData.message,
        timestamp: messageData.timestamp,
        nonce: messageData.nonce
      })
    });

    const data = await response.json();
    
    if (data.success) {
      showMessage('Successfully left the leaderboard', 'info');
      
      // FIXED: Mark opt-out action timestamp and clear cache
      lastOptInAction = Date.now();
      clearLeaderboardCache();
      
      // Update user stats
      updateCurrentUserStats(data.userStats);
      
      // Reload user rank and leaderboard
      await loadUserRank(address);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      loadLeaderboardWithPagination(currentLeaderboardType, currentLeaderboardPage, leaderboardSearch);
      
    } else {
      showMessage('Failed to leave leaderboard: ' + data.error, 'error');
    }
    
  } catch (error) {
    console.error('Opt-out error:', error);
    if (error.message.includes('User rejected')) {
      showMessage('Signature was cancelled by user', 'info');
    } else {
      showMessage('Failed to leave leaderboard: ' + error.message, 'error');
    }
  }
}

  // ========== INITIALIZATION ==========
  
  initializePage();

  function initializePage() {
    console.log('🔧 Initializing page...');
    setupEventListeners();
    checkExistingConnections();
    loadLeaderboardWithPagination('transactions');
  }

  function setupEventListeners() {
    console.log('🔧 Setting up event listeners...');
    
    // Wallet modal controls
    if (connectWalletBtn) {
      connectWalletBtn.addEventListener('click', openWalletModal);
    }
    if (closeModalBtn) {
      closeModalBtn.addEventListener('click', closeWalletModal);
    }
    if (walletModalOverlay) {
      walletModalOverlay.addEventListener('click', (e) => {
        if (e.target === walletModalOverlay) {
          closeWalletModal();
        }
      });
    }
    
    // Individual wallet connections
    if (connectMetaMaskBtn) connectMetaMaskBtn.addEventListener('click', connectMetaMask);
    if (connectPhantomBtn) connectPhantomBtn.addEventListener('click', connectPhantom);
    if (connectSolflareBtn) connectSolflareBtn.addEventListener('click', connectSolflare);
    if (connectBackpackBtn) connectBackpackBtn.addEventListener('click', connectBackpack);
    if (connectWalletConnectBtn) connectWalletConnectBtn.addEventListener('click', connectWalletConnect);
    if (connectCoinbaseBtn) connectCoinbaseBtn.addEventListener('click', connectCoinbase);
    if (connectKeplrBtn) connectKeplrBtn.addEventListener('click', connectKeplr);
    if (connectLeapBtn) connectLeapBtn.addEventListener('click', connectLeap);
    
    // Disconnect and refresh
    if (disconnectBtn) disconnectBtn.addEventListener('click', disconnectWallet);
    if (refreshAnalysisBtn) refreshAnalysisBtn.addEventListener('click', refreshAnalysis);
    
    // Analysis button
    if (analyzeBtn) analyzeBtn.addEventListener('click', handleAnalyzeClick);
    
    // Address input
    if (addressInput) {
      addressInput.addEventListener('input', handleAddressInput);
      addressInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleAnalyzeClick();
        }
      });
    }

    // Leaderboard tabs
    setupLeaderboardTabs();
  }

  function setupLeaderboardTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        currentLeaderboardType = tab.dataset.type;
        loadLeaderboardWithPagination(currentLeaderboardType, 1, '');
        
        setTimeout(() => addLeaderboardSearch(), 100);
      });
    });
  }

  // ========== WALLET MODAL FUNCTIONS ==========
  
  function openWalletModal() {
    console.log('📱 Opening wallet modal...');
    if (walletModal) {
      walletModal.classList.remove('hidden');
      document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }
  }
  
  function closeWalletModal() {
    console.log('📱 Closing wallet modal...');
    if (walletModal) {
      walletModal.classList.add('hidden');
      document.body.style.overflow = ''; // Restore scrolling
    }
  }

  // ========== WALLET CONNECTION FUNCTIONS ==========
  
  async function connectMetaMask() {
    try {
      console.log('🦊 Connecting MetaMask...');
      
      if (typeof window.ethereum === 'undefined') {
        showMessage('MetaMask not detected. Please install MetaMask extension.', 'error');
        return;
      }

      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      if (accounts.length > 0) {
        currentConnectedAddress = accounts[0];
        connectedWalletType = 'metamask';
        updateWalletUI();
        closeWalletModal();
        showMessage('MetaMask connected successfully!', 'success');
      }
    } catch (error) {
      console.error('MetaMask connection error:', error);
      showMessage('Failed to connect MetaMask: ' + error.message, 'error');
    }
  }

  async function connectPhantom() {
    try {
      console.log('👻 Connecting Phantom...');
      
      if (!window.solana?.isPhantom) {
        showMessage('Phantom wallet not detected. Please install Phantom extension.', 'error');
        return;
      }

      const response = await window.solana.connect();
      currentConnectedAddress = response.publicKey.toString();
      connectedWalletType = 'phantom';
      updateWalletUI();
      closeWalletModal();
      showMessage('Phantom wallet connected successfully!', 'success');
    } catch (error) {
      console.error('Phantom connection error:', error);
      showMessage('Failed to connect Phantom: ' + error.message, 'error');
    }
  }

  async function connectSolflare() {
    try {
      console.log('🔥 Connecting Solflare...');
      
      if (!window.solflare) {
        showMessage('Solflare wallet not detected. Please install Solflare extension.', 'error');
        return;
      }

      await window.solflare.connect();
      currentConnectedAddress = window.solflare.publicKey.toString();
      connectedWalletType = 'solflare';
      updateWalletUI();
      closeWalletModal();
      showMessage('Solflare wallet connected successfully!', 'success');
    } catch (error) {
      console.error('Solflare connection error:', error);
      showMessage('Failed to connect Solflare: ' + error.message, 'error');
    }
  }

// Replace the connectBackpack function (around line 200) with this:

async function connectBackpack() {
  try {
    console.log('🎒 Connecting Backpack...');
    
    if (!window.backpack) {
      showMessage('Backpack wallet not detected. Please install Backpack extension.', 'error');
      return;
    }

    // Backpack connection method
    const response = await window.backpack.connect();
    
    console.log('Backpack connection response:', response);
    
    // Handle different response formats from Backpack
    let publicKey;
    if (response.publicKey) {
      if (typeof response.publicKey === 'string') {
        publicKey = response.publicKey;
      } else if (response.publicKey.toString) {
        publicKey = response.publicKey.toString();
      } else if (response.publicKey.toBase58) {
        publicKey = response.publicKey.toBase58();
      } else {
        throw new Error('Unable to extract public key from Backpack response');
      }
    } else {
      throw new Error('No public key in Backpack connection response');
    }
    
    currentConnectedAddress = publicKey;
    connectedWalletType = 'backpack';
    updateWalletUI();
    closeWalletModal();
    showMessage('Backpack wallet connected successfully!', 'success');
    
  } catch (error) {
    console.error('Backpack connection error:', error);
    showMessage('Failed to connect Backpack: ' + error.message, 'error');
  }
}

  async function connectWalletConnect() {
    showMessage('WalletConnect integration coming soon!', 'info');
    closeWalletModal();
  }

  async function connectCoinbase() {
    showMessage('Coinbase Wallet integration coming soon!', 'info');
    closeWalletModal();
  }

  async function connectKeplr() {
    showMessage('Keplr integration coming soon!', 'info');
    closeWalletModal();
  }

  async function connectLeap() {
    showMessage('Leap integration coming soon!', 'info');
    closeWalletModal();
  }

  function disconnectWallet() {
    currentConnectedAddress = null;
    connectedWalletType = null;
    updateWalletUI();
    showMessage('Wallet disconnected', 'info');
  }

  function updateWalletUI() {
    if (currentConnectedAddress) {
      // Update wallet status
      if (walletStatus) {
        walletStatus.textContent = `Connected: ${currentConnectedAddress.slice(0, 6)}...${currentConnectedAddress.slice(-4)}`;
      }
      
      // Show disconnect button and refresh button
      if (disconnectBtn) disconnectBtn.classList.remove('hidden');
      if (refreshAnalysisBtn) refreshAnalysisBtn.classList.remove('hidden');
      
      // Hide connect button
      if (connectWalletBtn) connectWalletBtn.classList.add('hidden');
      
      // Auto-fill address input
      if (addressInput) {
        addressInput.value = currentConnectedAddress;
      }
    } else {
      // Reset UI to disconnected state
      if (walletStatus) walletStatus.textContent = 'Not connected';
      if (disconnectBtn) disconnectBtn.classList.add('hidden');
      if (refreshAnalysisBtn) refreshAnalysisBtn.classList.add('hidden');
      if (connectWalletBtn) connectWalletBtn.classList.remove('hidden');
      if (addressInput) addressInput.value = '';
    }
  }

// Replace the checkExistingConnections function with this:

function checkExistingConnections() {
  // Check MetaMask
  if (typeof window.ethereum !== 'undefined') {
    window.ethereum.request({ method: 'eth_accounts' })
      .then(accounts => {
        if (accounts.length > 0) {
          currentConnectedAddress = accounts[0];
          connectedWalletType = 'metamask';
          updateWalletUI();
        }
      })
      .catch(console.error);
  }

  // Check Phantom
  if (window.solana?.isConnected) {
    try {
      currentConnectedAddress = window.solana.publicKey.toString();
      connectedWalletType = 'phantom';
      updateWalletUI();
    } catch (error) {
      console.error('Error checking Phantom connection:', error);
    }
  }

  // Check Backpack
  if (window.backpack?.isConnected) {
    try {
      let publicKey;
      if (window.backpack.publicKey) {
        if (typeof window.backpack.publicKey === 'string') {
          publicKey = window.backpack.publicKey;
        } else if (window.backpack.publicKey.toString) {
          publicKey = window.backpack.publicKey.toString();
        } else if (window.backpack.publicKey.toBase58) {
          publicKey = window.backpack.publicKey.toBase58();
        }
        
        if (publicKey) {
          currentConnectedAddress = publicKey;
          connectedWalletType = 'backpack';
          updateWalletUI();
        }
      }
    } catch (error) {
      console.error('Error checking Backpack connection:', error);
    }
  }

  // Check Solflare
  if (window.solflare?.isConnected) {
    try {
      currentConnectedAddress = window.solflare.publicKey.toString();
      connectedWalletType = 'solflare';
      updateWalletUI();
    } catch (error) {
      console.error('Error checking Solflare connection:', error);
    }
  }
}

  // ========== ANALYSIS FUNCTIONS ==========
  
  function handleAddressInput() {
    const address = addressInput.value.trim();
    // Just validate format, don't auto-connect
    if (address.startsWith('0x') && address.length === 42) {
      console.log('Ethereum address detected');
    } else if (address.length >= 32 && address.length <= 44 && !address.startsWith('0x')) {
      console.log('Solana address detected');
    }
  }

  async function handleAnalyzeClick() {
    const address = addressInput.value.trim();
    if (!address) {
      showMessage('Please enter a wallet address', 'error');
      return;
    }
    await analyzeAddress(address, false);
  }

  async function refreshAnalysis() {
    const address = currentConnectedAddress || addressInput.value.trim();
    if (!address) {
      showMessage('No address to refresh', 'error');
      return;
    }
    await analyzeAddress(address, true);
  }

  async function analyzeAddress(address, forceRefresh = false) {
    try {
      console.log(`🔍 Analyzing address: ${address} (force refresh: ${forceRefresh})`);
      
      showLoading();
      hideResults();
      hideError();

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          address: address,
          forceRefresh: forceRefresh 
        })
      });

      const data = await response.json();

      if (data.success) {
        displayResults(data);
        await loadUserRank(address);
      } else {
        showError(data.error || 'Analysis failed', data.troubleshooting);
      }
    } catch (error) {
      console.error('Analysis error:', error);
      showError('Network error occurred. Please try again.');
    } finally {
      hideLoading();
    }
  }

  function displayResults(data) {
    const { summary, tokens } = data;
    
    console.log('📊 Displaying results:', summary);
    
    // Update summary cards (matching your HTML structure)
    if (firstDateEl) firstDateEl.textContent = summary.firstDate || 'N/A';
    if (txCountEl) txCountEl.textContent = (summary.transactionCount || 0).toLocaleString();
    if (chainsCountEl) chainsCountEl.textContent = summary.uniqueChains || 0;
    if (tokensCountEl) tokensCountEl.textContent = summary.uniqueTokens || 0;
    if (totalValueEl) totalValueEl.textContent = '$' + (summary.totalUSDValue || 0).toLocaleString();
    
    // Update tokens table
    if (tokensTableBody && tokens && tokens.length > 0) {
      tokensTableBody.innerHTML = tokens.map(token => `
        <tr>
          <td>
            <div class="token-info">
              <span class="token-symbol">${token.symbol || 'Unknown'}</span>
              <span class="token-name">${token.name || ''}</span>
            </div>
          </td>
          <td>${(token.amount || 0).toFixed(6)}</td>
          <td>${token.price ? '$' + token.price.toFixed(2) : 'N/A'}</td>
          <td>${token.usdValue ? '$' + token.usdValue.toFixed(2) : 'N/A'}</td>
        </tr>
      `).join('');
    } else if (tokensTableBody) {
      tokensTableBody.innerHTML = '<tr><td colspan="4">No tokens found</td></tr>';
    }

    showResults();
    setupLeaderboardActions();
  }

  function setupLeaderboardActions() {
    // Set up join/leave leaderboard buttons
    const joinBtn = document.getElementById('join-leaderboard');
    const leaveBtn = document.getElementById('leave-leaderboard');
    
    if (joinBtn) {
      joinBtn.addEventListener('click', handleOptIn);
    }
    if (leaveBtn) {
      leaveBtn.addEventListener('click', () => handleOptOut(getCurrentWalletAddress()));
    }
  }

  // ========== LEADERBOARD FUNCTIONS ==========
  
  // Replace your loadLeaderboardWithPagination function with this:

async function loadLeaderboardWithPagination(type = 'transactions', page = 1, search = '') {
  try {
    showLoadingSpinner();
    
    console.log(`📊 Loading ${type} leaderboard (no pagination)`);
    
    // Don't use page/pagination parameters anymore
    const params = new URLSearchParams();
    if (search) {
      params.append('search', search);
    }
    
    const response = await fetch(`/api/leaderboard/${type}?${params}`);
    const data = await response.json();
    
    if (data.success) {
      // Don't track pagination anymore
      currentLeaderboardPage = 1;
      totalLeaderboardPages = 1;
      leaderboardSearch = search;
      
      displayLeaderboard(data.leaderboard, type);
      
      // Don't display pagination controls
      // displayPaginationControls(data.pagination, type);
      
      // FIXED: Don't modify URL with page parameters
      if (search) {
        const url = new URL(window.location);
        url.searchParams.set('search', search);
        // Remove any existing page parameter
        url.searchParams.delete('page');
        window.history.replaceState({}, '', url);
      } else {
        // Clean URL - remove all pagination parameters
        const url = new URL(window.location);
        url.searchParams.delete('page');
        url.searchParams.delete('search');
        window.history.replaceState({}, '', url);
      }
      
    } else {
      showMessage('Failed to load leaderboard: ' + data.error, 'error');
    }
  } catch (error) {
    showMessage('Error loading leaderboard: ' + error.message, 'error');
  } finally {
    hideLoadingSpinner();
  }
}

  function displayLeaderboard(users, type) {
    if (!leaderboardBody) {
      console.warn('Leaderboard body element not found');
      return;
    }
    
    if (!users || users.length === 0) {
      leaderboardBody.innerHTML = '<tr><td colspan="6">No users found on the leaderboard.</td></tr>';
      return;
    }

    leaderboardBody.innerHTML = users.map(user => `
      <tr>
        <td class="rank-cell">#${user.rank}</td>
        <td class="address-cell">
          <span class="address-short">${user.address.slice(0, 6)}...${user.address.slice(-4)}</span>
          <button class="copy-btn" onclick="window.copyAddress('${user.address}')" title="Copy address">📋</button>
        </td>
        <td class="number-cell">${(user.transaction_count || 0).toLocaleString()}</td>
        <td class="currency-cell">$${(user.total_usd_value || 0).toLocaleString()}</td>
        <td class="number-cell">${user.unique_chains || 0}</td>
        <td class="number-cell">${user.unique_tokens || 0}</td>
      </tr>
    `).join('');
  }

  function displayPaginationControls(pagination, type) {
    let container = document.getElementById('pagination-controls');
    if (!container) {
      container = createPaginationContainer();
    }
    
    let html = '<div class="pagination-info">';
    html += `<span>Showing ${(pagination.currentPage - 1) * pagination.limit + 1}-${Math.min(pagination.currentPage * pagination.limit, pagination.totalUsers)} of ${pagination.totalUsers} users</span>`;
    html += '</div>';
    
    html += '<div class="pagination-buttons">';
    
    // Previous button
    if (pagination.hasPrevPage) {
      html += `<button onclick="window.loadLeaderboardWithPagination('${type}', ${pagination.prevPage}, '${leaderboardSearch}')" class="btn btn-secondary">← Previous</button>`;
    }
    
    // Page numbers
    const startPage = Math.max(1, pagination.currentPage - 2);
    const endPage = Math.min(pagination.totalPages, pagination.currentPage + 2);
    
    if (startPage > 1) {
      html += `<button onclick="window.loadLeaderboardWithPagination('${type}', 1, '${leaderboardSearch}')" class="btn btn-secondary">1</button>`;
      if (startPage > 2) html += '<span>...</span>';
    }
    
    for (let i = startPage; i <= endPage; i++) {
      const activeClass = i === pagination.currentPage ? 'btn-primary' : 'btn-secondary';
      html += `<button onclick="window.loadLeaderboardWithPagination('${type}', ${i}, '${leaderboardSearch}')" class="btn ${activeClass}">${i}</button>`;
    }
    
    if (endPage < pagination.totalPages) {
      if (endPage < pagination.totalPages - 1) html += '<span>...</span>';
      html += `<button onclick="window.loadLeaderboardWithPagination('${type}', ${pagination.totalPages}, '${leaderboardSearch}')" class="btn btn-secondary">${pagination.totalPages}</button>`;
    }
    
    // Next button
    if (pagination.hasNextPage) {
      html += `<button onclick="window.loadLeaderboardWithPagination('${type}', ${pagination.nextPage}, '${leaderboardSearch}')" class="btn btn-secondary">Next →</button>`;
    }
    
    html += '</div>';
    container.innerHTML = html;
  }

  function createPaginationContainer() {
    const container = document.createElement('div');
    container.id = 'pagination-controls';
    container.className = 'pagination-controls';
    
    const leaderboardSection = document.getElementById('leaderboard-section');
    if (leaderboardSection) {
      leaderboardSection.appendChild(container);
    }
    
    return container;
  }

  function addLeaderboardSearch() {
    if (document.getElementById('leaderboard-search')) {
      return;
    }
    
    const searchHtml = `
      <div class="leaderboard-search">
        <input type="text" id="leaderboard-search" placeholder="Search by address..." />
        <button onclick="window.searchLeaderboard()" class="btn btn-primary">Search</button>
        <button onclick="window.clearLeaderboardSearch()" class="btn btn-secondary">Clear</button>
      </div>
    `;
    
    const leaderboardSection = document.getElementById('leaderboard-section');
    if (leaderboardSection) {
      leaderboardSection.insertAdjacentHTML('afterbegin', searchHtml);
    }
  }

  // ========== USER RANK FUNCTIONS ==========
  
  async function loadUserRank(address) {
    try {
      const response = await fetch(`/api/user-rank/${address}`);
      const data = await response.json();
      
      if (data.success) {
        displayUserRank(data);
        updateLeaderboardButtons(data.userStats);
      }
    } catch (error) {
      console.error('Error loading user rank:', error);
    }
  }

function displayUserRank(data) {
  const { userStats, ranks } = data;
  
  if (!userStats) return;

  // Use existing user-rank-card from HTML
  const userRankCard = document.getElementById('user-rank-card');
  if (userRankCard) {
    // Update the existing card
    document.getElementById('user-rank-transactions').textContent = `#${ranks.transactions || 'N/A'}`;
    document.getElementById('user-rank-volume').textContent = `#${ranks.volume || 'N/A'}`;
    document.getElementById('user-rank-chains').textContent = `#${ranks.chains || 'N/A'}`;
    document.getElementById('user-rank-tokens').textContent = `#${ranks.tokens || 'N/A'}`;
    
    // Show the card
    userRankCard.classList.remove('hidden');
    
    // Update opt-in button
    const optInBtn = document.getElementById('opt-in-btn');
    if (optInBtn) {
      if (userStats.opt_in_leaderboard) {
        optInBtn.textContent = '❌ Leave Leaderboard';
        optInBtn.onclick = () => handleOptOut(userStats.address);
      } else {
        optInBtn.textContent = '🏆 Join Leaderboard';
        optInBtn.onclick = () => handleOptIn();
      }
    }
  }
}

  function updateLeaderboardButtons(userStats) {
    const joinBtn = document.getElementById('join-leaderboard');
    const leaveBtn = document.getElementById('leave-leaderboard');
    
    if (joinBtn && leaveBtn) {
      if (userStats && userStats.opt_in_leaderboard) {
        joinBtn.style.display = 'none';
        leaveBtn.style.display = 'inline-block';
      } else {
        joinBtn.style.display = 'inline-block';
        leaveBtn.style.display = 'none';
      }
    }
  }

  // ========== OPT-IN/OUT FUNCTIONS ==========
  
async function handleOptIn() {
  try {
    const currentAddress = getCurrentWalletAddress();
    if (!currentAddress) {
      showMessage('Please connect a wallet first', 'error');
      return;
    }

    console.log('🔄 Starting opt-in process...');
    showMessage('Preparing signature request...', 'info');

    // Get signature message
    const messageData = await getSignatureMessage(currentAddress, 'join');
    
    showMessage('Please sign the message in your wallet...', 'info');
    
    // Sign the message
    const signature = await signMessageWithWallet(messageData, currentAddress);
    
    showMessage('Submitting to leaderboard...', 'info');
    
    // Submit to server
    const response = await fetch('/api/leaderboard/update-opt-in', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address: currentAddress,
        optIn: true,
        signature: signature,
        message: messageData.message,
        timestamp: messageData.timestamp,
        nonce: messageData.nonce
      })
    });

    const data = await response.json();
    
    if (data.success) {
      showMessage('Successfully joined the leaderboard!', 'success');
      await loadUserRank(currentAddress);
      loadLeaderboardWithPagination(currentLeaderboardType, currentLeaderboardPage, leaderboardSearch);
    } else {
      showMessage('Failed to join leaderboard: ' + data.error, 'error');
    }
    
  } catch (error) {
    console.error('Opt-in error:', error);
    
    if (error.message.includes('User rejected')) {
      showMessage('Signature was cancelled by user', 'info');
    } else {
      showMessage('Failed to join leaderboard: ' + error.message, 'error');
    }
  }
}

async function handleOptOut(address) {
  try {
    if (!confirm('Are you sure you want to leave the leaderboard? You can rejoin anytime.')) {
      return;
    }

    console.log('🔄 Starting opt-out process...');
    showMessage('Preparing signature request...', 'info');

    // Get signature message
    const messageData = await getSignatureMessage(address, 'leave');
    
    showMessage('Please sign the message in your wallet...', 'info');
    
    // Sign the message
    const signature = await signMessageWithWallet(messageData, address);
    
    showMessage('Submitting to leaderboard...', 'info');
    
    // Submit to server
    const response = await fetch('/api/leaderboard/update-opt-in', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address: address,
        optIn: false,
        signature: signature,
        message: messageData.message,
        timestamp: messageData.timestamp,
        nonce: messageData.nonce
      })
    });

    const data = await response.json();
    
    if (data.success) {
      showMessage('Successfully left the leaderboard', 'info');
      await loadUserRank(address);
      loadLeaderboardWithPagination(currentLeaderboardType, currentLeaderboardPage, leaderboardSearch);
    } else {
      showMessage('Failed to leave leaderboard: ' + data.error, 'error');
    }
    
  } catch (error) {
    console.error('Opt-out error:', error);
    
    if (error.message.includes('User rejected')) {
      showMessage('Signature was cancelled by user', 'info');
    } else {
      showMessage('Failed to leave leaderboard: ' + error.message, 'error');
    }
  }
}

  // ========== SIGNATURE FUNCTIONS ==========
  
async function getSignatureMessage(address, action) {
  try {
    console.log(`🔐 Getting signature message for ${action}...`);
    
    const response = await fetch('/api/leaderboard/get-signature-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        address: address, 
        action: action 
      })
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Signature message received');
      return {
        message: data.message,
        timestamp: data.timestamp,
        nonce: data.nonce
      };
    } else {
      throw new Error(data.error || 'Failed to get signature message');
    }
  } catch (error) {
    console.error('Error getting signature message:', error);
    throw error;
  }
}

// Replace the signMessageWithWallet function (around line 600) with this:

async function signMessageWithWallet(messageData, address) {
  try {
    const { message } = messageData;
    console.log('🔐 Signing message with wallet...');
    console.log('Message to sign:', message);
    console.log('Connected wallet type:', connectedWalletType);
    
    if (address.startsWith('0x')) {
      // Ethereum signature with MetaMask
      console.log('🦊 Signing with MetaMask...');
      
      if (typeof window.ethereum === 'undefined') {
        throw new Error('MetaMask not available');
      }

      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, address]
      });
      
      console.log('✅ Ethereum signature completed');
      return signature;
      
    } else {
      // Solana signature
      console.log('🌞 Signing with Solana wallet...');
      
      const messageBytes = new TextEncoder().encode(message);
      console.log('Message bytes length:', messageBytes.length);
      
      let signResult;
      
      // Handle different Solana wallets
      if (connectedWalletType === 'phantom' && window.solana?.isPhantom) {
        console.log('👻 Using Phantom wallet...');
        try {
          signResult = await window.solana.signMessage(messageBytes, 'utf8');
        } catch (error) {
          console.error('Phantom signing error:', error);
          throw new Error(`Phantom signing failed: ${error.message}`);
        }
      } 
      else if (connectedWalletType === 'backpack' && window.backpack) {
        console.log('🎒 Using Backpack wallet...');
        try {
          // Backpack uses a different signing method
          console.log('Backpack signMessage method:', typeof window.backpack.signMessage);
          
          // Try different Backpack signing approaches
          if (window.backpack.signMessage) {
            signResult = await window.backpack.signMessage(messageBytes);
          } else if (window.backpack.sign) {
            signResult = await window.backpack.sign(messageBytes);
          } else {
            throw new Error('Backpack wallet does not support message signing');
          }
          
          console.log('Backpack raw sign result:', signResult);
          
        } catch (error) {
          console.error('Backpack signing error details:', error);
          throw new Error(`Backpack signing failed: ${error.message}`);
        }
      } 
      else if (connectedWalletType === 'solflare' && window.solflare) {
        console.log('🔥 Using Solflare wallet...');
        try {
          signResult = await window.solflare.signMessage(messageBytes, 'utf8');
        } catch (error) {
          console.error('Solflare signing error:', error);
          throw new Error(`Solflare signing failed: ${error.message}`);
        }
      } 
      else {
        throw new Error(`No supported Solana wallet found. Connected type: ${connectedWalletType}`);
      }
      
      console.log('Raw sign result:', signResult);
      console.log('Sign result type:', typeof signResult);
      console.log('Sign result keys:', Object.keys(signResult || {}));
      
      // Process the signature result
      const processedSignature = handleSolanaSignResult(signResult, connectedWalletType);
      console.log('✅ Solana signature completed');
      
      return processedSignature;
    }
  } catch (error) {
    console.error('=== SIGNING ERROR ===');
    console.error('Error details:', error);
    console.error('Wallet type:', connectedWalletType);
    console.error('Address:', address);
    console.error('====================');
    throw error;
  }
}

// Replace the handleSolanaSignResult function (around line 700) with this:

function handleSolanaSignResult(signResult, walletName) {
  console.log(`📝 Processing ${walletName} signature result...`);
  console.log('Result type:', typeof signResult);
  console.log('Result:', signResult);
  console.log('Result keys:', Object.keys(signResult || {}));
  
  try {
    let signature;
    
    // Handle Backpack wallet specifically
    if (walletName === 'backpack') {
      console.log('🎒 Processing Backpack signature...');
      
      // Backpack might return different formats
      if (signResult && signResult.signature) {
        console.log('Format: Backpack signature property');
        signature = signResult.signature;
      } else if (signResult && signResult.data) {
        console.log('Format: Backpack data property');
        signature = signResult.data;
      } else if (signResult instanceof Uint8Array) {
        console.log('Format: Backpack direct Uint8Array');
        signature = signResult;
      } else if (Array.isArray(signResult)) {
        console.log('Format: Backpack direct Array');
        signature = new Uint8Array(signResult);
      } else {
        console.error('Unknown Backpack signature format:', signResult);
        throw new Error('Unknown signature format from Backpack wallet');
      }
    }
    // Handle other wallets
    else if (signResult && signResult.signature) {
      console.log('Format: signature property found');
      signature = signResult.signature;
    } else if (signResult instanceof Uint8Array) {
      console.log('Format: direct Uint8Array');
      signature = signResult;
    } else if (Array.isArray(signResult)) {
      console.log('Format: direct Array');
      signature = new Uint8Array(signResult);
    } else {
      console.error('Unknown signature format:', signResult);
      throw new Error(`Unknown signature format from ${walletName}`);
    }
    
    // Ensure it's a Uint8Array
    if (!(signature instanceof Uint8Array)) {
      if (Array.isArray(signature)) {
        signature = new Uint8Array(signature);
      } else if (typeof signature === 'string') {
        // If it's already base58 encoded, return it
        console.log('Signature appears to be base58 string:', signature.length);
        return signature;
      } else {
        throw new Error(`Cannot convert signature to Uint8Array from ${walletName}`);
      }
    }
    
    console.log('Signature length:', signature.length);
    
    // Encode to base58
    const encoded = window.base58Encode(signature);
    console.log('✅ Base58 encoded signature length:', encoded.length);
    
    return encoded;
    
  } catch (error) {
    console.error(`❌ Error processing ${walletName} signature:`, error);
    throw error;
  }
}

  // ========== SEARCH FUNCTIONS ==========
  
  function searchLeaderboard() {
    const searchInput = document.getElementById('leaderboard-search');
    const search = searchInput ? searchInput.value.trim() : '';
    loadLeaderboardWithPagination(currentLeaderboardType, 1, search);
  }

  function clearLeaderboardSearch() {
    const searchInput = document.getElementById('leaderboard-search');
    if (searchInput) {
      searchInput.value = '';
    }
    loadLeaderboardWithPagination(currentLeaderboardType, 1, '');
  }

  // ========== UTILITY FUNCTIONS ==========
  
  function getCurrentWalletAddress() {
    return currentConnectedAddress;
  }

  function showLoading() {
    if (loadingDiv) loadingDiv.classList.remove('hidden');
  }

  function hideLoading() {
    if (loadingDiv) loadingDiv.classList.add('hidden');
  }

  function showResults() {
    if (resultsDiv) resultsDiv.classList.remove('hidden');
  }

  function hideResults() {
    if (resultsDiv) resultsDiv.classList.add('hidden');
  }

  function showError(message, troubleshooting = []) {
    if (errorDiv) {
      const errorText = document.getElementById('error-text');
      const troubleshootingList = document.getElementById('troubleshooting-list');
      
      if (errorText) errorText.textContent = message;
      
      if (troubleshootingList && troubleshooting.length > 0) {
        troubleshootingList.innerHTML = troubleshooting.map(tip => `<li>${tip}</li>`).join('');
      }
      
      errorDiv.classList.remove('hidden');
    }
  }

  function hideError() {
    if (errorDiv) errorDiv.classList.add('hidden');
  }

  function showLoadingSpinner() {
    if (leaderboardLoading) leaderboardLoading.classList.remove('hidden');
    if (leaderboardTable) leaderboardTable.classList.add('hidden');
  }

  function hideLoadingSpinner() {
    if (leaderboardLoading) leaderboardLoading.classList.add('hidden');
    if (leaderboardTable) leaderboardTable.classList.remove('hidden');
  }

  function showMessage(message, type) {
    let messageContainer = document.getElementById('message-container');
    if (!messageContainer) {
      messageContainer = document.createElement('div');
      messageContainer.id = 'message-container';
      messageContainer.className = 'message-container';
      messageContainer.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1000;
        max-width: 400px;
      `;
      document.body.appendChild(messageContainer);
    }

    const messageElement = document.createElement('div');
    messageElement.className = `message message-${type}`;
    messageElement.style.cssText = `
      padding: 12px 16px;
      margin-bottom: 10px;
      border-radius: 4px;
      font-weight: 500;
      animation: slideIn 0.3s ease-out;
      ${type === 'success' ? 'background: #d4edda; color: #155724; border: 1px solid #c3e6cb;' : ''}
      ${type === 'error' ? 'background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb;' : ''}
      ${type === 'info' ? 'background: #cce7ff; color: #004085; border: 1px solid #99d5ff;' : ''}
    `;
    messageElement.textContent = message;
    messageContainer.appendChild(messageElement);

    setTimeout(() => {
      if (messageElement.parentNode) {
        messageElement.parentNode.removeChild(messageElement);
      }
    }, 5000);
  }

  // ========== GLOBAL FUNCTIONS FOR ONCLICK HANDLERS ==========
  
  window.loadLeaderboardWithPagination = loadLeaderboardWithPagination;
  window.searchLeaderboard = searchLeaderboard;
  window.clearLeaderboardSearch = clearLeaderboardSearch;
  window.copyAddress = function(address) {
    navigator.clipboard.writeText(address).then(() => {
      showMessage('Address copied to clipboard!', 'success');
    }).catch(() => {
      showMessage('Failed to copy address', 'error');
    });
  };

  console.log('✅ Relay Stats App loaded successfully!');
});