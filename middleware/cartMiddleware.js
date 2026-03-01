const cartService = require("../services/cartService");

const injectCartCount = async (req, res, next) => {
    try {
        if (req.session && req.session.user) {
            const count = await cartService.getCartCount(req.session.user.id);
            res.locals.cartCount = count;
        } else {
            res.locals.cartCount = 0;
        }

        next();

    } catch (error) {
        console.error("Cart Middleware Error:", error);
        res.locals.cartCount = 0;
        next();
    }

}
 module.exports = {
        injectCartCount
    }