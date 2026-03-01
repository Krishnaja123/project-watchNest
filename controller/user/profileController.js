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

        console.log("user: ", user);

        const addresses = await Address.find({ user_id: userId });

        res.render("user/profile", {
            user,
            message,
            type,
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


const getChangeUserName = async (req, res) => {
    try {
        let message = req.session.message || "";
        req.session.message = "";
        let type = req.session.type || "";
        req.session.type = "";

        const userId = req.session.user.id;
        const user = await User.findById(userId);

        res.render("user/changeName", {
            user,
            message,
            type,
            title: "Change User Name",
            hideNavBar: true,
        })


    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");

    }
}
const changeUserName = async (req, res) => {
    try {
        let message = req.session.message || "";
        req.session.message = "";
        let type = req.session.type || "";
        req.session.type = "";

        const newName = req.body.name;
        const userId = req.session.user.id;

        const user = await User.findById(userId);

        if (!user) {
            req.session.message = "User not found";
            req.session.type = "error";
            return res.redirect("/profile");
        }

        if (!newName || newName.length < 4) {
            req.session.message = 'Nmae must be at least 4 characters';
            req.session.type = "error";
            return res.redirect("/profile");
        }

        user.username = newName;
        await user.save();

        res.redirect("/profile");

    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
}

const getChangeEmail = async (req, res) => {
    try {
        let message = req.session.message || "";
        req.session.message = "";
        let type = req.session.type || "";
        req.session.type = "";

        const userId = req.session.user.id;
        const user = await User.findById(userId);

        res.render("user/changeEmail", {
            user,
            message,
            type,
            title: "Change User Name",
            hideNavBar: true,
        })


    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");

    }
}

const changeEmail = async (req, res) => {
    try {
        let message = req.session.message || "";
        req.session.message = "";
        let type = req.session.type || "";
        req.session.type = "";

        const newEmail = req.body.email;
        const userId = req.session.user.id;
        console.log(newEmail);


        const user = await User.findById(userId);

        if (!user) {
            req.session.message = "User not found";
            req.session.type = "error";
            return res.redirect("/profile");
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newEmail)) {            
            req.session.message = 'Please enter a valid email address';
            req.session.type = "error";
            return res.redirect("user/changeEmail");
        }
        user.email = newEmail;
        await user.save();

        res.redirect("/profile");

    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
}
module.exports = {
    loadProfile,
    getEditProfile,
    getChangeUserName,
    changeUserName,
    getChangeEmail,
    changeEmail,

}
