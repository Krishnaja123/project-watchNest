const mongoose = require("mongoose");

const offerSchema = new mongoose.Schema({
    name: String,

    type: {
        type: String,
        enum: ["product", "category", "referral"],
        required: true
    },

    discountType: {
        type: String,
        enum: ["percentage", "fixed"],
        default: "percentage"
    },

    discountValue: {
        type: Number,
        required: true
    },

    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product"
    },

    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category"
    },

    startDate: Date,
    endDate: Date,

    isActive: {
        type: Boolean,
        default: true
    }

}, { timestamps: true });

module.exports = mongoose.model("Offer", offerSchema);