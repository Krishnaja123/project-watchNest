const Cart = require("../../models/cartModel");
const Coupon = require("../../models/couponSchema");

const applyCoupon = async (req, res) => {
    try {
        const { code } = req.body;
        const userId = req.user._id;

        const cart = await Cart.findOne({ user_id: userId }).populate("items.product");

        if (!cart) return res.json({ success: false, message: "Cart not found" });

        if (cart.appliedCoupon) {
            return res.json({ success: false, message: "Coupon already applied" });
        }

        const coupon = await Coupon.findOne({ code, isActive: true });

        if (!coupon) {
            return res.json({ success: false, message: "Invalid coupon" });
        }

        if (coupon.expiryDate < new Date()) {
            return res.json({ success: false, message: "Coupon expired" });
        }

        const total = cart.totalPrice;

        if (total < coupon.minAmount) {
            return res.json({ success: false, message: "Minimum amount not reached" });
        }

        let discount = 0;

        if (coupon.discountType === "percentage") {
            discount = (total * coupon.discountValue) / 100;

            if (coupon.maxDiscount) {
                discount = Math.min(discount, coupon.maxDiscount);
            }
        } else {
            discount = coupon.discountValue;
        }

        cart.appliedCoupon = coupon._id;
        cart.discountAmount = discount;
        cart.finalAmount = total - discount;

        await cart.save();

        res.json({
            success: true,
            discount,
            finalAmount: cart.finalAmount
        });

    } catch (err) {
        console.log(err);
        res.json({ success: false, message: "Error applying coupon" });
    }
};