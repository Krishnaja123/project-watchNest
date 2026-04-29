const Offer = require("../models/offerModel");

const getOffer = async (product, price, today = new Date()) => {
    const offers = await Offer.find({
        is_delete: false,
        startDate: { $lte: today },
        endDate: { $gte: today }
    });

    let bestDiscount = 0;

    offers.forEach((data) => {
        let isApplicable = false;

        // Product offer
        if (
            data.offerType === "product" &&
            data.product_id?.includes(product._id)
        ) {
            isApplicable = true;
        }

        // Category offer
        if (
            data.offerType === "category" &&
            data.category_id?.includes(product.cat_id)
        ) {
            isApplicable = true;
        }

        if (isApplicable) {
            let discount = 0;

            if (data.discountType === "percentage") {
                discount = (price * data.discountValue) / 100;
            } 

            if (discount > bestDiscount) {
                bestDiscount = discount;
            }
        }
    });

    return bestDiscount;
};

module.exports = { getOffer };