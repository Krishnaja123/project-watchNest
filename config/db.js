const mongoose = require("mongoose");
require("dotenv").config();

const dbConnect = async ()=>{
    try {
        await mongoose.connect(process.env.MONGODB_URL);
        console.log("db connected");
        
    } catch (error) {
        console.error("Connection Failed", error);
        
    }
}

module.exports = dbConnect;