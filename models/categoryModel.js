const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    descrip: {
        type: String
    },
    view: {
        type: Boolean,
        default: true,

    },
    is_delete: {
        type: Boolean,
        default: false
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    updated_at: {
        type: Date,
        default: Date.now
    }
})

const Category = mongoose.model("Category", categorySchema);
module.exports = Category;