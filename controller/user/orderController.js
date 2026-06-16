const Cart = require("../../models/cartModel");
const CartItem = require("../../models/cartItemsModel");
const Address = require("../../models/addressModel");
const User = require("../../models/userModel");
const Order = require("../../models/orderModel");
const OrderItem = require("../../models/orderItemsModel");
const Product = require("../../models/productModel");
const Coupon = require("../../models/couponSchema");

const { getSessionMessage } = require("../../utils/sessionHelper");
const { calculateOrderStatus } = require("../../utils/orderStatusHelper");
const { createOrderService } = require("../../services/createOrderService");
const { creditWallet } = require("../../services/walletServices");
const { getOffer } = require("../../services/offerService");

const STATUS_CODES = require("../../constants/statusCodes");
const MESSAGES = require("../../constants/messages");
const PAYMENT_STATUS = require("../../constants/paymentStatus");

const createOrder = async (req, res) => {
    try {
        console.log("hit the controller");
        console.log("req.user: ", req.user);

        const userId = req.user._id;

        const { selectedAddressId, paymentMethod, couponCode, discount } = req.body;

        console.log("coupon code: ", couponCode);

        let paymentStatus = "pending";

        const order = await createOrderService(
            userId,
            selectedAddressId,
            paymentMethod,
            paymentStatus,
            couponCode
        );

        if (couponCode) {
            console.log("hi");

            const coupon = await Coupon.findOne({ code: couponCode });
            coupon.usageCount += 1;
            coupon.usedBy.push(userId);
            await coupon.save();
        }

        return res.json({
            success: true,
            orderId: order.orderId
        });

    } catch (error) {
        console.error(error);

        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: error.message
        });
    }
}

const orderSuccess = async (req, res) => {
    try {
        const orderId = req.params.id;

        console.log("orderID: ", orderId);


        const order = await Order.findOne({ orderId });

        return res.render('user/order-success', {
            orderId: order.orderId
        });

    } catch (error) {
        console.error(error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(MESSAGES.SERVER_ERROR);

    }
}

const getOrders = async (req, res) => {

    try {
        const { message, type } = getSessionMessage(req);

        const userId = req.user._id;

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

        console.log("orders: ", orders);


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
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(MESSAGES.INTERNAL_SERVER_ERROR);

    }

}

const getOrderDetails = async (req, res) => {

    try {
        const { message, type } = getSessionMessage(req);

        const orderId = req.params.id;
        const userId = req.user._id;

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
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(MESSAGES.SERVER_ERROR);

    }

}

const getOrderInvoice = async (req, res) => {
    try {
        const orderId = req.params.id;

        const order = await Order.findOne({ _id: orderId, 
            user_id: req.user._id,
            paymentStatus: { $ne: "failed" },
            status: { $ne: "cancelled" } });

        if (!order) {
            req.session.message = "This order deatails are not available in db";
            req.session.type = "error";
            return res.redirect("/orders");
        };
        // const orderItems = await OrderItem.find({ order_id: orderId,  });

        const orderItems = await OrderItem.find({
            order_id: orderId,
            status: {  $nin: ["cancelled"] },
            paymentStatus: { $in: ["paid", "pending"] }
        });

        const tax = orderItems.reduce((tax, item) => {
            const itemTax = item.finalPrice * item.quantity * 0.05;
            return tax += itemTax;
        },0);

        const refundAmount = orderItems.reduce((refund, item) => {
            if(item.status === "returned") {
                const itemTotal = item.finalPrice * item.quantity;
                const itemTax = itemTotal * 0.05;
                refund += itemTotal - item.couponDiscount + itemTax;
            }
            return refund;
        },0);

        const discount = orderItems.reduce((discount, item) => {
            return discount += item.couponDiscount * item.quantity;
        },0);

        // console.log("tax: ", tax);
        
        const subTotal = orderItems.reduce((total, item) => {
            return total += item.finalPrice * item.quantity;
        },0);

        return res.render("user/orderInvoice", {
            order,
            orderItems,
            tax,
            discount, 
            subTotal,
            refundAmount
        });
    } catch (error) {
        console.error(error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(MESSAGES.SERVER_ERROR);
    }
}

const cancelProduct = async (req, res) => {
    try {
        const orderItemId = req.params.id;

        const { reason } = req.body;

        console.log("hi ");

        console.log("reason: ", reason);

        if (!reason || !reason.trim()) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({
                success: false,
                message: "Cancellation reason is required"
            });
        }

        const item = await OrderItem.findById(orderItemId);
        console.log("item: ", item);
        if (!item) {
            console.log("No item found for id:", orderItemId);
            return res.status(STATUS_CODES.NOT_FOUND).json({ error: "Item not found" });
        }

        if (item.status != "processing") {
            req.session.message = "This order cannot be cancelled";
            req.session.type = "error";
            return res.redirect("/orders");
        }

        item.status = "cancelled";
        item.cancelReason = reason;
        await item.save();

        const order = await Order.findOne({ _id: item.order_id });
        if (order.paymentMethod !== "COD" && order.paymentStatus === "paid") {
            const userId = req.user._id;

            // const discountRatio = order.couponDiscount / order.originalAmount;

            const itemTotal = item.finalPrice * item.quantity;
            console.log(item.finalPrice);

            // const itemDiscount = itemTotal * discountRatio;
            const tax = item.finalPrice * 0.05
            const refundAmount = itemTotal - item.couponDiscount + tax;

            console.log("refund: ", refundAmount);

            // const amount = item.price * item.quantity;
            await creditWallet(userId, refundAmount, `Refund for cancelled product`);

            order.refundAmount = (order.refundAmount || 0) + refundAmount;
            await order.save();

            console.log("hi");

        }
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
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(MESSAGES.SERVER_ERROR);
    }
}

const cancelOrder = async (req, res) => {
    try {

        const order_id = req.params.id;
        console.log("orderId: ", order_id)

        const { from, reason } = req.body;

        console.log("reason: ", reason);


        if (!reason || !reason.trim()) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({
                success: false,
                message: "Cancellation reason is required"
            });
        }

        const order = await Order.findById(order_id);

        if (!order) {
            console.log("No order found for id:", order_id);
            return res.status(STATUS_CODES.NOT_FOUND).json({ error: "Item not found" });
        };

        if (order.status === "shipped" || order.status === "delivered") {
            req.session.message = "This order cannot be cancelled";
            req.session.type = "error";
            return res.redirect("/orders");
        };

        order.status = "cancelled";
        order.cancelReason = reason;
        await order.save();

        if (order.paymentMethod !== "COD" && order.paymentStatus === "paid") {
            const userId = req.user._id;

            const refundAmount = order.totalAmount;

            console.log("refund: ", refundAmount);

            await creditWallet(userId, refundAmount, `Refund for cancelled order`);
            console.log("hi");

        }

        const orderItems = await OrderItem.find({ order_id })
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

        if (from === "/orders") {
            res.redirect('/orders');
        }

        if (from === "/order-details") {
            res.redirect(`/orders/${order_id}`);
        }

    } catch (error) {
        console.error(error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(MESSAGES.SERVER_ERROR);
    }
}

const productReturnRequest = async (req, res) => {
    try {
        console.log("hi");

        const itemId = req.params.id;

        const { reason } = req.body;

        if (!reason || !reason.trim()) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({
                success: false,
                message: "Cancellation reason is required"
            });
        }

        const item = await OrderItem.findById(itemId);
        console.log("item: ", item);

        if (!item) {
            console.log("No item found for id:", itemId);
            return res.status(statusbar.NOT_FOUND).json({ error: "Item not found" });
        }

        if (item.status != "delivered") {
            req.session.message = "This order cannot be returned";
            req.session.type = "error";
            return res.redirect("/orders");
        }

        // item.status = "returned";
        item.returnRequested = true;
        item.returnReason = reason;
        item.save();

        // const product = await Product.findById(item.product_id);
        // console.log("product: ", product);

        // const variant = product?.variants?.id(item.variant_id);
        // variant.stock += item.quantity;

        // product.save();

        // const orderItems = await OrderItem.find({ order_id: item.order_id });
        // const newOrderStatus = calculateOrderStatus(orderItems);

        // await Order.findByIdAndUpdate(item.order_id, {
        //     status: newOrderStatus
        // });

        req.session.message = "Return requestd successfully";
        req.session.type = "success";

        res.redirect('/orders');

    } catch (error) {
        console.error(error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(MESSAGES.SERVER_ERROR);
    }
}

const showCoupons = async (req, res) => {
    try {
        const cartTotal = Number(req.query.cartTotal) || 0;

        const coupons = await Coupon.find({ is_delete: false, isActive: true, })
            .sort({ createdAt: -1 });

        res.render("user/coupons", {
            coupons,
            cartTotal
        });

    } catch (error) {
        console.error(error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(MESSAFES.SERVER_ERROR);
    }
};

const applyCoupon = async (req, res) => {
    try {
        const { code } = req.body;
        const userId = req.user?._id;

        if (!userId) return res.json({ success: false, message: "Login first to apply coupon." });

        const cart = await Cart.findOne({ user_id: userId, is_active: true });
        const cartItems = await CartItem.find({ cart_id: cart._id });
        if (!cart || cartItems.length === 0)
            return res.json({ success: false, message: "Cart is empty!" });

        const coupon = await Coupon.findOne({ code: code.toUpperCase() });
        if (!coupon) return res.json({ success: false, message: "Invalid Coupon!" });

        //const cartTotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

        let cartTotal = 0;

        for (const item of cartItems) {
            const product = await item.populate("product_id");

            const variant = product.product_id.variants.find(
                v => v._id.toString() === item.variant_id.toString()
            );

            if (!variant) continue;

            const bestDiscount = await getOffer(product.product_id, variant.price);
            const finalPrice = variant.price - bestDiscount;

            cartTotal += finalPrice * item.quantity;
        }

        if (cartTotal < coupon.minAmount)
            return res.json({ success: false, message: `Add ₹${coupon.minAmount - cartTotal} more to use this coupon.` });

        if (coupon.expiryDate < Date.now())
            return res.json({ success: false, message: "Coupon expired!" });

        if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
            return res.json({ success: false, message: "Coupon usage limit reached" });
        }

        const alreadyUsed = coupon.usedBy.some(
            id => id.toString() === userId.toString()
        );

        console.log("alreadyUsed: ", alreadyUsed);


        if (alreadyUsed) {
            return res.json({ success: false, message: "You already used this coupon" });
        }

        let discount = 0;
        if (coupon.discountType === 'percentage') {
            let couponDiscount = Math.round((cartTotal * coupon.discountValue) / 100);
            discount = Math.min(couponDiscount, coupon.maxDiscount);
        } else {
            discount = coupon.discountValue;
        }

        const shippingCharge = 50;
        const tax = Math.round(cartTotal * 0.05);
        const finalTotal = cartTotal - discount + shippingCharge + tax;

        req.session.appliedCoupon = {
            code: coupon.code,
            discount: discount,
            finalTotal: finalTotal
        };

        return res.json({
            success: true,
            discount: discount,
            finalTotal: finalTotal
        });

    } catch (error) {
        console.error(error);
        return res.json({ success: false, message: "Server error!" });
    }
}


module.exports = {
    createOrder,
    orderSuccess,
    getOrders,
    getOrderDetails,
    getOrderInvoice,
    cancelProduct,
    cancelOrder,
    productReturnRequest,
    showCoupons,
    applyCoupon

}