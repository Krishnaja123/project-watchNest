const mongoose = require("mongoose");
const Product = require("../../models/productModel");
const Category = require("../../models/categoryModel");
const Brand = require("../../models/brandModel");


const loadHomePage = async (req, res) => {
    try {

        let message = req.session.message || "";
        req.session.message = "";
        let type = req.session.type || "";
        req.session.type = "";

        const products = await Product.find({
            is_delete: false,
            variants: { $elemMatch: { view: true, stock: { $gt: 0 } } }
        })
            .sort({ created_at: -1 })
            .populate("brand_id", "name")
            .limit(4)
            .select("name variants brand_id");
        //console.log(product);

        const showData = products.map(product => {
            const viewedProducts = product.variants.filter(variant => variant.view === true && variant.stock > 0);
            console.log("viewedProducts: ", viewedProducts);
            const firstVariant = viewedProducts?.[0];
            return {
                productId: product._id,
                name: product.name,
                brand: product.brand_id?.name,
                price: firstVariant?.price || 0,
                image: firstVariant?.images?.[0],
                variantId: firstVariant?._id
            }
        });

        return res.render("user/home", {
            message,
            type,
            title: "Home",
            showData,
            hideNavBar: false,
        });
        // console.log(req.session.message);
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
}

const loadShowPage = async (req, res) => {
    try {
        let message = req.session.message || "";
        req.session.message = "";
        let type = req.session.type || "";
        req.session.type = "";

        const page = parseInt(req.query.page) || 1;
        const limit = 8;
        const skip = (page - 1) * limit;

        let filter = { is_delete: false };

        const search = req.query.q;
        if (search) {
            filter.name = { $regex: search, $options: "i" };
        }

        if (req.query.category) {

            if (req.query.category === "mens") {
                const category = await Category.findOne({ name: "Mens" });

                if (category) {
                    filter.cat_id = { $in: [category._id] };
                }
            }

            else if (req.query.category === "women") {
                const category = await Category.findOne({ name: "Women" });

                if (category) {
                    filter.cat_id = { $in: [category._id] };
                }
            }

            else if (req.query.category === "kids") {
                const category = await Category.findOne({ name: "Kids" });

                if (category) {
                    filter.cat_id = { $in: [category._id] };
                }
            }

            else {
                const categoryIds = req.query.category.split(",");
                filter.cat_id = { $in: categoryIds };
            }
        }

        if (req.query.brand) {
            const brandIds = req.query.brand.split(",");
            filter.brand_id = { $in: brandIds };
        }


        let sortOption = { created_at: -1 };

        if (req.query.sort === "low-high") {
            sortOption = { "variants.price": 1 };
        }
        else if (req.query.sort === "high-low") {
            sortOption = { "variants.price": -1 };
        }
        else if (req.query.sort === "newest") {
            sortOption = { created_at: -1 };
        }

        const variants = await Product.aggregate([
            { $match: filter },
            { $unwind: "$variants" },
            { $match: { "variants.view": true } },
            {
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
        ]);

        const totalDocs = await Product.aggregate([
            { $match: { is_delete: false } },
            { $unwind: "$variants" },
            { $match: { "variants.view": true } },
            { $count: "total" }
        ]);

        const totalVariants = totalDocs[0].total;
        const totalPages = Math.ceil(totalVariants / limit);


        const categories = await Category.find({ view: true });
        const brands = await Brand.find({ view: true });

        res.render("user/products", {
            variants,
            categories,
            brands,
            currentPage: page,
            totalPages,
            title: "Shop",
            hideNavBar: false,
            banner: null,
        });

    } catch (error) {
        console.log("server error", error);
        res.status(500).send("server error");
    }
}

const filteredShowPage = async (req, res) => {
    try {
        let filter = { is_delete: false };

        const page = parseInt(req.query.page) || 1;
        const limit = 8;
        const skip = (page - 1) * limit;


        if (req.query.category) {
            const categoryIds = req.query.category.split(",")
                .map(id => new mongoose.Types.ObjectId(id));
            filter.cat_id = { $in: categoryIds };
        }

        if (req.query.brand) {
            const brandIds = req.query.brand.split(",")
                .map(id => new mongoose.Types.ObjectId(id));
            filter.brand_id = { $in: brandIds };
        }

        let sortOption = { created_at: -1 };

        if (req.query.sort === "low-high") {
            sortOption = { "variants.price": 1 };
        }
        else if (req.query.sort === "high-low") {
            sortOption = { "variants.price": -1 };
        }

        const pipeline = [
            { $match: filter },
            { $unwind: "$variants" },
            { $match: { "variants.view": true } }
        ];

        if (req.query.minPrice || req.query.maxPrice) {
            let priceFilter = {};

            if (req.query.minPrice) {
                priceFilter.$gte = Number(req.query.minPrice);
            }

            if (req.query.maxPrice) {
                priceFilter.$lte = Number(req.query.maxPrice);
            }

            pipeline.push({
                $match: { "variants.price": priceFilter }
            });
        }

        pipeline.push(
            {
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
        
        // const variants = await Product.aggregate([
        //     { $match: filter },
        //     { $unwind: "$variants" },
        //     { $match: { "variants.view": true } },
        //     {
        //         $lookup: {
        //             from: "brands",
        //             localField: "brand_id",
        //             foreignField: "_id",
        //             as: "brand"
        //         }
        //     },
        //     { $unwind: "$brand" },
        //     { $sort: sortOption },
        //     { $skip: skip },
        //     { $limit: limit }
        // ]);

        res.render("partials/user/productGrid", {
            variants
        });

    } catch (err) {
        console.log(err);
        res.status(500).send("server error");

    }

}

const loadProductDetails = async (req, res) => {
    try {
        const productId = req.params.productId;
        const variantId = req.params.variantId;
        console.log("id: ", productId)
        const product = await Product.findById(productId)
            .populate("cat_id", "name")
            .populate("brand_id", "name");

        const viewedVariants = product.variants.filter(variant => variant.view === true);
        if (!product) {
            return res.status(404).send("Product not found");
        }
       product.variants = product.variants.filter(variant => variant.view === true);
        console.log("product: ", product);

        const defaultVariant = product.variants.length > 0 ? product.variants.id(variantId) : [];
        const price = parseFloat(defaultVariant.price.toString());

        const minPrice = price - 500;
        const maxPrice = price + 500;

        const minDecimal = mongoose.Types.Decimal128.fromString(minPrice.toString());
        const maxDecimal = mongoose.Types.Decimal128.fromString(maxPrice.toString());

        const similarProducts = await Product.find({
            cat_id: { $in: product.cat_id.map(cat => cat._id) },
            _id: { $ne: product._id },
            variants: {
                $elemMatch: { 
                    view: true,
                    price: { $gte: minDecimal, $lte: maxDecimal } 
                }
            }
        }).limit(4);

        console.log("similar products: ", similarProducts);

        res.render('user/productDetails', {
            product,
            defaultVariant,
            viewedVariants,
            images: defaultVariant.images,
            title: "Shop",
            similarProducts,
            hideNavBar: false,
        })
    } catch (error) {
        console.log(error);
        res.status(500).send("Server error");
    }

}



module.exports = {
    loadHomePage,
    loadShowPage,
    filteredShowPage,
    loadProductDetails,

}