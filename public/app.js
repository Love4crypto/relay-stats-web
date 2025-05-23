document.addEventListener('DOMContentLoaded', function() {
  // Initialize UI elements
  initializeUI();

  // Wallet modal elements
  const connectWalletBtn = document.getElementById('connect-wallet-btn');
  const walletModal = document.getElementById('wallet-modal');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const walletModalOverlay = document.querySelector('.wallet-modal-overlay');

  // Show wallet modal
  function showWalletModal() {
    walletModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // Prevent background scroll
  }

  // Hide wallet modal
  function hideWalletModal() {
    walletModal.classList.add('hidden');
    document.body.style.overflow = 'auto'; // Restore scroll
  }

  // Event listeners
  connectWalletBtn?.addEventListener('click', showWalletModal);
  closeModalBtn?.addEventListener('click', hideWalletModal);
  walletModalOverlay?.addEventListener('click', hideWalletModal);

  // Close modal with Escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && walletModal && !walletModal.classList.contains('hidden')) {
      hideWalletModal();
    }
  });

  // Wallet connection handlers
  const walletButtons = {
    'connect-metamask': () => connectMetaMask(),
    'connect-walletconnect': () => connectWalletConnect(),
    'connect-coinbase': () => connectCoinbase(),
    'connect-phantom': () => connectPhantom(),
    'connect-solflare': () => connectSolflare(),
    'connect-backpack': () => connectBackpack(),
    'connect-keplr': () => connectKeplr(),
    'connect-leap': () => connectLeap()
  };

  // Add click handlers for all wallet buttons
  Object.keys(walletButtons).forEach(buttonId => {
    const button = document.getElementById(buttonId);
    if (button) {
      button.addEventListener('click', () => {
        walletButtons[buttonId]();
        hideWalletModal();
      });
    }
  });

  // Manual address analysis
  const analyzeBtn = document.getElementById('analyze-btn');
  if (analyzeBtn) {
    analyzeBtn.addEventListener('click', analyzeAddress);
  }

  // Wallet connection functions 
  async function connectMetaMask() {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        updateWalletStatus(accounts[0], 'MetaMask');
        return accounts[0];
      } catch (error) {
        console.error('MetaMask connection failed:', error);
        showError('Failed to connect to MetaMask');
      }
    } else {
      showError('MetaMask not installed');
    }
  }

  async function connectPhantom() {
    if (typeof window.solana !== 'undefined' && window.solana.isPhantom) {
      try {
        const response = await window.solana.connect();
        const address = response.publicKey.toString();
        updateWalletStatus(address, 'Phantom');
        return address;
      } catch (error) {
        console.error('Phantom connection failed:', error);
        showError('Failed to connect to Phantom');
      }
    } else {
      showError('Phantom wallet not installed');
    }
  }

  // Add other wallet connection functions as needed...
  function connectWalletConnect() {
    showError('WalletConnect integration coming soon!');
  }

  function connectCoinbase() {
    showError('Coinbase Wallet integration coming soon!');
  }

  function connectSolflare() {
    showError('Solflare integration coming soon!');
  }

  function connectBackpack() {
    showError('Backpack integration coming soon!');
  }

  function connectKeplr() {
    showError('Keplr integration coming soon!');
  }

  function connectLeap() {
    showError('Leap integration coming soon!');
  }

  // Update wallet status
  function updateWalletStatus(address, walletName) {
    const walletStatus = document.getElementById('wallet-status');
    const connectBtn = document.getElementById('connect-wallet-btn');
    const disconnectBtn = document.getElementById('disconnect-btn');

    if (walletStatus && connectBtn && disconnectBtn) {
      walletStatus.textContent = `${walletName}: ${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
      walletStatus.classList.add('connected');
      connectBtn.classList.add('hidden');
      disconnectBtn.classList.remove('hidden');
      
      // Auto-analyze connected wallet
      const addressInput = document.getElementById('address-input');
      if (addressInput) {
        addressInput.value = address;
        analyzeAddress();
      }
    }
  }

  // Disconnect wallet
  const disconnectBtn = document.getElementById('disconnect-btn');
  if (disconnectBtn) {
    disconnectBtn.addEventListener('click', function() {
      const walletStatus = document.getElementById('wallet-status');
      const connectBtn = document.getElementById('connect-wallet-btn');
      
      if (walletStatus && connectBtn) {
        walletStatus.textContent = 'Not connected';
        walletStatus.classList.remove('connected');
        connectBtn.classList.remove('hidden');
        disconnectBtn.classList.add('hidden');
        
        const addressInput = document.getElementById('address-input');
        if (addressInput) {
          addressInput.value = '';
        }
        clearResults();
      }
    });
  }

  // Show error message
  function showError(message) {
    const errorElem = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');
    
    if (errorElem && errorText) {
      errorText.textContent = message;
      errorElem.classList.remove('hidden');
      
      setTimeout(() => {
        errorElem.classList.add('hidden');
      }, 5000);
    } else {
      alert(message);
    }
  }

  // Analyze address
  function analyzeAddress() {
    const addressInput = document.getElementById('address-input');
    const loadingElem = document.getElementById('loading');
    const resultsElem = document.getElementById('results');
    const errorElem = document.getElementById('error-message');
    
    if (!addressInput || !addressInput.value) {
      showError('Please enter a valid address');
      return;
    }
    
    const address = addressInput.value.trim();
    
    // Hide previous results/errors
    if (resultsElem) resultsElem.classList.add('hidden');
    if (errorElem) errorElem.classList.add('hidden');
    
    // Show loading
    if (loadingElem) {
      loadingElem.classList.remove('hidden');
      
      // Setup cancel button
      const cancelBtn = document.getElementById('cancel-analysis');
      if (cancelBtn) {
        cancelBtn.classList.remove('hidden');
        
        const cancelHandler = function() {
          // Cancel logic here
          loadingElem.classList.add('hidden');
          cancelBtn.removeEventListener('click', cancelHandler);
        };
        
        cancelBtn.addEventListener('click', cancelHandler);
      }
    }
    
    // Call API to analyze address
    fetch(`/api/analyze/${address}`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        if (loadingElem) loadingElem.classList.add('hidden');
        
        if (data.success) {
          displayResults(data);
        } else {
          showError(data.error || 'Failed to analyze address');
        }
      })
      .catch(error => {
        if (loadingElem) loadingElem.classList.add('hidden');
        showError(error.message);
        console.error('Analysis error:', error);
      });
  }

  // Display results
  function displayResults(data) {
    const resultsElem = document.getElementById('results');
    if (!resultsElem) return;
    
    // Update summary metrics
    document.getElementById('tx-count').textContent = data.summary?.transactionCount || '0';
    document.getElementById('first-date').textContent = formatDate(data.summary?.firstTransaction) || '-';
    document.getElementById('chains-count').textContent = data.summary?.uniqueChains || '0';
    document.getElementById('tokens-count').textContent = data.summary?.uniqueTokens || '0';
    document.getElementById('total-value-display').textContent = formatCurrency(data.summary?.totalValueUSD) || '$0.00';
    
    // Fill tokens table
    const tokensBody = document.getElementById('tokens-tbody');
    if (tokensBody) {
      tokensBody.innerHTML = '';
      
      if (data.tokens && data.tokens.length > 0) {
        data.tokens.forEach(token => {
          const row = document.createElement('tr');
          
          row.innerHTML = `
            <td>
              <div class="token-info">
                <span class="token-symbol">${token.symbol}</span>
                <span class="token-name">${token.name}</span>
              </div>
            </td>
            <td>${formatNumber(token.amount)}</td>
            <td>${formatCurrency(token.priceUSD)}</td>
            <td>${formatCurrency(token.valueUSD)}</td>
          `;
          
          tokensBody.appendChild(row);
        });
      } else {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="4" class="no-data">No tokens found</td>';
        tokensBody.appendChild(row);
      }
    }
    
    resultsElem.classList.remove('hidden');
  }

  // Clear results
  function clearResults() {
    const resultsElem = document.getElementById('results');
    if (resultsElem) {
      resultsElem.classList.add('hidden');
    }
  }

  // Format helpers
  function formatDate(timestamp) {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  }
  
  function formatNumber(num) {
    if (!num && num !== 0) return '-';
    return parseFloat(num).toLocaleString(undefined, {
      maximumFractionDigits: 6
    });
  }
  
  function formatCurrency(num) {
    if (!num && num !== 0) return '-';
    return '$' + parseFloat(num).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  // Initialize UI
  function initializeUI() {
    // Check for dark mode preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.body.classList.add('dark-mode');
    }
    
    // Listen for dark mode changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      if (e.matches) {
        document.body.classList.add('dark-mode');
      } else {
        document.body.classList.remove('dark-mode');
      }
    });
    
    // Add input validation for address field
    const addressInput = document.getElementById('address-input');
    if (addressInput) {
      addressInput.addEventListener('input', function() {
        const analyzeBtn = document.getElementById('analyze-btn');
        if (analyzeBtn) {
          analyzeBtn.disabled = !this.value.trim();
        }
      });
    }
  }
});