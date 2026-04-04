const mongoose = require("mongoose");

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
                required: true
            },
            variant_id: {
                type: mongoose.Schema.Types.ObjectId,
                required: true
            },
            addedAt: {
                type: Date,
                default: Date.now
            }
        }
    ]
})

module.exports = mongoose.model("Wishlist", wishlistSchema);