const User = require("../models/userModel");

const userAuth = (req, res, next) => {
    if (req.session.user) {
        return res.redirect("/home");;
    }
    return next();
}

const requireLogin = async (req, res, next) => {
    if (!req.session.user) {
        return res.redirect("/login");
    }

    try {
        console.log(req.session.user);
        const user = await User.findById(req.session.user.id);

        if (!user || user.userStatus === "Blocked") {
            delete req.session.user; 
            req.session.message = "You are not authorized. Please contact admin.";
            req.session.type = "error";
            return res.redirect("/login");
        }
        next();

    } catch (error) {
        console.log(error);
        return res.redirect("/login");
    }
}


module.exports = {
    userAuth,
    requireLogin,
}