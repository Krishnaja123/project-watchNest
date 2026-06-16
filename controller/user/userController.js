const User = require("../../models/userModel");
const Wallet = require("../../models/walletModel");
const bcrypt = require('bcryptjs');
const nodemailer = require("nodemailer");
require("dotenv").config();

const { creditWallet } = require("../../services/walletServices");

const STATUS_CODES = require("../../constants/statusCodes");
const MESSAGES = require("../../constants/messages");

const loadRegister = (req, res) => {
    try {
        //console.log(req.session.message);
        let message = req.session.message || "";
        req.session.message = "";
        let type = req.session.type || "";
        req.session.type = "";

        console.log(message);
        res.render("user/signup", {
            message,
            type,
            title: "SignUp",
            hideNavBar: true
        });

    } catch (error) {
        console.error(error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(MESSAGES.SERVER_ERROR);
    }
}

const registerUser = async (req, res) => {
    try {

        const { username, email, password, confirmPassword, referralCode } = req.body;

        console.log(`username: ${username}, password: ${password}`);


        let referrer = null;

        if (referralCode) {
            referrer = await User.findOne({ referralCode });

            if (!referrer) {
                req.session.message = "Invalid referral code",
                    req.session.type = "error";
                return res.redirect("/signup");
            };
            req.session.referrer = referrer;
        }

        if (!username || !email || !password) {
            req.session.message = "Please fill all mandatory fields";
            req.session.type = "error";
            return res.redirect("/signup");
        }

        //username = username.trim();
        if (username.length < 4) {
            req.session.message = 'Username must be at least 4 characters';
            req.session.type = "error";
            return res.redirect("/signup");
        }

        if (username.length > 30) {
            req.session.message = 'Username cannot exceed 30 characters';
            req.session.type = "error";
            return res.redirect("/signup");
        }

        const nameRegex = /^[A-Za-z\s'-]+$/;

        if (!nameRegex.test(username)) {
            req.session.message = "Invalid name format";
            req.session.type = "error";
            return res.redirect("/signup");
        }

        if (/\s{2,}/.test(username)) {
            req.session.message = "Multiple spaces not allowed";
            req.session.type = "error";
            return res.redirect("/signup");
        }


        //email = email.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            req.session.message = 'Please enter a valid email address';
            req.session.type = "error";
            return res.redirect("/signup");
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(password)) {
            req.session.message = 'Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&).';
            req.session.type = "error";
            return res.redirect("/signup");
        }

        if (password !== confirmPassword) {
            req.session.message = 'Passwords do not match';
            req.session.type = "error";
            return res.redirect("/signup");
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            req.session.message = "Email already in use";
            req.session.type = "error";
            return res.redirect("/signup");
        }

        const otp = generateOtp();

        const emailSent = await sentVerificationMail(email, otp);
        if (!emailSent) {
            req.session.message = "Failed to send OTP. Please try again.";
            req.session.type = "error";
            return res.redirect("/signup");
        }

        req.session.userOtp = otp;
        req.session.otpType = "signup";
        req.session.userData = { username, email, password };
        req.session.otpExpiry = Date.now() + 45 * 1000
        req.session.message = "OTP sent to your registered email";
        req.session.type = "success";
        req.session.canResend = false;
        req.session.remainingTime = 45;
        res.redirect("/verify-otp");
        console.log(`OTP sent ${otp}`);
        console.log("req.session.userData:", req.session.userData);

    } catch (error) {
        console.error(error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(MESSAGES.SERVER_ERROR);
    }
}

const checkEmail = async (req, res) => {
    try {
        const { email } = req.body;

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.json({
                exists: true
            });
        }

        return res.json({
            exists: false
        });

    } catch (error) {
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            exists: false
        });
    }
};

const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

const sentVerificationMail = async (email, otp) => {
    console.log("email: ", email);

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

const loadVerifyOtp = async (req, res) => {
    try {
        let message = req.session.message || "";
        let type = req.session.type || "";
        let email = req.session.userData?.email || req.session.email || "";
        let canResend = req.session.canResend ?? false;
        console.log("email: ", email);
        //console.log(message);
        let remainingTime = req.session.remainingTime ?? 0;
        let otp = req.session.userOtp || "";
        req.session.message = "";
        req.session.type = "";

        res.render("user/verifyOtp", {
            otp,
            email,
            canResend,
            remainingTime,
            message,
            type,
        });

    } catch (error) {
        console.error(error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(MESSAGES.SERVER_ERROR);
    }
}

const verifyOtp = async (req, res) => {
    try {
        const { otp } = req.body;
        const savedOtp = req.session.userOtp;
        const userData = req.session.userData;

        console.log(otp, savedOtp, userData);

        //Validate empty OTP
        if (!otp || otp.trim() === "") {
            req.session.message = "Please enter the OTP";
            req.session.type = "error";
            req.session.canResend = false;
            req.session.remainingTime = Math.max(
                Math.floor((req.session.otpExpiry - Date.now()) / 1000),
                0
            );
            return res.redirect("/verify-otp");
        }


        // Validate incomplete OTP
        if (otp.trim().length < 6) {
            req.session.message = "Please enter full OTP",
                req.session.type = "error";
            req.session.canResend = false;
            req.session.remainingTime = Math.max(
                Math.floor((req.session.otpExpiry - Date.now()) / 1000),
                0
            );
            return res.redirect("/verify-otp");
        }

        //Check OTP expiry
        if (Date.now() > req.session.otpExpiry) {
            req.session.message = "OTP expired";
            req.session.type = "error";
            req.session.canResend = true;
            req.session.remainingTime = 0;
            return res.redirect("/verify-otp");
        }

        // Check OTP mismatch
        if (otp !== savedOtp) {
            req.session.message = "Invalid OTP";
            req.session.type = "error";
            req.session.canResend = false;
            req.session.remainingTime = Math.floor((req.session.otpExpiry - Date.now()) / 1000);
            return res.redirect("/verify-otp");
        }

        // Check for OTP Type
        if (req.session.otpType === "forgotPassword") {
            return res.redirect("/reset-password",);
        }

        if (req.session.otpType === "change-email") {
            const email = req.session.email;
            const userId = req.user._id;
            const user = await User.findById(userId);
            if (!user) {
                req.session.message = "Please login";
                req.session.type = "error";
                return res.redirect("/login");
            }

            await User.findByIdAndUpdate(userId, { email });

            req.session.message = "Successfully updated email";
            req.session.type = "success";
            return res.redirect("/profile",);
        }

        if (req.session.otpType === "change-password") {
            const userId = req.user._id;
            const password = req.session.newPassword;
            const hashedPassword = await bcrypt.hash(password, 10);
            await User.findByIdAndUpdate(userId, { password_hash: hashedPassword });

            req.session.message = "Successfully updated password";
            req.session.type = "success";
            return res.redirect("/profile",);
        }

        // Hash password before saving
        const hashedPassword = await bcrypt.hash(userData.password, 10);

        const referralCode = generateReferralCode(userData.username);

        // Save User
        const user = await new User({
            username: userData.username,
            email: userData.email,
            password_hash: hashedPassword,
            referralCode
        });

        const savedUser = await user.save();

        await Wallet.create({
            user_id: savedUser._id
        });

        const referrer = req.session.referrer;
        if (referrer) {
            const amount = 100;
            await creditWallet(referrer._id, amount, `Referrel bonus`);
            // console.log(savedUser);
        }

        req.session.message = "Account created successfully! Please log in.";
        req.session.type = "success";
        return res.redirect("/login");

    } catch (error) {
        console.log(error);
        req.session.message = "OTP verification failed due to server error.";
        req.session.type = "error";
        req.session.canResend = false;
        req.session.remainingTime = 0;
        return res.redirect("/verify-otp");
    }
}

const loadForgotPassword = async (req, res) => {
    try {
        let message = req.session.message || "";
        req.session.message = "";
        let type = req.session.type || "";
        req.session.type = "";

        res.render("user/forgotPassword", {
            message,
            type,
            title: "Forgot Password",
            hideNavBar: true
        })

    } catch (error) {
        console.error(error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(MESSAGES.SERVER_ERROR);
    }
}

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            req.session.message = "Please enter the email";
            req.session.type = "error";
            return res.redirect("/forgotPassword");
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            req.session.message = 'Please enter a valid email address';
            req.session.type = "error";
            return res.redirect("/forgotPassword");
        }

        const existingUser = await User.findOne({ email }).select("+password_hash");
        if (!existingUser) {
            req.session.message = "invalid credentials";
            req.session.type = "error";
            return res.redirect("/signup");
        }

        if (!existingUser.password_hash && existingUser.googleId !== null) {
            req.session.message = "This account uses Google login. Please login with Google.";
            return res.redirect("/login");
        }

        const otp = generateOtp();

        const emailSent = await sentVerificationMail(email, otp);
        if (!emailSent) {
            req.session.message = "Failed to send OTP. Please try again.";
            req.session.type = "error";
            return res.redirect("/forgotPassword");
        }

        req.session.userOtp = otp;
        req.session.otpType = "forgotPassword";
        req.session.email = email;
        req.session.otpExpiry = Date.now() + 45 * 1000

        req.session.message = "OTP sent to your registered email";
        req.session.type = "success";
        req.session.canResend = false;
        req.session.remainingTime = 45;
        res.redirect("/verify-otp");
        console.log(`OTP sent ${otp}`);

    } catch (error) {
        console.error(error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(MESSAGES.SERVER_ERROR);
    }
}

const resetPassword = async (req, res) => {
    try {
        let message = req.session.message || "";
        req.session.message = "";
        let type = req.session.type || "";
        req.session.type = "";

        res.render("user/resetPassword", {
            message,
            type,
            title: "Forgot Password",
            hideNavBar: true
        })

    } catch (error) {
        console.error(error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(MESSAGES.SERVER_ERROR);
    }
}

const saveNewPassword = async (req, res) => {
    try {
        console.log("get in to saveNewPassword");

        const { password, confirmPassword } = req.body;
        if (!req.session.email) {
            req.session.message = "Please try again. Password change not successfull";
            req.session.type = "error";
            return res.redirect('/login');
        }
        const email = req.session.email;

        console.log(password, confirmPassword, email);

        if (!password || !confirmPassword) {
            req.session.message = "Please fill all mandatory fields";
            req.session.type = "error";
            return res.redirect("/reset-password");
        }

        if (password !== confirmPassword) {
            req.session.message = 'Passwords do not match';
            req.session.type = "error";
            return res.redirect("/reset-password");
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(password)) {
            req.session.message = 'Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&).';
            req.session.type = "error";
            return res.redirect("/reset-password");
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        console.log(hashedPassword);
        const user = await User.updateOne({ email: email },
            { $set: { password_hash: hashedPassword } }
        )

        console.log("user: ", user);

        req.session.message = "Password updated successfully! Please login.";
        req.session.type = "success";
        return res.redirect("/login");

    } catch (error) {
        console.error(error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(MESSAGES.SERVER_ERROR);
    }
}

const loadLogin = (req, res) => {
    try {
        let message = req.session.message || req.query.message || "";
        req.session.message = "";
        let type = req.session.type || "";
        req.session.type = "";

        res.render("user/login", {
            message,
            type,
            title: "Login Page",
            hideNavBar: true
        })

    } catch (error) {
        console.error(error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(MESSAGES.SERVER_ERROR);
    }
}

const resendOtp = async (req, res) => {
    try {
        const { email } = req.body;
        const newOtp = generateOtp();

        const emailSent = await sentVerificationMail(email, newOtp);

        if (!emailSent) {
            req.session.message = "Failed to send OTP. Please try again.";
            return res.redirect("/signup");
        }

        console.log(newOtp);
        req.session.userOtp = newOtp;
        req.session.otpExpiry = Date.now() + 45 * 1000;
        console.log();

        res.json({
            success: true,
            message: "OTP sent to your registered email",
            type: "success",
            canResend: false,
            remainingTime: 45
        })

    } catch (error) {
        console.error(`Resend OTP error, ${error}`);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: MESSAGES.SERVER_ERROR
        });
    }
}

const loginUser = async (req, res, next) => {
    try {
        console.log("get into loadlogin")
        req.session.message = "";
        const { email, password } = req.body;
        if (!email || !password) {
            return res.json({
                success: false,
                message: "Please fill required fields"
            });
        }
        console.log("checked fields");

        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        console.log("checking regex");

        if (!emailRegex.test(email)) {
            console.log("inside email check");
            return res.json({
                success: false,
                message: "Please enter a valid email address"
            });
        }
        console.log("checked regex");


        const PasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

        if (!PasswordRegex.test(password)) {
            return res.json({
                success: false,
                message: 'Password must be at least 8 characters, include uppercase, lowercase, number, and special character'
            });
        }

        const existingUser = await User.findOne({ email }).select('+password_hash');
        if (!existingUser) {
            return res.json({
                success: false,
                message: "Invalid email or password"
            });
        }
        console.log(existingUser);
        console.log(password);
        console.log(existingUser.password_hash);

        if (existingUser.userStatus === "Blocked") {
            return res.json({
                success: false,
                message: "You are blocked by admin"
            });
        }

        if (!existingUser.password_hash && existingUser.googleId !== null) {
            return res.json({
                success: false,
                message: "Please login using Google"
            });
        }

        const isMatch = await bcrypt.compare(password, existingUser.password_hash);


        if (!isMatch) {
            console.log("ismatch not working");

            return res.json({
                success: false,
                message: "Invalid email or password"
            });
        }

        // req.session.user = {
        //     id: existingUser._id,
        //     name: existingUser.username,
        //     email: existingUser.email
        // };

        console.log("existing User: ", existingUser);
        req.login(existingUser, (err) => {
            if (err) {
                return res.json({
                    success: false,
                    message: "Login failed"
                });
            }

            return res.json({
                success: true,
                redirect: "/home"
            });
        });

        //return res.redirect("/home");

    } catch (error) {
        console.error(error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(MESSAGES.SERVER_ERROR);
    }
}

const logout = async (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.log("Logout error:", err);
            return res.redirect("/home");

        }

        res.clearCookie("connect.sid");
        res.redirect("/login");
    });
}

const generateReferralCode = (username) => {
    const random = Math.floor(1000 + Math.random() * 9000);

    const name = username.trim();
    const namePart = name ? name.substring(0, 3).toUpperCase() : "USR";
    return `${namePart}${random}`;
};



module.exports = {
    loadRegister,
    registerUser,
    checkEmail,
    loadVerifyOtp,
    verifyOtp,
    resendOtp,
    loadLogin,
    loginUser,
    loadForgotPassword,
    forgotPassword,
    resetPassword,
    saveNewPassword,
    logout
}

