const cartService = require("../services/cartService");
const wishlistService = require("../services/wishlistService");

const injectCountsMiddleware = async (req, res, next) => {
    try {
        if (req.user) {
            const cartItemsCount = await cartService.getCartCount(req.user._id);
            const wishlistItemCount = await wishlistService.getWishlistCount(req.user._id);

            res.locals.cartCount = cartItemsCount;
            res.locals.wishlistCount = wishlistItemCount;

        } else {
            res.locals.cartCount = 0;
            res.locals.wishlistCount = 0;
        }

        next();

    } catch (error) {
        console.error("Cart Middleware Error:", error);
        res.locals.cartCount = 0;
        next();
    }

}
module.exports = {
    injectCountsMiddleware
}