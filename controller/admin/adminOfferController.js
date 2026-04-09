const Offer = require("../../models/offerModel");
const Product = require("../../models/productModel");
const Category = require("../../models/categoryModel");

const loadCreateOfferPage = async (req, res) => {
    try {
        const products = await Product.find();
        const categories = await Category.find();

        res.render("admin/addOffer", {
            products,
            categories
        });
    } catch (error) {
        console.log("server error", error);
        res.status(500).send(error)

    }
};

// const fetchCoupons = async (req, res) => {
//     try {
//         const offers = awiat Offer.find({
//             name: {$regex: search, $options: "i"},
//             is_delete: false
//         })
//     } catch (error) {
//         console.log("server error", error);
//         res.status(500).send(error)
//     }
// }

module.exports = {
    loadCreateOfferPage,
    // fetchCoupons,


}