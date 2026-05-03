const mongoose = require("mongoose");
const Order = require("../../models/orderModel");
const OrderItem = require("../../models/orderItemsModel");
const Product = require("../../models/productModel");

const { calculateOrderStatus } = require("../../utils/orderStatusHelper");
const { getSessionMessage } = require("../../utils/sessionHelper");
const { creditWallet } = require("../../services/walletServices");


const getOrders = async (req, res) => {
    try {
        const { message, type } = getSessionMessage(req);

        let page = parseInt(req.query.page) || 1;

        // const orders = await Order.find();

        // for (const order of orders) {

        //     const orderItems = await OrderItem.find({ order_id: order._id });

        //     const newOrderStatus = calculateOrderStatus(orderItems);

        //     await Order.findByIdAndUpdate(order._id, {
        //         status: newOrderStatus
        //     });

        // }
        return res.render("admin/orders", { message, type, page });

    } catch (error) {

        console.log("server error", error);
        return res.status(500).send("server error");

    }
}

const fetchOrders = async (req, res) => {
    try {
        let search = "";
        if (req.query.search) {
            search = req.query.search;
        }

        let page = 1;
        if (req.query.page) {
            page = parseInt(req.query.page);
        }

        const limit = 7;

        let orders = await Order.find({
            orderId: { $regex: search, $options: "i" },
        }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit);

        // let orders = await Order.find({
        //     orderId: { $regex: search, $options: "i"},
        //     status: "delivered",
        //     totalAmount: {$}
        // })
        console.log(orders);

        let count = await Order.find({
            orderId: { $regex: search, $options: "i" },
        }).countDocuments();
        console.log(count);

        totalPages = Math.ceil(count / limit);

        return res.json({
            orders,
            totalPages,
            currentPage: page
        })

    } catch (error) {
        console.log("server error", error);
        res.status(500).send("server error")
    }
}

const getOrderDetails = async (req, res) => {
    try {
        const { message, type } = getSessionMessage(req);

        const orderId = req.params.id;
        const page = req.query.page;

        const order = await Order.findById(orderId);

        if (!order) {
            req.session.message = "Order with this id is not available in db";
            req.session.type = "error";
            return res.redirect("/orders");
        }

        const orderItems = await OrderItem.find({ order_id: orderId });

        // console.log("orderItems: ", orderItems);

        res.render("admin/orderDetails", {
            order,
            orderItems,
            page,
            message,
            type
        });

    } catch (error) {
        console.log(error);
        res.status(500).send("Server Error");
    }
};

// const updateOrderStatus = async (req, res) => {
//     try {
//         const { status } = req.body;
//         const orderId = req.params.id;

//         await Order.findByIdAndUpdate(orderId, {
//             status: status
//         });

//         req.session.message = "Order status has been changed successfully";
//         req.session.type = "success";
//         res.redirect(`/admin/orderDetails/${orderId}`);

//     } catch (error) {
//         console.log(error);
//         res.status(500).send("Server Error");
//     }
// };

const updateProductStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const orderItemId = req.params.id;

        const item = await OrderItem.findById(orderItemId);

        if (!item) {
            console.log("No item found for id:", orderItemId);
            return res.status(404).json({ error: "Item not found" });
        }

        const order = await Order.findById(item.order_id);
        if (order.paymentStatus === "failed") {
            if (status !== "cancelled") {
                req.session.message = `Cannot change the status to shipped because the payment failed. Only cancellation is allowed.`;
                req.session.type = "error";
                return res.redirect(`/admin/orderDetails/${item.order_id}`);
            }
        }
        if (item.status === "processing") {

            item.status = status;
            await item.save();

            if (status === "cancelled") {
                const product = await Product.findById(item.product_id);
                const variant = product?.variants?.id(item.variant_id);
                variant.stock += item.quantity;
                await product.save();
                if(order.paymentStatus === "paid") {
                //const discountRatio = order.couponDiscount / order.originalAmount;
                // const taxRatio = (itemTotal / orderSubTotal) * (order.tax || 0);
                const itemTotal = item.finalPrice * item.quantity;
                // const itemDiscount = itemTotal * discountRatio;
                const tax = item.finalPrice * 0.05;
                const refundAmount = itemTotal - item.couponDiscount + tax;

                console.log("refund: ", refundAmount);

                const userId = req.user._id;
                await creditWallet(userId, refundAmount, `Refund for returned product`);
                order.refundAmount = (order.refundAmount || 0) + refundAmount;
                await order.save();
                }
            }

        } else if (item.status === "shipped") {

            if (status !== "delivered") {
                req.session.message = `can not change the product status to ${status} as its allreay shipped.`;
                req.session.type = "error";
                return res.redirect(`/admin/orderDetails/${item.order_id}`);
            }

            item.status = status;
            await item.save();

            const items = await OrderItem.find({ order_id: item.order_id });

            const allDelivered = items.every(i => i.status === "delivered");

            if (allDelivered) {

                const order = await Order.findById(item.order_id);

                if (order) {

                    if (order.paymentMethod === "cod") {
                        order.paymentStatus = "paid";
                        await order.save();
                    }
                }
            }

        } else if (item.status === "delivered") {
            if (item.returnRequested && item.returnAccepted) {
                item.status = status;
                await item.save();

                const product = await Product.findById(item.product_id);
                const variant = product?.variants?.id(item.variant_id);
                variant.stock += item.quantity;
                await product.save();

                const order = await Order.findOne({ _id: item.order_id });
                // const discountRatio = order.couponDiscount / order.originalAmount;
                const itemTotal = item.finalPrice * item.quantity;
                // const itemDiscount = itemTotal * discountRatio;
                const tax = item.finalPrice * 0.05
                const refundAmount = itemTotal - item.couponDiscount + tax;

                console.log("refund: ", refundAmount);

                const userId = req.user._id;
                await creditWallet(userId, refundAmount, `Refund for returned product`);
                order.refundAmount = (order.refundAmount || 0) + refundAmount;
                await order.save();
            } else {
                req.session.message = `can not change the product status to ${status} until you accept the return request from user.`
                req.session.type = "error";
                return res.redirect(`/admin/orderDetails/${item.order_id}`);
            }

        } else {
            req.session.message = "This status cannot be changed.";
            req.session.type = "error";
            return res.redirect(`/admin/orderDetails/${item.order_id}`);
        }

        const orderItems = await OrderItem.find({ order_id: item.order_id });
        const newOrderStatus = calculateOrderStatus(orderItems);

        await Order.findByIdAndUpdate(item.order_id, {
            status: newOrderStatus
        });

        req.session.message = "Product status has been changed successfully";
        req.session.type = "success";

        res.redirect(`/admin/orderDetails/${item.order_id}`);

    } catch (error) {
        console.log(error);
        res.status(500).send("Server Error");
    }
}

const returnAcceptOrReject = async (req, res) => {

    const { action } = req.body;

    const orderItemId = req.params.id;
    const item = await OrderItem.findById(orderItemId);

    if (!item) {
        console.log("No item found for id:", orderItemId);
        return res.status(404).json({ error: "Item not found" });
    }

    if (!action) {
        return res.status(404).json({ error: "No action found" });
    }

    if (action === "acceptReturn") {
        item.returnAccepted = true;
        item.returnRejected = false;

    } else {

        item.returnAccepted = false;
        item.returnRejected = true;
    }

    await item.save();  // ✅ IMPORTANT

    req.session.message = action === "acceptReturn"
        ? "Return request accepted successfully"
        : "Return request rejected successfully";

    req.session.type = "success";

    res.redirect(`/admin/orderDetails/${item.order_id}`);



}

module.exports = {
    getOrders,
    fetchOrders,
    getOrderDetails,
    //updateOrderStatus,
    updateProductStatus,
    returnAcceptOrReject
}