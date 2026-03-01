const Cart = require("../models/cartModel");
const CartItem = require("../models/cartItemsModel");

const getCartCount = async (userId) => {
    
        if(!userId) return 0;

        const cart = await Cart.findOne({ 
            user_id: userId, 
            is_active: true 
        })
    
        if(!cart) return 0;
         
        const cartItems = await CartItem.find({
            cart_id: cart._id,
        });

        totalquantity = cartItems.reduce((total, item) => {
            return total + item.quantity;
        },0)

        return totalquantity;
}

module.exports = {
    getCartCount
}