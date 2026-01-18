const mongoose = require("mongoose");
const imageSchema = new mongoose.Schema({
   images: [{
        type: String,
        required: true,
    }], 
});

const Images = mongoose.model("Image", imageSchema);
module.exports = Images;