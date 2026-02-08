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

        const product = await Product.find({ is_delete: false })
            .sort({ created_at: -1 }).limit(4).select("name variants");
        console.log(product);

        const showData = product.map(data => {
            const firstVariant = data.variants?.[0];
            return {
                _id: data._id,
                name: data.name,
                price: firstVariant?.price || 0,
                image: firstVariant?.images?.[0]

            }
        });

        return res.render("user/home", {
            message,
            type,
            title: "Home",
            showData
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
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;

        let filter = { is_delete: false };
        console.log(req.query.category);

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


        const totalProducts = await Product.countDocuments(filter);

        const products = await Product.find(filter)
            .sort(sortOption)
            .skip(skip)
            .limit(limit)
            .lean();

        console.log(products);

        const categories = await Category.find({ view: true });
        const brands = await Brand.find({ view: true });

        const totalPages = Math.ceil(totalProducts / limit);

        res.render("user/products", {
            message,
            type,
            title: "Shop",
            products,
            categories,
            brands,
            banner: null,
            currentPage: page,
            totalPages
        })
    } catch (error) {
        console.log("server error", error);
        res.status(500).send("server error");
    }
}

const filteredShowPage = async (req, res) => {
    try {
        let filter = { is_delete: false };

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

        filter.variants = { $elemMatch: {} };

        if (req.query.minPrice) {
            filter.variants.$elemMatch.price = {
                $gte: Number(req.query.minPrice)
            };
        }

        if (req.query.maxPrice) {
            filter.variants.$elemMatch.price = {
                ...(filter.variants.$elemMatch.price || {}),
                $lte: Number(req.query.maxPrice)
            };
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
        const products = await Product.find(filter)
            .sort(sortOption)
            .lean();
        console.log("products: ", products);

        res.render("partials/user/productGrid", {
            products
        });

    } catch (err) {
        console.log(err);
    }

}

const productDetails = async (req,res) => {
    res.render('user/productDetails');
}

module.exports = {
    loadHomePage,
    loadShowPage,
    filteredShowPage,
    productDetails
}