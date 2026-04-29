const mongoose = require("mongoose");

const offerSchema = new mongoose.Schema({
    name: String,

    offerType: {
        type: String,
        enum: ["product", "category", "referral"],
        required: true
    },

    discountType: {
        type: String,
        default: "percentage"
    },

    discountValue: {
        type: Number,
        required: true
    },

    product_id: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product"
    }],

    category_id: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category"
    }],

    startDate: Date,
    endDate: Date,

    // isActive: {
    //     type: Boolean,
    //     default: true
    // },
    
    is_delete: {
        type: Boolean,
        default: false 
    }

}, { timestamps: true });

module.exports = mongoose.model("Offer", offerSchema);