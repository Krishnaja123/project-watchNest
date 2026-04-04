const razorpay = require("../../config/razorpay");
const Order = require("../../models/orderModel");
const Cart = require("../../models/cartModel");
const OrderItem = require("../../models/orderItemsModel");

const { createOrderService } = require("../../services/createOrderService");

const crypto = require("crypto");

const createRazorpayOrder = async (req, res) => {
    try {
        const userId = req.user._id;
        const { amount, selectedAddressId, couponCode, discount } = req.body;

        amountInPaise  = Math.round(amount * 100);

        const order = await createOrderService(
            userId,
            selectedAddressId,
            "online",
            "pending",
            discount,
            couponCode
        );

        const options = {
            amount: amountInPaise,
            currency: "INR",
            receipt: "order_" + Date.now()
        };

        const razorpayOrder = await razorpay.orders.create(options);
        console.log(razorpayOrder);

        res.json({
            razorpayOrderId: razorpayOrder.id,
            amount: razorpayOrder.amount,
            orderId: order.orderId,
            order_id: order._id
        });

    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
};

const verifyPayment = async (req, res) => {

    console.log("Hi");

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

    console.log("orderId: ", orderId);
    
    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_API_SECRET)
        .update(body.toString())
        .digest("hex");

    if (expectedSignature === razorpay_signature) {
        const userId = req.user._id;

        // if (paymentMethod === "online") {
        //     const orderItems = await OrderItem.find({ order_id: orderId }).populate("product_id");

        //     for (const item of orderItems) {
        //         const product = item.product_id;

        //         const variant = product?.variants?.find(
        //             v => v._id.toString() === item.variant_id.toString()
        //         );
        //         variant.stock -= item.quantity;
        //         await product.save();
        //     }

        //     const cart = await Cart.findOne({ user_id: userId, is_active: true });
        //     if (cart) {
        //         cart.is_active = false;
        //         await cart.save();
        //     }

        // }
        const order = await Order.findById(orderId);

        console.log("order: ", order);
        

        order.paymentStatus = "paid";
        order.razorpayOrderId = razorpay_order_id;
        order.razorpayPaymentId = razorpay_payment_id;
        order.save();

        res.json({
            status: true,
            orderId: order.orderId
        });

    } else {

        res.json({ status: false });
    }

};

const paymentFailed = async (req, res) => {

    const { orderId } = req.body;
    console.log("hi");


    await Order.findByIdAndUpdate(orderId, {
        paymentStatus: "failed"
    });

    res.json({ success: true });

};

const paymentFailedPage = async (req, res) => {

    const orderId = req.params.id;

    const order = await Order.findOne({ orderId });

    console.log(order);


    res.render("user/payment-failed", {
        orderId,
        order_id: order._id
    });

};


const paymentSuccessPage = async (req, res) => {

    const orderId = req.params.id;

    res.render("user/payment-success", { orderId });

};
const retryPaymentPage = async (req, res) => {
    try {
        const orderId = req.params.id;
        console.log("order_id:", orderId);


        const order = await Order.findById(orderId);


        if (order.paymentStatus === "paid") {
            return res.redirect("/orders");
        }

        const razorpayOrder = await razorpay.orders.create({
            amount: order.totalAmount * 100,
            currency: "INR",
            receipt: "retry_" + order._id
        });

        res.render("user/retryPayment", {
            order,
            razorpayOrder,
            key: process.env.RAZORPAY_API_KEY
        })

    } catch (error) {
        console.log(error);
        // res.redirect("/orders");
    }
}



module.exports = {
    createRazorpayOrder,
    verifyPayment,
    paymentFailed,
    paymentFailedPage,
    paymentSuccessPage,
    retryPaymentPage
}