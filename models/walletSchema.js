const mongoose = require('mongoose');

// Define the wallet schema
const walletSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',  // Reference to the User model
    required: true,
    unique: true
  },
  balance: {
    type: Number,
    required: true,
    default: 0,
    min: [0, 'Balance cannot be negative']
  },
  transactionHistory: [
    {
      amount: {
        type: Number,
        required: true
      },
      description: {
        type: String,
        default: ''
      },
      date: {
        type: Date,
        default: Date.now
      }
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware to update the 'updatedAt' field before saving
walletSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Method to add money to the wallet
walletSchema.methods.addMoney = async function (amount, description = 'Money added to wallet') {
  this.balance += amount;
  this.transactionHistory.push({ amount, description });
  await this.save();
};

// Method to deduct money from the wallet
walletSchema.methods.deductMoney = async function (amount, description = 'Money deducted from wallet') {
  if (this.balance < amount) {
    throw new Error('Insufficient balance');
  }
  this.balance -= amount;
  this.transactionHistory.push({ amount: -amount, description });
  await this.save();
};

const Wallet = mongoose.model('Wallet', walletSchema);
module.exports = Wallet;
