const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: false,
        trim: true,

    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Please fill a valid email address']
    },
    phone_number: {
        type: String,
        trim: true,
        default: "not given",
    },

    password_hash: {
        type: String,
        required: false,
        select: false // Never return password_hash in queries

    },
    is_verified: {
        type: Boolean,
        default: false
    },
    role: {
        type: String,
        enum: ['customer', 'admin'],
        default: 'customer'
    },
    userStatus: {
        type: String,
        enum: ['Active', 'Blocked'],
        default: 'Active',
    },
    googleId: {
        type: String,
        unique: false,
        default: null
    },
    is_deleted: {
        type: Boolean,
        default:false,
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    updated_at: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("User",userSchema);