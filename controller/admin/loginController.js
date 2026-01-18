const User = require("../../models/userModel");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");


const loadLogin = (req, res) => {
    try {
        if (req.session.admin)
            return res.redirect('/admin/customer');
        let message = req.session.message || "";
        req.session.message = "";
        let type = req.session.type || "";
        req.session.type = "";
        res.render('admin/login', { message, type });
    } catch (error) {
        console.log("server error", error);
        res.status(500).send("server error")
    }
}

const login = async (req, res) => {
    const { email, password } = req.body;
    console.log("hi");

    if (!email || !password) {
        console.log("login without data")
        req.session.message = 'Please fill all mandatory fields';
        return res.redirect("/admin/login");
    }
    try {
        const user = await User.findOne({ email }).select('+password_hash');
        if (!user) {
            req.session.message = 'User does not exist';
            return res.redirect("/admin/login");

        }

        if (user.role !== "admin") {
            req.session.message = 'Unauthorized access';
            return res.redirect("/admin/login");

        }

        const isMatchPassword = await bcrypt.compare(password, user.password_hash);

        if (!isMatchPassword) {
            req.session.message = 'Incorrect password';
            return res.redirect("/admin/login");
        }
        req.session.admin = {
            id: user._id,
            email: user.email
        };
        return res.redirect("/admin/customer");

    } catch (error) {
        console.error("Login error:", error);
        req.session.message = 'Server error. Please try again.';
        return res.redirect("/admin/login");
    }

}

const logout = async (req, res) => {
    try {
        req.session.destroy(err => {
            if(err){
                console.log("Error in destroying session", err);
                return res.status(500).send("Logout failed");
            }

            res.clearCookie("connect.sid");

            return res.redirect("/admin/login");
        })
    } catch (error) {
        console.log("unexpected error during logout", error);
        return res.status(500).send("Logout error");

    }
}

module.exports = {
    loadLogin,
    login,
    logout
}