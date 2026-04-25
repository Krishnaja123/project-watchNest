const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  orderId: {
    type: String,
    required: true,
    unique: true
  },

  shippingAddress: {
    full_name: String,
    mobile: String,
    street: String,
    city: String,
    state: String,
    postal_code: String
  },

  totalAmount: {
    type: Number,
    required: true
  },

couponCode: {
    type: String,
    default: null
},

couponDiscount: {
    type: Number,
    default: 0
},

originalAmount: {
    type: Number,
    required: true
},

  paymentMethod: {
    type: String,
    required: true
  },

  paymentStatus: {
    type: String,
    enum: ["pending", "paid", "failed", "refunded"],
    default: "pending"
  },

  razorpayOrderId: String,
  
  razorpayPaymentId: String,

  status: {
    type: String,
    enum: [
      "processing",
      "partially_shipped",
      "shipped",
      "partially_delivered",
      "delivered",
      "partially_cancelled",
      "cancelled",
      "partially_returned",
      "returned"
    ],
    default: "processing"
  },

  cancelReason: {
    type: String,
    default: null
  },

  shippingCharge: {
    type: Number,
    default: 50
  },

  taxAmount: {
    type: Number,
  }

}, { timestamps: true });

module.exports = mongoose.model("Order", orderSchema);