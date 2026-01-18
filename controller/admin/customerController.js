const mongoose = require("mongoose");
const User = require("../../models/userModel");
//const bcrypt = require("bcryptjs");

const loadCustomer = async (req, res) => {
    try {
        let page = parseInt(req.query.page) || 1;
        let message = req.session.message || "";
        req.session.message = "";
        res.render('admin/customer', { message, page });
    } catch (error) {
        console.log("server error", error);
        res.status(500).send("server error")
    }

}


const fetchUser = async (req, res) => {

    try {
        console.log("fetch user");

        let search = "";
        if (req.query.search) {
            search = req.query.search;
            console.log(search);
        }
        let page = 1;
        if (req.query.page) {
            page = parseInt(req.query.page);
        }
        const limit = 2;
        let customers = await User.find({
            $or: [
                { username: { $regex: search, $options: "i" } },
                { email: { $regex: search } }
            ]
        }).sort({ created_at: -1 }).skip((page - 1) * limit).limit(limit);

        const count = await User.find({
            $or: [
                { username: { $regex: search } },
                { email: { $regex: search } }
            ]
        }).countDocuments();

        totalPages = Math.ceil(count / limit);

        console.log("fetched user:", customers);
        return res.json({
            customers,
            totalPages,
            currentPage: page
        });
    } catch (error) {
        console.log("server error", error);
        res.status(500).send("server error")
    }
}


const userDetails = async (req, res) => {
    try {
        let message = req.session.message || "";
        req.session.message = "";
        let type = req.session.type || "";
        req.session.type = '';
        const userId = req.params.id;
        const page = parseInt(req.query.page) || 1;
        const user = await User.findOne({ _id: userId });
        if (!user) {
            req.session.message = "User not found";
            return res.status(404).send("User not found");
        }
        res.render('admin/editCustomer', { message, type, user, page });
    } catch (error) {
        console.log("server error", error);
        res.status(500).send("server error")
    }
}

const updateUser = async (req, res) => {
    try {
        const userId = req.params.id;
        const page = parseInt(req.query.page);
        console.log("req.body : ", req.body);

        const { role, status } = req.body;

        console.log(role, status)
        const updateUser = await User.updateOne({ _id: userId }, {
            $set: {
                role: role,
                userStatus: status,
                updated_at: new Date()
            }
        })
        console.log(updateUser);

        res.redirect(`/admin/customer/?page=${page}`);
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
}



module.exports = {
    loadCustomer,
    fetchUser,
    userDetails,
    updateUser,
}