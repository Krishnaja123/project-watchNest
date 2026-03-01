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
    enum: ["Pending", "Paid", "Failed", "Refunded"],
    default: "Pending"
  },

  status: {
    type: String,
    enum: ["Placed", "Cancelled", "Shipped", "Delivered", "Returned"],
    default: "Placed"
  }

}, { timestamps: true });

module.exports = mongoose.model("Order", orderSchema);