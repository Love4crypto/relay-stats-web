// Add this to your app.js file (replace or add to existing wallet modal code)

document.addEventListener('DOMContentLoaded', function() {
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
  connectWalletBtn.addEventListener('click', showWalletModal);
  closeModalBtn.addEventListener('click', hideWalletModal);
  walletModalOverlay.addEventListener('click', hideWalletModal);

  // Close modal with Escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && !walletModal.classList.contains('hidden')) {
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

  // Wallet connection functions (add these if not already in your app.js)
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
      connectBtn.classList.add('hidden');
      disconnectBtn.classList.remove('hidden');
      
      // Auto-analyze connected wallet
      document.getElementById('address-input').value = address;
      analyzeAddress();
    }
  }

  // Disconnect wallet
  document.getElementById('disconnect-btn')?.addEventListener('click', function() {
    const walletStatus = document.getElementById('wallet-status');
    const connectBtn = document.getElementById('connect-wallet-btn');
    const disconnectBtn = document.getElementById('disconnect-btn');

    walletStatus.textContent = 'Not connected';
    connectBtn.classList.remove('hidden');
    disconnectBtn.classList.add('hidden');
    document.getElementById('address-input').value = '';
    clearResults();
  });
});