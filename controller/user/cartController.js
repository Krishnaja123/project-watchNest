const Cart = require("../../models/cartModel");
const CartItem = require("../../models/cartItemsModel");
const Product = require("../../models/productModel");
const { getSessionMessage } = require("../../utils/sessionHelper");

// const getCart = async (req, res) => {
//     try {
//         const { message, type } = getSessionMessage(req);

//         const userId = req.session.user.id;
//         const userCart = await Cart.findOne({
//             user_id: userId,
//             is_active: true
//         });

//         if (!userCart) {
//             return res.render("user/cart", {
//                 message,
//                 type,
//                 cart: null,
//                 cartItems: [],
//                 total: 0
//             });
//         }

//         const userCartItems = await CartItem
//             .find({ cart_id: userCart._id })
//             .populate("product_id");


//         const validCartItems = userCartItems.filter(item => {
//             const variant = item.product_id.variants.id(item.variant_id);
//             console.log(variant);

//             return variant.view === true && variant.stock > 0;
//         });

//         if (validCartItems.length !== userCartItems.length) {
//             req.session.message = "Some of the cart items gone to out of stock or currenly not available";
//             req.session.error = "error";
//         }

//         // console.log("userCartItems: ", userCartItems);

//         let total = 0;

//         const items = validCartItems.map(item => {
//             const product = item.product_id;
//             const variant = product.variants.id(item.variant_id);
//             // const subTotal = variant.price * item.quantity;
//             const subTotal = item.price * item.quantity;
//             total += subTotal;

//             return {
//                 _id: item._id,
//                 name: product.name,
//                 image: variant.images?.[0],
//                 quantity: item.quantity,
//                 // price: variant.price,
//                 price: item.price,
//                 subTotal
//             };
//         });

//         res.render("user/cart", {
//             message,
//             type,
//             cart: userCart,
//             cartItems: items,
//             total
//         });

//     } catch (error) {
//         console.error(error);
//         res.status(500).send("Something went wrong");
//     }
// };


const getCart = async (req, res) => {
    try {

        const { message, type } = getSessionMessage(req);

        const userId = req.session.user.id;

        const userCart = await Cart.findOne({
            user_id: userId,
            is_active: true
        });

        if (!userCart) {
            return res.render("user/cart", {
                message,
                type,
                cart: null,
                cartItems: [],
                total: 0
            });
        }

        const userCartItems = await CartItem
            .find({ cart_id: userCart._id })
            .populate("product_id");

        const validCartItems = [];
        const invalidItemIds = [];

        for (const item of userCartItems) {

            const product = item.product_id;
            const variant = product?.variants?.id(item.variant_id);

            if (!variant || !variant.view || variant.stock <= 0) {
                invalidItemIds.push(item._id);
                continue;
            }

            validCartItems.push(item);
        }

        if (invalidItemIds.length > 0) {

            await CartItem.deleteMany({
                _id: { $in: invalidItemIds }
            });

            req.session.message = "Some items were removed because they are unavailable";
            req.session.type = "error";
        }

        let total = 0;

        const items = validCartItems.map(item => {

            const product = item.product_id;
            const variant = product.variants.id(item.variant_id);

            const subTotal = item.price * item.quantity;

            total += subTotal;

            return {
                _id: item._id,
                name: product.name,
                image: variant.images?.[0],
                quantity: item.quantity,
                price: item.price,
                subTotal
            };

        });

        res.render("user/cart", {
            message,
            type,
            cart: userCart,
            cartItems: items,
            total
        });

    } catch (error) {

        console.error(error);
        res.status(500).send("Something went wrong");

    }
};

const addToCart = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { productId, variantId } = req.body;

        if (!productId || !variantId) {
            return res.json({ success: false, message: "Invalid data" });
        }

        const product = await Product.findById(productId);

        if (!product) {
            return res.json({ success: false, message: "Product not available" });
        }

        const variant = product.variants.id(variantId);

        if (!variant) {
            return res.json({ success: false, message: "Variant not available" });
        }

        if (variant.stock <= 0) {
            return res.json({ success: false, message: "Product is Out of stock" });
        }

        const price = variant.price;

        console.log("productId123: ", productId);
        console.log("variantId: ", variantId);


        let cart = await Cart.findOne({ user_id: userId, is_active: true });

        if (!cart) {
            cart = new Cart({
                user_id: userId,
                is_active: true
            });
            await cart.save();
        }
        let item = await CartItem.findOne({
            cart_id: cart._id,
            product_id: productId,
            variant_id: variantId,
        });

        if (item) {
            if (variant.stock <= item.quantity) {

                return res.json({ success: false, message: 'Cannot add more items. Stock limit reached.' });

            } else if (variant.maxPurchaseQty <= item.quantity) {

                return res.json({ success: false, message: 'Cannot add more items. Reached maximum purchase quantity' });

            } else {
                item.quantity += 1;
                await item.save();
            }
        } else {
            item = new CartItem({
                cart_id: cart._id,
                product_id: productId,
                variant_id: variantId,
                quantity: 1,
                price: price
            });
            await item.save();
        }

        return res.json({ success: true, message: "Product added to cart" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false });
    }
}

const updateCartQuantity = async (req, res) => {
    try {
        const itemId = req.params.id;
        const { action } = req.body;

        const cartItem = await CartItem.findById(itemId)
            .populate("product_id");

        if (!cartItem) {
            req.session.message = "Cart item not found.";
            req.session.type = "error";
            return res.redirect("/cart");
        }

        const product = cartItem.product_id;

        if (!product || product.is_delete === true) {
            req.session.message = "Product no longer available";
            req.session.type = "error";
            await CartItem.findByIdAndDelete(itemId);
            return res.redirect("/cart");
        }

        const variant = product.variants.id(cartItem.variant_id);

        if (!variant || variant.view === false) {
            req.session.message = "Selected variant is no longer available.";
            req.session.type = "error";
            await CartItem.findByIdAndDelete(itemId);
            return res.redirect("/cart");
        }

        let newQuantity = cartItem.quantity;

        if (action === "increase") {
            if (cartItem.quantity >= variant.stock) {
                req.session.message = "No more stock available.";
                req.session.type = "error";
                return res.redirect("/cart");
            }

            const maxLimit = variant.maxPurchaseQty;
            if (cartItem.quantity >= variant.maxPurchaseQty) {
                req.session.message = `Maximum ${maxLimit} items allowed for this product`;
                req.session.type = "error";
                return res.redirect("/cart");
            }
            newQuantity += 1;

        } else if (action === "decrease") {

            if (cartItem.quantity > 1) {
                newQuantity -= 1;
            }
        }

        cartItem.quantity = newQuantity;
        await cartItem.save();

        req.session.message = "Cart updated successfully.";
        req.session.type = "success";

        res.redirect("/cart");

    } catch (error) {
        req.session.message = "Something went wrong.";
        req.session.type = "error";
        res.redirect("/cart");
    }
}

const deleteItem = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const itemId = req.params.id;

        const cart = await Cart.findOne({
            user_id: userId,
            is_active: true
        });

        if (!cart) {
            req.session.message = "Cart not found.";
            req.session.type = "error";
            return res.redirect("/cart");
        }

        const item = await CartItem.findOne({
            _id: itemId,
            cart_id: cart._id
        });

        if (!item) {
            req.session.message = "Item not found in your cart.";
            req.session.type = "error";
            return res.redirect("/cart");
        }

        const deleteResult = await CartItem.findByIdAndDelete(itemId);

        if (!deleteResult) {
            req.session.message = "Couldnt delete the item from cart.";
            req.session.type = "error";
            res.redirect("/cart");
        }

        req.session.message = "Item removed from cart.";
        req.session.type = "success";

        res.redirect("/cart");

    } catch (error) {
        req.session.message = "Something went wrong.";
        req.session.type = "error";
        res.redirect("/cart");
    }
}

module.exports = {
    getCart,
    addToCart,
    updateCartQuantity,
    deleteItem
}
