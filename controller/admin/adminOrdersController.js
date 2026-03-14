const mongoose = require("mongoose");
const Order = require("../../models/orderModel");
const OrderItem = require("../../models/orderItemsModel");

const  { calculateOrderStatus } = require("../../utils/orderStatusHelper");
const { getSessionMessage } = require("../../utils/sessionHelper");
const Product = require("../../models/productModel");

const getOrders = async (req, res) => {
    try {
        const { message, type } = getSessionMessage(req);

        let page = parseInt(req.query.page) || 1;

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

        if (item.status === "processing") {

            item.status = status;
            await item.save();

            if(status === "cancelled") {
                const product = await Product.findById(item.product_id);
                const variant = product?.variants?.id(item.variant_id);
                variant.stock += item.quantity;
                await product.save();
            }

        } else if (item.status === "shipped") {
            if(status !== "delivered") {
                req.session.message = `can not change the product status to ${status} as its allreay shipped.`;
            req.session.type = "error";
            return res.redirect(`/admin/orderDetails/${item.order_id}`);
            }
            item.status = status;
            await item.save();
        } else {
            req.session.message = "This status cannot be changed.";
            req.session.type = "error";
            return res.redirect(`/admin/orderDetails/${item.order_id}`);
        }

        const orderItems = await OrderItem.find({ order_id : item.order_id });
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


module.exports = {
    getOrders,
    fetchOrders,
    getOrderDetails,
    //updateOrderStatus,
    updateProductStatus
}