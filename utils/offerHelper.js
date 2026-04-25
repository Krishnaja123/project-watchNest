const applyBestOfferToVariant = (variant, offers) => {

    const price = parseFloat(variant.price.toString());

    let bestDiscount = 0;

    offers.forEach(offer => {
        let discount = 0;

        if (offer.discountType === "percentage") {
            discount = (price * offer.discountValue) / 100;
        } else {
            discount = offer.discountValue;
        }

        if (discount > bestDiscount) {
            bestDiscount = discount;
        }
    });

    const finalPrice = price - bestDiscount;

    return {
        originalPrice: price,
        discount: Math.round(bestDiscount),
        finalPrice: Math.max(Math.round(finalPrice), 0)
    };
};

module.exports = { applyBestOfferToVariant };