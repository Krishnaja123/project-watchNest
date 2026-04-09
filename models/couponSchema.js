const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema({
    code: { type: String, required: true },

    discountType: { 
        type: String, 
        enum: ["percentage", "fixed"], 
        required: true 
    },

    discountValue: { type: Number, required: true },

    minAmount: { type: Number, default: 0 },
    maxDiscount: { type: Number },

    expiryDate: { type: Date, required: true },

    isActive: { type: Boolean, default: true },

    usageCount: { type: Number, default: 0 },
       
    usageLimit: { type: Number, 
        default: Infinity  // Unlimited usage if not specified
     },

    is_delete: { type: Boolean, default: false}

}, { timestamps: true });

couponSchema.index(
  { code: 1 },
  { unique: true, partialFilterExpression: { is_delete: false } }
);

module.exports = mongoose.model("Coupon", couponSchema);