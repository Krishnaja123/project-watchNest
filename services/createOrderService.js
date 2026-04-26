const Cart = require("../models/cartModel");
const CartItem = require("../models/cartItemsModel");
const Address = require("../models/addressModel");
const User = require("../models/userModel");
const Order = require("../models/orderModel");
const OrderItem = require("../models/orderItemsModel");
const Wallet = require("../models/walletModel");
const Coupon = require("../models/couponSchema");

const { debitWallet } = require("../services/walletServices");
const { ModifiedPathsSnapshot } = require("mongoose");
const { getOffer } = require("../services/offerService");


const createOrderService = async (userId, selectedAddressId, paymentMethod, paymentStatus, offerDiscount = 0, couponCode = null) => {
    console.log("get in to service");

    const address = await Address.findById(selectedAddressId);
    console.log("address: ", address);


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
    let totalAfterOffer = 0;
    let totalOfferAmount = 0;

    const orderItems = [];

    for (const item of cartItems) {
        const variant = item.product_id.variants.find(
            v => v._id.toString() === item.variant_id.toString()
        );

        if (variant.stock < item.quantity) {
            throw new Error("Stock not available for some products. please review cart.");
        }

        if (paymentMethod === "cod") {
            variant.stock -= item.quantity;
            await item.product_id.save();

        }

        // const subtotal = variant.price * item.quantity;

        // const itemOfferDiscount = 0;

        // const priceAfterOffer = subtotal - itemOfferDiscount;

        const product = item.product_id;
        const bestDiscount = await getOffer(product, variant.price);
        const finalUnitPrice = variant.price - bestDiscount;
        const priceAfterOffer = finalUnitPrice * item.quantity;
        const itemOfferDiscount = bestDiscount * item.quantity;
        const subtotal = variant.price * item.quantity;

        totalAmount += subtotal;
        totalOfferAmount += itemOfferDiscount;
        totalAfterOffer += priceAfterOffer;

        orderItems.push({
            product_id: product._id,
            productName: product.name,
            variant_id: item.variant_id,
            price: variant.price,
            image: variant.images[0],
            quantity: item.quantity,
            subtotal,
            offerDiscount: itemOfferDiscount,
            priceAfterOffer
        });
    }

    let couponDiscount = 0;
    if (couponCode) {
        const coupon = await Coupon.findOne({ code: couponCode });

        if (!coupon) {
            throw new Error("Invalid coupon");
        }
        if (coupon.discountType === "percentage") {
            const discount = Math.round((totalAfterOffer * coupon.discountValue) / 100);
            couponDiscount = Math.min(discount, coupon.maxDiscount);
        } else {
            couponDiscount = coupon.discountValue;
        }
    }

    const tax = Math.round(totalAfterOffer * 0.05);
    const shippingCharge = 50;
    const finalAmount = totalAfterOffer - couponDiscount + tax + shippingCharge;

    let wallet = null;

    if (paymentMethod === "wallet") {
        wallet = await Wallet.findOne({ user_id: userId });

        if (!wallet) {
            throw new Error("Wallet not found");
        }

        if (wallet.balance < finalAmount) {
            throw new Error("Insufficient wallet balance....");
        }
    }

    // const couponDiscount = totalAmount - finalAmount;

    const newOrder = await Order.create({
        user_id: userId,
        orderId,
        totalAmount: finalAmount,
        originalAmount: totalAmount,
        couponCode,
        couponDiscount,
        shippingAddress: address,
        paymentMethod,
        paymentStatus,
        taxAmount: tax,
        offerDiscount: totalOfferAmount
    });

    console.log("newOrder: ", newOrder);

    for (const item of orderItems) {

        let couponShare = 0;

        if (totalAfterOffer > 0) {
            couponShare = Math.round(
                (item.priceAfterOffer / totalAfterOffer) * couponDiscount
            );
        }

        const finalPrice = Math.round(item.priceAfterOffer - couponShare);

        await OrderItem.create({
            order_id: newOrder._id,
            product_id: item.product_id,
            productName: item.productName,
            variant_id: item.variant_id,
            price: item.price,
            image: item.image,
            quantity: item.quantity,
            subtotal: item.subtotal,
            offerDiscount: item.offerDiscount,
            couponDiscount: couponShare,
            finalPrice
        });
    }

    if (paymentMethod === "wallet") {
        const reason = `Order Payment against order ${newOrder.orderId}`;
        await debitWallet(userId, newOrder.totalAmount, reason);
        for (const item of cartItems) {
            const variant = item.product_id.variants.find(
                v => v._id.toString() === item.variant_id.toString()
            );
            variant.stock -= item.quantity;
            await item.product_id.save();
        }
        newOrder.paymentStatus = "paid";
        newOrder.save();
    }

    cart.is_active = false;
    await cart.save();

    return newOrder;
};

module.exports = {
    createOrderService
};