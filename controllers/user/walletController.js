const Wallet = require('../../models/walletSchema');
const Order = require("../../models/orderSchema")
// Add money to wallet
const addMoneyToWallet = async (req, res) => {
    try {
        const { userId, amount } = req.body;
        
        if (!userId || !amount) {
            return res.status(400).json({ 
                success: false,
                message: 'UserId and amount are required' 
            });
        }

        // Find or create wallet
        let wallet = await Wallet.findOne({ userId });
        if (!wallet) {
            wallet = new Wallet({ 
                userId, 
                balance: 0,
                transactionHistory: []
            });
        }

        // Update wallet balance
        const newBalance = wallet.balance + parseFloat(amount);
        
        // Add transaction to history
        const transaction = {
            type: 'credit',
            amount: parseFloat(amount),
            description: 'Money added to wallet',
            date: new Date(),
            balance: newBalance
        };

        wallet.balance = newBalance;
        wallet.transactionHistory.push(transaction);
        await wallet.save();

        res.status(200).json({
            success: true,
            message: 'Money added successfully',
            balance: newBalance
        });
    } catch (error) {
        console.error('Error adding money to wallet:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding money to wallet',
            error: error.message
        });
    }
};

// Get wallet balance
const getWalletBalance = async (req, res) => {
    try {
        const userId = req.session.user_id || req.session.user?.id;;
        const wallet = await Wallet.findOne({ userId });
        
        if (!wallet) {
            return res.status(404).json({
                success: false,
                message: 'Wallet not found'
            });
        }

        return res.json({
            success: true,
            balance: wallet.balance
        });
    } catch (error) {
        console.error('Error fetching wallet balance:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Process wallet payment
// const processWalletPayment = async (req, res) => {
//     try {
//         const userId = req.session.user_id || req.session.user?.id;;
//         const { amount, orderId } = req.body;

//         // Find wallet and check balance
//         const wallet = await Wallet.findOne({ userId });
        
//         if (!wallet) {
//             return res.status(404).json({
//                 success: false,
//                 message: 'Wallet not found'
//             });
//         }

//         if (wallet.balance < amount) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Insufficient balance'
//             });
//         }

//         // Update balance and add transaction
//         const newBalance = wallet.balance - parseFloat(amount);
//         const transaction = {
//             type: 'debit',
//             amount: parseFloat(amount),
//             description: `Payment for order ${orderId}`,
//             date: new Date(),
//             balance: newBalance
//         };

//         wallet.balance = newBalance;
//         wallet.transactionHistory.push(transaction);
//         await wallet.save();

//         return res.json({
//             success: true,
//             message: 'Payment processed successfully',
//             transactionId: transaction._id,
//             remainingBalance: newBalance
//         });
//     } catch (error) {
//         console.error('Error processing wallet payment:', error);
//         return res.status(400).json({
//             success: false,
//             message: error.message || 'Payment processing failed'
//         });
//     }
// };



const processWalletPayment = async (req, res) => {
    try {
        const userId = req.session.user_id || req.session.user?.id;
        const { amount, orderId, description: customDescription } = req.body;


        if (orderId) {
          const orderExists = await Order.exists({ orderId });
          if (!orderExists) {
              return res.status(404).json({
                  success: false,
                  message: 'Order not found'
              });
          }
      }

        // Find wallet and check balance
        const wallet = await Wallet.findOne({ userId });
        
        if (!wallet) {
            return res.status(404).json({
                success: false,
                message: 'Wallet not found'
            });
        }

        if (wallet.balance < amount) {
            return res.status(400).json({
                success: false,
                message: 'Insufficient balance'
            });
        }

        // Update balance and add transaction
        const newBalance = wallet.balance - parseFloat(amount);
        
        // Create a meaningful description based on available information
        let transactionDescription = customDescription;
        if (!transactionDescription) {
            transactionDescription = orderId 
                ? `Payment for order #${orderId}`
                : `Wallet payment of ₹${parseFloat(amount).toFixed(2)}`;
        }

        const transaction = {
            type: 'debit',
            amount: parseFloat(amount),
            description: transactionDescription,
            date: new Date(),
            balance: newBalance,
            orderId: orderId || null  // Store orderId if available
        };

        wallet.balance = newBalance;
        wallet.transactionHistory.push(transaction);
        await wallet.save();

        return res.json({
            success: true,
            message: 'Payment processed successfully',
            transactionId: transaction._id,
            remainingBalance: newBalance
        });
    } catch (error) {
        console.error('Error processing wallet payment:', error);
        return res.status(400).json({
            success: false,
            message: error.message || 'Payment processing failed'
        });
    }
};

// Get transaction history
const getTransactionHistory = async (req, res) => {
    try {
        const userId = req.session.user_id || req.session.user?.id;
        const wallet = await Wallet.findOne({ userId });
        
        if (!wallet) {
            return res.status(404).json({
                success: false,
                message: 'Wallet not found'
            });
        }

        // Sort transactions by date (newest first)
        const sortedTransactions = wallet.transactionHistory.sort((a, b) => 
            b.date.getTime() - a.date.getTime()
        );

        return res.json({
            success: true,
            transactions: sortedTransactions
        });
    } catch (error) {
        console.error('Error fetching transaction history:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch transaction history'
        });
    }
};

const deductOrderAmount = async (userId, amount, orderId) => {
    try {
        // Find wallet
        const wallet = await Wallet.findOne({ userId });
        
        if (!wallet) {
            throw new Error('Wallet not found');
        }

        // Check if sufficient balance
        if (wallet.balance < amount) {
            throw new Error('Insufficient balance');
        }

        // Calculate new balance
        const newBalance = wallet.balance - parseFloat(amount);
        
        // Create transaction record
        const transaction = {
            type: 'debit',
            amount: parseFloat(amount),
            description: `Payment deducted for order #${orderId}`,
            date: new Date(),
            balance: newBalance,
            orderId: orderId
        };

        // Update wallet
        wallet.balance = newBalance;
        wallet.transactionHistory.push(transaction);
        await wallet.save();

        return {
            success: true,
            deductedAmount: amount,
            remainingBalance: newBalance,
            transactionId: transaction._id
        };

    } catch (error) {
        throw new Error(error.message || 'Failed to deduct amount from wallet');
    }
}


module.exports = {
    addMoneyToWallet,
    getWalletBalance,
    processWalletPayment,
    getTransactionHistory,
    deductOrderAmount
};