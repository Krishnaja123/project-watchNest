const Cart = require("../../models/cartModel");
const CartItem = require("../../models/cartItemsModel");
const Address = require("../../models/addressModel");
const User = require("../../models/userModel");
const Order = require("../../models/orderModel");
const OrderItem = require("../../models/orderItemsModel");
const Product = require("../../models/productModel");

const { getSessionMessage } = require("../../utils/sessionHelper");
const { calculateOrderStatus } = require("../../utils/orderStatusHelper");
const { createOrderService } = require("../../services/createOrderService");

const createOrder = async (req, res) => {
    try {
        console.log("hit the controller");
        console.log("req.session.user: ", req.session.user);

        const userId = req.session.user.id;
        const user = await User.findById(userId);


        const { selectedAddressId, paymentMethod } = req.body;
        let paymentStatus = "pending"
        
        const order = await createOrderService(
            userId,
            selectedAddressId,
            paymentMethod,
            paymentStatus
        );

         return res.redirect(`/order/success/${order._id}`);

        // return res.render('user/order-success', {
        //     orderId: order.orderId
        // });

    } catch (error) {

        req.session.message = error.message;
        req.session.type = "error";

        return res.redirect("/checkout");
    }
}

const orderSuccess = async (req, res) => {
    try {
        const orderId = req.params.id;

        console.log("orderID: ", orderId);
        

        const order = await Order.findById(orderId);

        return res.render('user/order-success', {
            orderId: order.orderId
        });

    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");

    }
}

const getOrders = async (req, res) => {

    try {
        const { message, type } = getSessionMessage(req);

        const userId = req.session.user.id;

        const user = await User.findById(userId);

        const search = req.query.search || "";
        const page = parseInt(req.query.page) || 1;
        const limit = 7;
        const skip = (page - 1) * limit;

        let filter = {
            user_id: userId,
            orderId: { $regex: search, $options: "i" }
        }

        const totalOrders = await Order.countDocuments(filter);

        const orders = await Order.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const orderIds = orders.map(order => order._id);

        const orderItems = await OrderItem.find({ order_id: { $in: orderIds } });

        return res.render("user/orders", {
            user,
            message,
            type,
            orders,
            orderItems,
            currentPage: page,
            totalPages: Math.ceil(totalOrders / limit),
            search
        });

    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");

    }

}

const getOrderDetails = async (req, res) => {

    try {
        const { message, type } = getSessionMessage(req);

        const orderId = req.params.id;
        const userId = req.session.user.id;

        if (!userId) {
            req.session.message = "User is not authorized to access orders. Please login";
            req.session.type = "error";
            return res.redirect("/login");
        };

        const user = await User.findById(userId);

        const order = await Order.findById(orderId);

        if (!order) {
            req.session.message = "This order deatails are not available in db";
            req.session.type = "error";
            return res.redirect("/orders");
        };
        const orderItems = await OrderItem.find({ order_id: orderId });

        return res.render("user/orderDetails", {
            user,
            order,
            orderItems,
            message,
            type
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");

    }

}

const getOrderInvoice = async (req, res) => {
    try {
        const orderId = req.params.id;

        const order = await Order.findById(orderId);

        if (!order) {
            req.session.message = "This order deatails are not available in db";
            req.session.type = "error";
            return res.redirect("/orders");
        };
        const orderItems = await OrderItem.find({ order_id: orderId });
        return res.render("user/orderInvoice", {
            order,
            orderItems,
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
}

const cancelProduct = async (req, res) => {
    try {
        console.log("hi");

        const orderItemId = req.params.id;

        const item = await OrderItem.findById(orderItemId);
        console.log("item: ", item);
        if (!item) {
            console.log("No item found for id:", orderItemId);
            return res.status(404).json({ error: "Item not found" });
        }

        if (item.status != "processing") {
            req.session.message = "This order cannot be cancelled";
            req.session.type = "error";
            return res.redirect("/orders");
        }

        item.status = "cancelled";
        item.cancelReason = req.body.cancelReason;
        item.save();

        const product = await Product.findById(item.product_id);
        console.log("product: ", product);

        const variant = product?.variants?.id(item.variant_id);
        variant.stock += item.quantity;

        product.save();

        const orderItems = await OrderItem.find({ order_id: item.order_id });
        const newOrderStatus = calculateOrderStatus(orderItems);

        await Order.findByIdAndUpdate(item.order_id, {
            status: newOrderStatus
        });

        req.session.message = "Product cancelled successfully";
        req.session.type = "success";

        res.redirect('/orders');

    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
}

const cancelOrder = async (req, res) => {
    try {
        const { message, type } = getSessionMessage(req);

        const orderId = req.params.id;
        console.log("orderId: ", orderId)

        const { cancelReason } = req.body;

        const order = await Order.findOne({ orderId });

        if (!order) {
            console.log("No order found for id:", orderId);
            return res.status(404).json({ error: "Item not found" });
        };

        if (order.status === "shipped" || order.status === "delivered") {
            req.session.message = "This order cannot be cancelled";
            req.session.type = "error";
            return res.redirect("/orders");
        };

        order.status = "cancelled";
        order.cancelReason = cancelReason;
        await order.save();

        const orderItems = await OrderItem.find({ order_id: order._id })
            .populate("product_id");

        for (let item of orderItems) {

            item.status = "cancelled";

            const variant = item.product_id?.variants?.id(item.variant_id);

            if (variant) {
                variant.stock += item.quantity;
            }

            await item.save();
            await item.product_id.save();
        }

        req.session.message = "Order cancelled successfully";
        req.session.type = "success";

        res.redirect('/orders');

    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
}

// const returnProduct = async (req, res) => {
//     try {
//          console.log("hi");

//         const returnItemId = req.params.id;

//         const item = await OrderItem.findById(returnItemId);
//         console.log("item: ", item);
//         if (!item) {
//             console.log("No item found for id:", returnItemId);
//             return res.status(404).json({ error: "Item not found" });
//         }

//         if (item.status != "delivered") {
//             req.session.message = "This order cannot be returned";
//             req.session.type = "error";
//             return res.redirect("/orders");
//         }

//         item.status = "returned";
//         item.returnReason = req.body.returnReason;
//         item.save();

//         const product = await Product.findById(item.product_id);
//         console.log("product: ", product);

//         const variant = product?.variants?.id(item.variant_id);
//         variant.stock += item.quantity;

//         product.save();

//         const orderItems = await OrderItem.find({ order_id: item.order_id });
//         const newOrderStatus = calculateOrderStatus(orderItems);

//         await Order.findByIdAndUpdate(item.order_id, {
//             status: newOrderStatus
//         });

//         req.session.message = "Product cancelled successfully";
//         req.session.type = "success";

//         res.redirect('/orders');
        
//     } catch (error) {
//       console.error(error);
//         res.status(500).send("Internal Server Error");  
//     }
// }



module.exports = {
    createOrder,
    orderSuccess,
    getOrders,
    getOrderDetails,
    getOrderInvoice,
    cancelProduct,
    cancelOrder,
   // returnProduct
    
}