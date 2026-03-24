const User = require("../../models/userModel");
const Address = require("../../models/addressModel");
const bcrypt = require('bcryptjs');
const nodemailer = require("nodemailer");
const cloudinary = require("../../config/cloudinary");

const uploadToCloudinary = require("../../utils/cloudinaryUpload");
const { getSessionMessage } = require("../../utils/sessionHelper");

require("dotenv").config();

const loadProfile = async (req, res) => {
    try {
        console.log("req.session: ", req.session);

        const { message, type } = getSessionMessage(req);

        const userId = req.user._id;
        const user = await User.findById(userId);

        console.log("user: ", user);

        const addresses = await Address.find({ user_id: userId, is_default: true });
        console.log("address");

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
        const { message, type } = getSessionMessage(req);

        const userId = req.user._id;
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
        const { message, type } = getSessionMessage(req);

        const userId = req.user._id;
        const user = await User.findById(userId);

        res.render("user/changeName", {
            user,
            message,
            type,
        })

    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");

    }
}
const changeUserName = async (req, res) => {
    try {
        const newName = req.body.name;
        const userId = req.user._id;

        const user = await User.findById(userId);

        if (!user) {
            req.session.message = "User not found. Please login";
            req.session.type = "error";
            return res.redirect("/login");
        }

        if (!newName || newName.length < 4) {
            req.session.message = 'Nmae must be at least 4 characters';
            req.session.type = "error";
            return res.redirect("/profile");
        }

        user.username = newName;
        await user.save();

        req.session.message = 'Username has successfully changed';
        req.session.type = "success";

        res.redirect("/profile");

    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
}

const getChangeEmail = async (req, res) => {
    try {
        const { message, type } = getSessionMessage(req);

        const userId = req.user._id;
        const user = await User.findById(userId);

        res.render("user/changeEmail", {
            user,
            message,
            type,
        })


    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");

    }
}

const changeEmail = async (req, res) => {
    try {
        const email = req.body.email;
        console.log(email);

        const userId = req.user._id;

        const user = await User.findById(userId);

        if (!user) {
            req.session.message = "User not found";
            req.session.type = "error";
            return res.redirect("/profile");
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            req.session.message = 'Please enter a valid email address';
            req.session.type = "error";
            return res.redirect("/profile/change-email");
        }

        const existingUser = await User.findOne({ email: email });
        if (existingUser) {
            req.session.message = "Email already in use";
            req.session.type = "error";
            return res.redirect("/profile/change-email");
        }

        const otp = generateOtp();
        const sent = await sentVerificationMail(email, otp);

        if (sent) {
            console.log(`OTP sent to ${email}: ${otp}`);
            req.session.userOtp = otp;
            req.session.otpType = "change-email";
            req.session.email = email;
            req.session.otpExpiry = Date.now() + 45 * 1000
            req.session.message = "OTP sent to your registered email";
            req.session.type = "success";
            req.session.canResend = false;
            req.session.remainingTime = 45;
            res.redirect("/verify-otp");
        } else {
            req.session.message = "Failed to send OTP. Try again.";
            req.session.type = "error";
            return res.redirect("/profile/change-email");
        }
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
}

const getChangePasswordPage = async (req, res) => {
    try {
        const { message, type } = getSessionMessage(req);
        const userId = req.user._id;

        if (!userId) {
            req.session.message = "User is not logged in. Please login";
            req.session.type = "error";
            return res.redirect('/login');
        }

        const user = await User.findById(userId);
        console.log(user);
        res.render("user/changePassword", {
            message,
            type,
            email: req.user.email
        });

    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
}

const changePassword = async (req, res) => {
    try {

        const userId = req.user._id;
        const { currentPassword, newPassword, confirmPassword } = req.body;

        if (!currentPassword || !newPassword || !confirmPassword) {
            req.session.message = "Please enter all required fields";
            req.session.type = "error";
            return res.redirect("/profile/change-password");
        }

        const user = await User.findById(userId).select("+password_hash");
        if (!user) {
            req.session.message = "User not found, Please login";
            req.session.type = "error";
            return res.redirect("/login");
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            req.session.message = 'Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&).';
            req.session.type = "error";
            return res.redirect("/profile/change-password");
        }

        if (newPassword !== confirmPassword) {
            req.session.message = 'Passwords do not match';
            req.session.type = "error";
            return res.redirect("/profile/change-password");
        }

        console.log("BODY:", req.body);
        console.log("currentPassword:", currentPassword);
        console.log("hash:", user.password_hash);

        const isMatch = await bcrypt.compare(currentPassword, user.password_hash);

        if (!isMatch) {
            req.session.message = "Entered current password is Invalid";
            req.session.type = "error";
            return res.redirect("/profile/change-password");
        }


        const otp = generateOtp();

        const emailSent = await sentVerificationMail(user.email, otp);

        if (!emailSent) {
            req.session.message = "Failed to send OTP. Please try again.";
            req.session.type = "error";
            return res.redirect("/profile/change-password");
        }

        req.session.userOtp = otp;
        req.session.otpType = "change-password";
        req.session.newPassword = newPassword;
        req.session.otpExpiry = Date.now() + 45 * 1000
        req.session.message = "OTP sent to your registered email";
        req.session.type = "success";
        req.session.canResend = false;
        req.session.remainingTime = 45;
        res.redirect("/verify-otp");
        console.log(`OTP sent ${otp}`);

    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
}

const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

const sentVerificationMail = async (email, otp) => {
    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD
            }
        });
        const info = await transporter.sendMail({
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "Veify your account",
            text: `Your OTP is ${otp}`,
            html: `<b>Your OTP: ${otp}</b>`
        });
        return info.accepted.length > 0;
    } catch (error) {
        console.error(`Error sending email, ${error}`);
        return false;
    }
}

const updateProfileImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.redirect("/profile");
        }

        const imageUrl = await uploadToCloudinary(req.file.buffer, "profile_pictures");
        await User.findByIdAndUpdate(req.user._id, {
            profileImage: imageUrl
        });

        res.redirect("/profile");

    } catch (error) {
        console.log(error);
        res.redirect("/profile");
    }
}




module.exports = {
    loadProfile,
    getEditProfile,
    getChangeUserName,
    changeUserName,
    getChangeEmail,
    changeEmail,
    getChangePasswordPage,
    changePassword,
    updateProfileImage

}
