const mongoose = require("mongoose");

const brandSchema = new mongoose.Schema({
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
    // created_at: { 
    //     type: Date, 
    //     default: Date.now 
    // },
    // updated_at: {
    //     type: Date,
    //     default: Date.now
    // }
}, { timestamps: true  });

const Brand = mongoose.model("Brand", brandSchema);
module.exports = Brand;