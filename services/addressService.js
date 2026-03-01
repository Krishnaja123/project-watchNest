const Address = require("../models/addressModel");

const createAddress = async (userId, data) => {
    const { _id, name, locality, city, state, pincode, mobile, alternateNumber } = data;

    const addressData = {
        user_id: userId,
        full_name: name.trim(),
        street: locality.trim(),
        city: city.trim(),
        state: state.trim(),
        postal_code: pincode.trim(),
        mobile: mobile.trim(),
        phone: alternateNumber?.trim()
    };

    if (!_id) {
        const address = new Address(addressData);
        return await address.save();
    }

    else {
        const existingAddress = await Address.findOne({ _id, user_id: userId });

        if (!existingAddress) {
            throw new Error("Unauthorized");
        }

        const updatedAddress = await Address.findByIdAndUpdate(
            { _id, user_id: userId },
            addressData,
            { new: true }
        )

        if (!updatedAddress) {
            throw new Error("Unauthorized");
        }

        return updatedAddress;
    }

};

module.exports = {
    createAddress,
}
