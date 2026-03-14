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
    ref: "Variant",
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

    returnReason: {
        type: String,
        default: null
    }

}, { timestamps: true });

module.exports = mongoose.model("OrderItem", orderItemSchema);