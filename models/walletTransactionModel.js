const mongoose = require("mongoose");

const walletTransactionSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    amount: Number,
    type: {
       type: String,
       enum: ["credit", "debit"]
    },
    reason: String,
    order_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order"
    }
}, { timeStamps: true});

module.exports = mongoose.model("WalletTransaction", walletTransactionSchema);