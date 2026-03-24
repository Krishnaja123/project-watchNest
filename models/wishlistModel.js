const mongoose = require("mongoose");
const { default: products } = require("razorpay/dist/types/products");

const wishlistSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    products: [
        {
            product_id: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Product",
            },
            addedAt: {
                type: Date,
                default: Date.now
            }
        }
    ]
})

module.exports = mongoose.model("Wishlist", wishlistSchema);