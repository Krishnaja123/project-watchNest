const Wallet = require("../models/walletModel");
const WalletTransaction = require("../models/walletTransactionModel");

const creditWallet = async (userId, amount, reason) => {
    
   const wallet = await Wallet.findOne({user_id: userId});
   
   if(!wallet) {
    return;
   }

   wallet.balance += amount;
   await wallet.save();

   await WalletTransaction.create({
    user_id: userId,
    amount,
    type: "credit",
    reason
   });
};

const debitWallet = async(userId, amount, reason) => {
    const wallet = await Wallet.findOne({ user_id: userId });

    if(!wallet) {
        return;
    }

    if(wallet.balance < amount) {
        throw new Error("Insufficient wallet balance");
    }

    wallet.balance -= amount;
    await wallet.save();

    await WalletTransaction.create({
        user_id: userId,
        amount,
        type: "debit",
        reason
    });
};

module.exports = { 
    creditWallet,
    debitWallet
}