const mongoose = require("mongoose");
const Product = require("../../models/productModel");
const Category = require("../../models/categoryModel");
const Brand = require("../../models/brandModel");
const Wishlist = require("../../models/wishlistModel");

const { getPaginatedProducts } = require("../../services/productService");
const { getOffer } = require("../../services/offerService");
// const { find } = require("../../models/orderModel");
// const { maxLength } = require("zod");


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

        const wishlist = await Wishlist.findOne({ user_id: req.user?._id });

        let wishlistProductIds = [];

        wishlistProductIds = wishlist?.products?.map(item => {
            return item.product_id.toString();
        });
        const today = new Date();

        const showData = await Promise.all(products.map(async (product) => {

            const viewedProducts = product.variants.filter(
                v => v.view === true && v.stock > 0
            );

            const firstVariant = viewedProducts?.[0];
            if (!firstVariant) return null;

            const price = Number(firstVariant.price);

            const bestDiscount = await getOffer(product, price);

            const finalPrice = price - bestDiscount;

            return {
                productId: product._id,
                name: product.name,
                brand: product.brand_id?.name,
                price: price,
                finalPrice: finalPrice,
                discount: bestDiscount,
                image: firstVariant?.images?.[0],
                variantId: firstVariant?._id
            };
        }));

        return res.render("user/home", {
            message,
            type,
            title: "Home",
            showData,
            hideNavBar: false,
            wishlistProductIds
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

        const wishlist = await Wishlist.findOne({ user_id: req.user?._id });

        let wishlistVariantIds = [];

        wishlistVariantIds = wishlist?.products?.map(item => {
            return item.variant_id.toString();
        });

        res.render("user/products", {
            variants,
            categories,
            brands,
            currentPage,
            totalPages,
            wishlistVariantIds,
            title: "Shop",
            hideNavBar: false,
            banner: null,
            message,
            type
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

        const wishlist = await Wishlist.findOne({ user_id: req.user?._id });

        let wishlistVariantIds = [];

        wishlistVariantIds = wishlist?.products?.map(item => {
            return item.variant_id.toString();
        });

        res.render("partials/user/productSection", {
            variants,
            currentPage,
            totalPages,
            wishlistVariantIds
        });

    } catch (err) {
        console.log(err);
        res.status(500).send("server error");

    }

}

const getProductDetails = async (req, res) => {
    try {
        let message = req.session.message || "";
        req.session.message = "";
        let type = req.session.type || "";
        req.session.type = "";

        const productId = req.params.productId;
        const variantId = req.params.variantId;
        console.log("id: ", productId)
        const product = await Product.findById(productId)
            .populate("cat_id", "name")
            .populate("brand_id", "name");

        if (!product) {
            return res.status(404).render("user/404", {
                message: "Product not found"
            });
        }

        const viewedVariants = product.variants.filter(variant => variant.view === true);

        if (viewedVariants.length === 0) {
            return res.status(404).render("user/404", {
                message: "Product not available"
            });
        }

 const today = new Date();

const updatedVariants = await Promise.all(
    viewedVariants.map(async (variant) => {

        const price = Number(variant.price);

        const bestDiscount = await getOffer(product, price);

        return {
            ...variant.toObject(),
            price,
            discountAmount: bestDiscount,
            finalPrice: price - bestDiscount
        };
    })
);

        let defaultVariant = updatedVariants.find(
            v => v._id.toString() === variantId
        );

        console.log("default variant: ", defaultVariant)

        if (!defaultVariant) {
            defaultVariant = updatedVariants[0];
        }

        const isOutOfStock = defaultVariant.stock <= 0;

        const price = parseFloat(defaultVariant.price.toString());

        const minPrice = price - 500;
        const maxPrice = price + 500;

        const minDecimal = mongoose.Types.Decimal128.fromString(minPrice.toString());
        const maxDecimal = mongoose.Types.Decimal128.fromString(maxPrice.toString());

        const similarProducts = await Product.find({
            cat_id: product.cat_id,
            _id: { $ne: product._id },
            variants: {
                $elemMatch: {
                    view: true,
                    price: { $gte: minDecimal, $lte: maxDecimal }
                }
            }
        }).limit(4);

        console.log("similar products: ", similarProducts);

            const bestDiscount = await getOffer(product, price);

            const finalPrice = price - bestDiscount;

        res.render('user/productDetails', {
            product,
            defaultVariant,
            viewedVariants: updatedVariants,
updatedVariants: updatedVariants,
            images: defaultVariant.images,
            title: "Shop",
            similarProducts,
            hideNavBar: false,
            // discount: bestDiscount,
            // finalPrice
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