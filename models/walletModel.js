const mongoose = require("mongoose");
const { required } = require("zod/mini");

const walletSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    balance: {
        type: Number,
        default: 0
    },
}, 
{ timestamps: true});

module.exports = mongoose.model("wallet", walletSchema);