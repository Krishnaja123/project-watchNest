const mongoose = require("mongoose");
const multer = require("multer");
const Images = require("../../models/imageModel");

const uploadImage = async (req, res) => {
    try {
        const image = req.files;
        await image.save();
        return res.json(true)
    } catch (error) {
        console.error(err);
        res.status(500).json({ message: "Error saving image." });
    }
}

module.exports = {
    uploadImage
}