const mongoose = require("mongoose");
const variantSchema = new mongoose.Schema({
    images: [{
        type: String,
        required: true,
    }],
    original_images: [{
        type: String,
        required: true,
    }],

    strap_color: {
        type: String,
        trim: true,
        required: true,
    },
    dial_color: {
        type: String,
        trim: true,
        required: true,
    },
    price: {
        type: mongoose.Schema.Types.Decimal128,
        required: true,
        min: 1,
    },
    offer: {
        type: mongoose.Schema.Types.Decimal128,
        required: true,
        default: 0
    },
    stock: {
        type: Number,
        default: 0,
        min: 0,
    },
    view: {
        type: Boolean,
        default: true,

    },
});

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },

    descrip: {
        type: String
    },

    cat_id: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category"
    }],
    brand_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Brand"
    },

    is_delete: {
        type: Boolean,
        default: false
    },
    reviews_count: {
        type: Number,
        default: 0
    },

    variants: [variantSchema]
}, {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
});



const Products = mongoose.model("Product", productSchema);
module.exports = Products;