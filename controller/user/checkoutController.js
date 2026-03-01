const Cart = require("../../models/cartModel");
const CartItem = require("../../models/cartItemsModel");
const Address = require("../../models/addressModel");
const User = require("../../models/userModel");
const Order = require("../../models/orderModel");
const OrderItem = require("../../models/orderItemsModel");

const { getSessionMessage } = require("../../utils/sessionHelper");


const getCheckout = async (req, res) => {
    try {
        const { message, type } = getSessionMessage(req);
        const userId = req.session.user.id;
        const userCart = await Cart.findOne({ user_id: userId, is_active: true });
        if (!userCart) {
            req.session.message = "Please add products to cart";
            req.session.type = "error";
            return res.redirect("/products");
        }
        const cartItems = await CartItem.find({ cart_id: userCart._id })
            .populate("product_id",);
        const addresses = await Address.find({ user_id: userId });
        const subTotal = cartItems.reduce((sum, item) => {
            return sum += item.quantity * item.price;
        }, 0)
        res.render("user/checkout", {
            cartItems,
            addresses,
            subTotal,
            message,
            type
        })

    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
};

const createOrder = async (req, res) => {
    try {
        console.log("hit the controller");
        console.log("req.session.user: ", req.session.user);

        const userId = req.session.user.id;
        const user = await User.findById(userId);

        if (!user) {
            req.session.message = "Not authorized to place order. Please login";
            req.session.type = "error";
            return res.redirect("/login");
        }

        const { selectedAddressId, paymentMethod } = req.body;

        const address = await Address.findById(selectedAddressId);

        if (!address) {
            req.session.message = "Please add or select an address";
            req.session.type = "error";
            return res.redirect("/checkout");
        }

        const cart = await Cart.findOne({ user_id: userId, is_active: true });
        if (!cart) {
            req.session.message = "Please add products to cart";
            req.session.type = "error";
            return res.redirect("/products");
        }

        const cartItems = await CartItem.find({ cart_id: cart._id }).
            populate("product_id");

        if (!cartItems || cartItems.length === 0) {
            req.session.message = "Please add products to cart";
            req.session.type = "error";
            return res.redirect("/products");
        }

        const orderId = "ORD-" + Date.now();
        let totalAmount = 0;

        const orderItems = cartItems.map(item => {
            const variant = item.product_id.variants.find(
                v => v._id.toString() === item.variant_id.toString()
            );

            const subtotal = variant.price * item.quantity;
            totalAmount += subtotal;

            return {
                product_id: item.product_id._id,
                productName: item.product_id.name,
                variant_id: item.variant_id,
                price: variant.price,
                quantity: item.quantity,
                subtotal,
            };
        });

        const newOrder = await new Order({
            user_id: userId,
            orderId,
            shippingAddress: {
                fullName: address.full_name,
                phone: address.mobile,
                street: address.street,
                city: address.city,
                state: address.state,
                pincode: address.postal_code
            },
            totalAmount,
            paymentMethod,
        }).save();

        for (const item of orderItems) {
    await OrderItem.create({
        order_id: newOrder._id,
        product_id: item.product_id,
        productName: item.productName,
        variant_id: item.variant_id,
        price: item.price,
        quantity: item.quantity,
        subtotal: item.subtotal
    });
}

        cart.is_active = false;
        await cart.save();

        return res.render('user/order-success', {
            orderId
        });

    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
}


module.exports = {
    getCheckout,
    createOrder,
}