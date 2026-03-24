const Cart = require("../models/cartModel");
const CartItem = require("../models/cartItemsModel");
const Address = require("../models/addressModel");
const User = require("../models/userModel");
const Order = require("../models/orderModel");
const OrderItem = require("../models/orderItemsModel");

const createOrderService = async (userId, selectedAddressId, paymentMethod, paymentStatus) => {
    console.log("get in to service");

    const address = await Address.findById(selectedAddressId);

    if (!address) {
        throw new Error("Please select or add a shipping address");
    }

    const cart = await Cart.findOne({ user_id: userId, is_active: true });

    if (!cart) {
        throw new Error("Please add products to cart");
    }

    const cartItems = await CartItem.find({ cart_id: cart._id })
        .populate("product_id");

    if (!cartItems || cartItems.length === 0) {
        throw new Error("Please add products to cart");
    }

    const orderId = "ORD-" + Date.now();
    let totalAmount = 0;

    const orderItems = [];

    for (const item of cartItems) {
        const variant = item.product_id.variants.find(
            v => v._id.toString() === item.variant_id.toString()
        );

        if (variant.stock < item.quantity) {
            throw new Error("Stock not available for some products");
        }

        // Reduce stock
        variant.stock -= item.quantity;

        // Save product properly (await it!)
        await item.product_id.save();

        const subtotal = variant.price * item.quantity;
        totalAmount += subtotal;

        orderItems.push({
            product_id: item.product_id._id,
            productName: item.product_id.name,
            variant_id: item.variant_id,
            price: variant.price,
            image: variant.images[0],
            quantity: item.quantity,
            subtotal,
        });
    }

    const newOrder = await Order.create({
        user_id: userId,
        orderId,
        totalAmount,
        shippingAddress: address,
        paymentMethod,
        paymentStatus
    });

    for (const item of orderItems) {
        await OrderItem.create({
            order_id: newOrder._id,
            ...item
        });
    }

    // if (paymentMethod === "cod") {
    cart.is_active = false;
    await cart.save();
    //}
    return newOrder;
};

module.exports = {
    createOrderService
};