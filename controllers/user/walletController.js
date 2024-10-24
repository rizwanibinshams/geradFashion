const Wallet = require('../../models/walletSchema');

// Add money to the wallet (e.g., refund from canceled order)
const addMoneyToWallet = async (req, res) => {
    try {
      const { userId, amount } = req.body;
      
      if (!userId || !amount) {
        return res.status(400).json({ message: 'UserId and amount are required' });
      }
  
      // Find the user's wallet or create one if it doesn't exist
      let wallet = await Wallet.findOne({ userId });
      if (!wallet) {
        wallet = new Wallet({ userId, balance: 0 });
      }
      
      // Add the specified amount to the wallet
      await wallet.addMoney(amount, 'Money added to wallet');
      
      res.status(200).json({ message: 'Money added to wallet successfully', balance: wallet.balance });
    } catch (error) {
      console.error('Error adding money to wallet:', error);
      res.status(500).json({ message: 'Error adding money to wallet', error: error.message });
    }
  };
// View wallet balance
const getWalletBalance = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Find the user's wallet
    const wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found' });
    }
    
    res.status(200).json({ balance: wallet.balance });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching wallet balance', error: error.message });
  }
};

// Deduct money from the wallet
const deductMoneyFromWallet = async (req, res) => {
  try {
    const { userId, amount } = req.body;

    // Find the user's wallet
    const wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found' });
    }
    
    // Deduct the specified amount from the wallet
    await wallet.deductMoney(amount, 'Payment made');
    
    res.status(200).json({ message: 'Money deducted from wallet', balance: wallet.balance });
  } catch (error) {
    res.status(500).json({ message: 'Error deducting money from wallet', error: error.message });
  }
};

module.exports = {
  addMoneyToWallet,
  getWalletBalance,
  deductMoneyFromWallet
};
