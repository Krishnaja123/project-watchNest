const mongoose = require("mongoose");
const Product = require("../../models/productModel");
const Category = require("../../models/categoryModel");
const Brand = require("../../models/brandModel");
const { getPaginatedProducts } = require("../../services/productService");


const getHomePage = async (req, res) => {
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

const showProductsPage = async (req, res) => {
    try {
        let message = req.session.message || "";
        req.session.message = "";
        let type = req.session.type || "";
        req.session.type = "";

        const { variants, currentPage, totalPages } = await getPaginatedProducts(req.query);

        const categories = await Category.find({ view: true });
        const brands = await Brand.find({ view: true });

        res.render("user/products", {
            variants,
            categories,
            brands,
            currentPage,
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

const filterProducts = async (req, res) => {
    try {
        const { variants, currentPage, totalPages } =
            await getPaginatedProducts(req.query);

        res.render("partials/user/productSection", {
            variants,
            currentPage,
            totalPages
        });

    } catch (err) {
        console.log(err);
        res.status(500).send("server error");

    }

}

const getProductDetails = async (req, res) => {
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
       if(product.variants.length === 0) {
            return res.status(404).send("Product not Available");
       }
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
    getHomePage,
    showProductsPage,
    filterProducts,
    getProductDetails,

}