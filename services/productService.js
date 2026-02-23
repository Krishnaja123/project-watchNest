const mongoose = require("mongoose");
const Product = require("../models/productModel");

async function getPaginatedProducts(query) {
    const page = parseInt(query.page) || 1;
    const limit = 8;
    const skip = (page - 1) * limit;

    let filter = { is_delete: false };

    const categoryIds = (query.category || "")
    .split(",")
    .filter(id => id)
    .map(id => new mongoose.Types.ObjectId(id));

if (categoryIds.length > 0) {
    filter.cat_id = { $in: categoryIds };
}
    const brandIds = (query.brand || "")
    .split(",")
    .filter(id => id)
    .map(id => new mongoose.Types.ObjectId(id));

if (brandIds.length > 0) {
    filter.brand_id = { $in: brandIds };
}

    let sortOption = { created_at: -1 };

    if(query.sort === "low-high"){
        sortOption = { "variants.price": 1};
    } else if(query.sort === "high-low"){
        sortOption = { "variants.price": -1};
    }
    const pipeline = [
        { $match: filter },
        { $unwind: "$variants" },
        { $match: { "variants.view": true } }
    ];

    if(query.minPrice || query.maxPrice) {
        let priceFilter = {};

        if(query.minPrice) {
            priceFilter.$gte = Number(query.minPrice);
        }
        if(query.maxPrice) {
            priceFilter.$lte = Number(query.maxPrice);
        }
        pipeline.push({
            $match: { "variants.price": priceFilter}
        });
    }
    const countPipeline = [...pipeline];

    pipeline.push({
        $lookup: {
            from: "brands",
            localField: "brand_id",
            foreignField: "_id",
            as: "brand"
        }
    },
    { $unwind: "$brand" },
    { $sort: sortOption },
    { $skip: skip },
    { $limit: limit }
);
const variants = await Product.aggregate(pipeline);

const totalDocs = await Product.aggregate([
    ...countPipeline,
    { $count: "total" }
]);

const totalVariants = totalDocs.length > 0 ? totalDocs[0].total : 0;
const totalPages = Math.ceil(totalVariants / limit);

return { 
    variants, 
    currentPage: page,
    totalPages
};
}

module.exports = { 
    getPaginatedProducts,
}
