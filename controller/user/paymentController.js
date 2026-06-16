const razorpay = require("../../config/razorpay");
const Order = require("../../models/orderModel");
const Coupon = require("../../models/couponSchema");
const Product = require("../../models/productModel");
const OrderItem = require("../../models/orderItemsModel");

const { createOrderService } = require("../../services/createOrderService");

const STATUS_CODES = require("../../constants/statusCodes");
const MESSAGES = require("../../constants/messages");

const crypto = require("crypto");

const createRazorpayOrder = async (req, res) => {
    try {
        const userId = req.user._id;
        const { amount, selectedAddressId, couponCode, discount } = req.body;

        amountInPaise = Math.round(amount * 100);

        const order = await createOrderService(
            userId,
            selectedAddressId,
            "online",
            "pending",
            couponCode
        );
        console.log("coupon: ", couponCode);

        const options = {
            amount: amountInPaise,
            currency: "INR",
            receipt: "order_" + Date.now()
        };

        const razorpayOrder = await razorpay.orders.create(options);
        console.log(razorpayOrder);



        res.json({
            success: true,
            razorpayOrderId: razorpayOrder.id,
            amount: razorpayOrder.amount,
            orderId: order.orderId,
            order_id: order._id
        });

    } catch (error) {
        console.error(error);

        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: error.message
        });
    }
};

// const verifyPayment = async (req, res) => {
//     try {
//         console.log("Hi");

//         const {
//             razorpay_order_id,
//             razorpay_payment_id,
//             razorpay_signature,
//             orderId,
//             couponCode
//         } = req.body;

//         console.log("orderId:", orderId);

//         // 1. VERIFY SIGNATURE FIRST
//         const body = razorpay_order_id + "|" + razorpay_payment_id;

//         const expectedSignature = crypto
//             .createHmac("sha256", process.env.RAZORPAY_API_SECRET)
//             .update(body.toString())
//             .digest("hex");

//         if (expectedSignature !== razorpay_signature) {
//             return res.json({ status: false });
//         }

//         // 2. FIND ORDER
//         const order = await Order.findById(orderId);
//         if (!order) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Order not found"
//             });
//         }

//         // 3. VALIDATE COUPON (ONLY IF SENT)
//         let coupon = null;

//         if (couponCode) {
//             coupon = await Coupon.findOne({
//                 code: couponCode.trim().toUpperCase()
//             });

//             console.log("coupon: ", coupon);


//             if (!coupon) {
//                 return res.status(400).json({
//                     success: false,
//                     message: "Invalid coupon code"
//                 });
//             }


//         }

//         const orderItems = await OrderItem.find({ order_id: order._id })
//         .populate("product_id");

//         for (const item of orderItems) {

//             const variant = item.product_id.variants.find(v =>
//                 v._id.toString() === item.variant_id.toString()
//             );
//             if (!variant || variant.stock < item.quantity) {
//                 return res.status(400).json({
//                     success: false,
//                     message: "Stock not available"
//                 });
//             }

//             variant.stock -= item.quantity;
//             await item.product_id.save();
//         }

//         // 4. UPDATE ORDER
//         order.paymentStatus = "paid";
//         order.razorpayOrderId = razorpay_order_id;
//         order.razorpayPaymentId = razorpay_payment_id;
//         await order.save();

//         // 5. UPDATE COUPON USAGE (ONLY IF VALID)
//         if (coupon) {
//             coupon.usageCount += 1;
//             await coupon.save();
//         }

//         return res.json({
//             status: true,
//             orderId: order.orderId
//         });

//     } catch (error) {
//         console.log(error);
//         return res.status(500).json({
//             success: false,
//             message: "Server error"
//         });
//     }
// };

const verifyPayment = async (req, res) => {
    try {
        console.log("Hi");

        const userId = req.user._id;

        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            orderId,
            couponCode
        } = req.body;

        console.log("orderId:", orderId);

        const body = razorpay_order_id + "|" + razorpay_payment_id;

        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_API_SECRET)
            .update(body)
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            return res.json({ status: false });
        }

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(STATUS_CODES.NOT_FOUND).json({
                success: false,
                message: "Order not found"
            });
        }

        if (order.paymentStatus === "paid") {
            return res.json({
                status: true,
                orderId: order.orderId
            });
        }

        let coupon = null;

        if (couponCode) {
            const formattedCode = couponCode.trim().toUpperCase();

            coupon = await Coupon.findOne({ code: formattedCode });

            if (!coupon) {
                return res.status(STATUS_CODES.BAD_REQUEST).json({
                    success: false,
                    message: "Invalid coupon code"
                });
            }
        }

        const orderItems = await OrderItem.find({ order_id: order._id });

        for (const item of orderItems) {

            const updated = await Product.updateOne(
                {
                    _id: item.product_id,
                    "variants._id": item.variant_id,
                    "variants.stock": { $gte: item.quantity }
                },
                {
                    $inc: { "variants.$.stock": -item.quantity }
                }
            );

            if (updated.modifiedCount === 0) {
                return res.status(STATUS_CODES.BAD_REQUEST).json({
                    success: false,
                    message: "Stock not available"
                });
            }
        }

        order.paymentStatus = "paid";
        order.razorpayOrderId = razorpay_order_id;
        order.razorpayPaymentId = razorpay_payment_id;
        await order.save();

        await OrderItem.updateMany(
            { order_id: order._id },
            {
                $set: { paymentStatus: "paid" }
            }
        );

        if (coupon) {
            coupon.usageCount += 1;
            coupon.usedBy.push(userId);
            await coupon.save();
        }

        return res.json({
            status: true,
            orderId: order.orderId
        });

    } catch (error) {
        console.log(error);
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: MESSAGES.SERVER_ERROR
        });
    }
};

const paymentFailed = async (req, res) => {

    const { orderId } = req.body;
    console.log("hi");


    await Order.findByIdAndUpdate(orderId, {
        paymentStatus: "failed"
    });

     await OrderItem.updateMany(
            { order_id: order._id },
            {
                $set: { paymentStatus: "paid" }
            }
        );
        
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