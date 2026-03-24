const Cart = require("../../models/cartModel");
const CartItem = require("../../models/cartItemsModel");
const Address = require("../../models/addressModel");

const { getSessionMessage } = require("../../utils/sessionHelper");


const getCheckout = async (req, res) => {
    try {
        const { message, type } = getSessionMessage(req);
        const userId = req.user._id;

        const userCart = await Cart.findOne({ user_id: userId, is_active: true });

        if (!userCart) {
            req.session.message = "Please add products to cart";
            req.session.type = "error";
            return res.redirect("/products");
        }

        const cartItems = await CartItem.find({ cart_id: userCart._id })
            .populate("product_id");

            if(cartItems.length === 0) {
                req.session.message = "Cart is empty, please add products to cart.";
                req.session.type = "error";
                return res.redirect('/products');
            }

            const validCartItems = cartItems.filter(item => {
                const product = item.product_id;
                const variant = product?.variants?.id(item.variant_id);

                return variant && variant.view === true && variant.stock > 0
            });

            if(validCartItems.length !== cartItems.length) {
                req.session.message = "Some items in your cart are unavailable. Please review your cart.";
                req.session.type = "error";
                return res.redirect('/cart');
            }

        const addresses = await Address.find({ user_id: userId }).sort({ is_default: -1 });
        
        const subTotal = validCartItems.reduce((sum, item) => {
            return sum += item.quantity * item.price;
        }, 0);

        res.render("user/checkout", {
            cartItems: validCartItems,
            addresses,
            subTotal,
            message,
            type,
            razorpayKey: process.env.RAZORPAY_API_KEY
        });

    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
};

module.exports = {
    getCheckout,
}