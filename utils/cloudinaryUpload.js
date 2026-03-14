const cloudinary = require("../config/cloudinary");

function uploadToCloudinary(buffer, folder = "products") {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder },
            (err, result) => {
                if (err) reject(err);
                else resolve(result.secure_url);
            }
        );
        stream.end(buffer);
    });
}

module.exports = uploadToCloudinary;