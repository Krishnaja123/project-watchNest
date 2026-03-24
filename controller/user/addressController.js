const User = require("../../models/userModel");
const Address = require("../../models/addressModel");
const { getSessionMessage } = require("../../utils/sessionHelper");
const { indiaStates } = require("../../utils/states");
const { validateAddress } = require("../../utils/validationHelper");
const { createAddress } = require("../../services/addressService");


const getAddress = async (req, res) => {
    try {
        const { message, type } = getSessionMessage(req);
        const userId = req.user._id;
        const from = req.query.from || "";

        if(!userId) {
            req.session.message = "User is not logged in. Please login";
            req.session.type = "error";
            return res.redirect('/login');
        }

        const user = await User.findById(userId);
        const userAddresses = await Address.find({ user_id: userId }).sort({ is_default: -1 });

        return res.render("user/address", {
            user,
            addresses: userAddresses,
            states: indiaStates,
            message,
            type,
            from
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
};

const saveAddress = async (req, res) => {
    try {

        const userId = req.user._id;
        const user = await User.findById(userId);

        if (!user || user.userStatus === "Blocked") {
            req.session.message = "User is not authorized to access. Please contact admin";
            req.session.type = "error";
            return res.redirect("/home");
        }

        const error = validateAddress(req.body);
        console.log("Validation Error:", error);

        if (error) {
            req.session.message = error;
            req.session.type = "error";
            return res.redirect("/address");
        }

        await createAddress(userId, req.body);

        if (req.body.address_id) {
            req.session.message = "Address updated successfully";
            req.session.type = "success";
        } else {
            req.session.message = "Address saved successfully";
                        req.session.type = "success";

        }

        let { from } = req.body;

        if (from === "checkout") {
            return res.redirect("/checkout");
        } else if (from === "") {
            return res.redirect("/address");
        }

    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
};

const deleteAddress = async (req, res) => {
    try {

        const address = await Address.findOne({
            _id: req.params.id,
            user_id: req.user._id
        });

        if (!address) {
            return res.json({
                success: false,
                message: "Address not found"
            });
        }

        const wasDefault = address.is_default;

        const addressId = req.params.id;
        const userId = req.user._id;

        const result = await Address.deleteOne({
            _id: addressId,
            user_id: userId
        });

        if (result.deletedCount === 0) {
            return res.json({
                success: false,
                message: "Failed to delete address"
            })
        }

        if (wasDefault) {
            const anotherAddress = await Address.findOne({ user_id: userId });

            if (anotherAddress) {
                anotherAddress.is_default = true;
                await anotherAddress.save();
            }
        }

        return res.json({
            success: true,
            message: "Address deleted successfully"
        })

    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
};

const setDefault = async (req, res) => {
    try {
        const userId = req.user._id;
        const addressId = req.params.id;

        await Address.updateMany(
            { user_id: userId },
            { $set: { is_default: false } }
        );

        await Address.findByIdAndUpdate(addressId, {
            $set: { is_default: true }
        });

        res.json({ success: true });

    } catch (error) {
        res.json({ success: false });
    }
};

module.exports = {
    getAddress,
    saveAddress,
    deleteAddress,
    setDefault
}