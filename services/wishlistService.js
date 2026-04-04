const Wishlist = require("../models/wishlistModel");

const getWishlistCount = async (userId) => {
    
        if(!userId) return 0;

        const wishlist = await Wishlist.findOne({ 
            user_id: userId, 
        })
    
        if(!wishlist) return 0;
         
        const wishlistCount = wishlist.products.length;

        return wishlistCount;
}

module.exports = {
    getWishlistCount
}