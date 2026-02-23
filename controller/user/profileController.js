const User = require("../../models/userModel");
const Address = require("../../models/addressModel");
const bcrypt = require('bcryptjs');
const nodemailer = require("nodemailer");
require("dotenv").config();

const loadProfile = async (req, res) => {
    try {
        console.log("req.session: ", req.session);
        let message = req.session.message || "";
        req.session.message = "";
        let type = req.session.type || "";
        req.session.type = "";

        const userId = req.session.user.id;
        const user = await User.findById(userId);

        console.log(user);

        const addresses = await Address.find({ user_id: userId });

        res.render("user/profile", {
            user,
            message,
            type,
            title: "My Profile",
            hideNavBar: true,
            addresses
        })

    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
}

const getEditProfile = async (req, res) => {
    try {
        let message = req.session.message || "";
        req.session.message = "";
        let type = req.session.type || "";
        req.session.type = "";

         const userId = req.session.user.id;
        const user = await User.findById(userId);

        res.render("user/editProfile", {
            user,
            message,
            type,
            title: "My Profile",
            hideNavBar: true,
        })


    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");

    }
}

module.exports = {
    loadProfile,
    getEditProfile,
}
