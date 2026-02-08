const User = require("../../models/userModel");
const bcrypt = require('bcryptjs');
const nodemailer = require("nodemailer");
require("dotenv").config();
//const {userAuth, adminAuth} = require("../middleware/auth")


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
            title: "SignUp"
        });

    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
}

const registerUser = async (req, res) => {
    try {

        const { username, email, password, confirmPassword } = req.body;

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


        //email = email.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            req.session.message = 'Please enter a valid email address';
            req.session.type = "error";
            return res.redirect("/signup");
        }

        // const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        // if (!passwordRegex.test(password)) {
        //     req.session.message = 'Password must be at least 8 characters long and include at least one uppercase letter, 
        //                                          one lowercase letter, one number, and one special character (@$!%*?&).';
        //     req.session.type = "error";
        //     return res.redirect("/signup");
        // }

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

const loadVerifyOtp = async (req, res) => {
    try {
        let message = req.session.message || "";
        let type = req.session.type || "";
        let email = req.session.userData?.email || "";
        let canResend = req.session.canResend ?? false;
        //console.log(type);
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
            title: "OTP Verification"
        });

    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
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
            return res.redirect("/reset-password");
        }

        // Hash password before saving
        const hashedPassword = await bcrypt.hash(userData.password, 10);

        // Save User
        const user = await new User({
            username: userData.username,
            email: userData.email,
            password_hash: hashedPassword,
        });

        const savedUser = await user.save();
        console.log(savedUser);

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
            title: "Forgot Password"
        })

    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
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

        const existingUser = await User.findOne({ email });
        if (!existingUser) {
            req.session.message = "Not a registered email";
            req.session.type = "error";
            return res.redirect("/signup");
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
        res.status(500).send("Internal Server Error");
    }
}

const resetPassword = async (req,res) => {
    try {
        let message = req.session.message || "";
        req.session.message = "";
        let type = req.session.type || "";
        req.session.type = "";

        res.render("user/resetPassword", {
            message,
            type,
            title: "Forgot Password"
        })

    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
}

const saveNewPassword = async (req,res) => {
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
            return res.redirect("/signup");
        }

        if (password !== confirmPassword) {
            req.session.message = 'Passwords do not match';
            req.session.type = "error";
            return res.redirect("/signup");
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        console.log(hashedPassword);
        const user = await User.updateOne( {email: email}, 
            { $set: {password_hash: hashedPassword}}
        )

        console.log("user: ", user);
        

        req.session.message = "Password updated successfully! Please login.";
        req.session.type = "success";
        return res.redirect("/login");

    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
}

const loadLogin = (req, res) => {
    try {
        let message = req.session.message || "";
        req.session.message = "";
        let type = req.session.type || "";
        req.session.type = "";

        res.render("user/login", {
            message,
            type,
            title: "Login Page"
        })

    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
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
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
}

const loginUser = async (req, res) => {
    try {
        console.log("get into loadlogin")
        req.session.massage = "";
        const { email, password } = req.body;
        if (!email || !password) {
            req.session.message = "Please fill required fields";
            return res.redirect("/login");
        }
        console.log("checked fields");

        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        console.log("checking regex");

        if (!emailRegex.test(email)) {
            console.log("inside email check");

            req.session.message = 'Please enter a valid email address';
            return res.redirect("/login");
        }
        console.log("checked regex");


        const PasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        // if (!PasswordRegex.test(password)) {
        //     req.session.message = 'Password must be at least 8 characters, include uppercase, lowercase, number, and special character';
        //     return res.redirect("/login", { message });
        // }

        const existingUser = await User.findOne({ email }).select('+password_hash');
        if (!existingUser) {
            req.session.message = "User with this email not found. Please signup";
            return res.redirect("/login");
        }
        console.log(existingUser);
        console.log(password);
        console.log(existingUser.password_hash);

        const isMatch = await bcrypt.compare(password, existingUser.password_hash);


        if (!isMatch) {
            console.log("ismatch not working");

            req.session.message = "Invalid password";
            return res.redirect("/login");
        }
        req.session.user = {
            id: existingUser._id,
            name: existingUser.username,
            email: existingUser.email
        };
        console.log(req.session.user);
        

        return res.redirect("/home");

    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
}

const logout = async (req, res) => {
    req.session.destroy(err => {
        if(err){
            console.log("Logout error:", err);
            return res.redirect("/home");
            
        }

        res.clearCookie("connect.sid");
        res.redirect("/login");
    });
}
module.exports = {
    loadRegister,
    registerUser,
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

