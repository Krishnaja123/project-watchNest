const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  order_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
    required: true
  },

  product_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true
  },

  variant_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },

  productName: {
    type: String,
    required: true
  },

  image: {
    type: String,
    required: true
  },

  price: {
    type: Number,
    required: true
  },

  quantity: {
    type: Number,
    required: true
  },

  subtotal: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: [
      "processing",
      "shipped",
      "delivered",
      "cancelled",
      "returned"
    ],
    default: "processing"
  },

  cancelReason: {
    type: String,
    default: null
  },

  returnRequested: {
    type: Boolean,
    default: false
  },

  returnAccepted: {
    type: Boolean,
    default: false
  },

   returnRejected: {
    type: Boolean,
    default: false
  },

  returnReason: {
    type: String,
    default: null
  }

}, { timestamps: true });

module.exports = mongoose.model("OrderItem", orderItemSchema);