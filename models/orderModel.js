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
    fullName: String,
    phone: String,
    street: String,
    city: String,
    state: String,
    pincode: String
  },

  totalAmount: {
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
    default: "Pending"
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
  }

}, { timestamps: true });

module.exports = mongoose.model("Order", orderSchema);