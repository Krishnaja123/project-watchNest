const Wishlist = require("../../models/wishlistModel");
const Cart = require("../../models/cartModel");
const CartItem = require("../../models/cartItemsModel");
const Product = require("../../models/productModel");

const { getSessionMessage } = require("../../utils/sessionHelper");

const STATUS_CODES = require("../../constants/statusCodes");
const MESSAGES = require("../../constants/messages");

const getWishlist = async (req, res) => {
    try {
        const { message, type } = getSessionMessage(req);
        const userId = req.user._id;

        const wishlist = await Wishlist.findOne({
            user_id: userId,
        }).populate({
            path: "products.product_id",
        });

        if (!wishlist) {
            return res.render("user/wishlist", {
                message,
                type,
                wishlist: null,
            });
        }

        const updatedProducts = wishlist.products.map(item => {
            const product = item.product_id;

            const variant = product?.variants?.find(v =>
                v._id.toString() === item.variant_id?.toString()
            );

            if (!variant) {
                console.log("❌ Missing variant for:", item.variant_id);
                return null;
            }

            return {
                ...item.toObject(),
                product,
                variant
            };
        }).filter(item => item !== null);

        wishlist.products = updatedProducts;

        console.log("wishlist: ", JSON.stringify(wishlist, null, 2));

        res.render("user/wishlist", {
            message,
            type,
            wishlist
        });

    } catch (error) {
        console.error(error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(MESSAGES.SERVER_ERROR);
    }
};

const toggleWishlist = async (req, res) => {
    try {
        const user_id = req.user._id;
        const { productId, variantId } = req.body;

        if (!productId || !variantId) {
            return res.json({ success: false, message: "Invalid data" });
        }

        // console.log(req.user._id, productId);

        let wishlist = await Wishlist.findOne({ user_id });

        if (!wishlist) {
            wishlist = new Wishlist({
                user_id,
                products: [{
                    product_id: productId,
                    variant_id: variantId
                }]
            });

            await wishlist.save();
            return res.json({ added: true });
        }

        const index = wishlist.products.findIndex(
            p => p.product_id.toString() === productId.toString() && p.variant_id.toString() === variantId.toString()
        );

        if (index < 0) {
            wishlist.products.push({
                product_id: productId,
                variant_id: variantId
            });
            await wishlist.save();
            return res.json({ added: true });
        } else {
            wishlist.products.splice(index, 1);
            await wishlist.save();
            return res.json({ added: false });
        }

    } catch (error) {
        console.log(error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false });
    }
}

const moveToCart = async (req, res) => {
    try {
        const userId = req.user._id;
        const { productId, variantId } = req.body;

        if (!productId || !variantId) {
            return res.json({ success: false, message: "Invalid data" });
        }

        let cart = await Cart.findOne({ user_id: userId, is_active: true });
        if (!cart) {
            cart = new Cart({
                user_id: userId,
                is_active: true
            });
            await cart.save();
        }

        const product = await Product.findById(productId);

        if (!product) {
            return res.json({ success: false, message: "Product not found" });
        }

        const variant = product.variants.id(variantId);
        if (!variant) {
            return res.json({ success: false, message: "Variant not found" });
        }

        if (variant.stock <= 0) {
            return res.json({ success: false, message: "Product is currently outof stock" });
        }

        const existingItem = await CartItem.findOne({
            cart_id: cart._id,
            product_id: productId,
            variant_id: variantId
        });

        if (!existingItem) {
            await new CartItem({
                cart_id: cart._id,
                product_id: productId,
                variant_id: variantId,
                quantity: 1,
                price: variant.price
            }).save();
        }

        const wishlist = await Wishlist.findOne({ user_id: userId });
        console.log("wishlistdelete: ", wishlist);

        if (wishlist) {

            console.log("hi");

            const wishlistItem = wishlist.products.find(p =>
                p.product_id.equals(productId) && p.variant_id.equals(variantId)
            );
            console.log("wishlistItem: ", wishlistItem);

            if (wishlistItem) {
                await Wishlist.updateOne(
                    { user_id: userId },
                    { $pull: { products: { _id: wishlistItem._id } } }
                );
            }
        }
        if (existingItem) {
            res.json({
                success: true,
                type: "info",
                message: "Product already available in cart"
            });

        } else {
            res.json({
                success: true,
                type: "success",
                message: "Moved to cart successfully"
            });
        }
    } catch (error) {
        console.error(error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false });
    }
};

const removeProduct = async (req, res) => {
    try {

        const userId = req.user._id;
        const { productId, variantId } = req.body;

        if (!productId || !variantId) {
            return res.json({ success: false, message: "Invalid data" });
        }

        const wishlist = await Wishlist.findOne({ user_id: userId });

        if (wishlist) {

            const wishlistItem = wishlist.products.find(p =>
                p.product_id.equals(productId) && p.variant_id.equals(variantId)
            );
            console.log("wishlistItem: ", wishlistItem);

            if (wishlistItem) {
                await Wishlist.updateOne(
                    { user_id: userId },
                    { $pull: { products: { _id: wishlistItem._id } } }
                );
            }
        }
        res.json({
            success: true,
            type: "success",
            message: "Product removed from wishlist"
        });
    } catch (error) {
        console.error(error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false });

    }
}
module.exports = {
    getWishlist,
    toggleWishlist,
    moveToCart,
    removeProduct
}