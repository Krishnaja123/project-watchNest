const Offer = require("../../models/offerModel");
const Product = require("../../models/productModel");
const Category = require("../../models/categoryModel");
const { getSessionMessage } = require("../../utils/sessionHelper");

const { z } = require("zod");
const offerValidationSchema = z.object({
    name: z.string().min(3, "Offer name must be at least 3 characters"),

    type: z.enum(["product", "category"], {
        errorMap: () => ({ message: "Invalid offer type" })
    }),

    discountType: z.enum(["percentage", "flat"]),

    discountValue: z.number().min(1, "Discount must be at least 1"),

    startDate: z.string(),
    endDate: z.string(),

    productId: z.array(z.string()).optional(),
    categoryId: z.array(z.string()).optional()

}).refine(data => {
    if (data.type === "product") {
        return data.productId && data.productId.length > 0;
    }
    if (data.type === "category") {
        return data.categoryId && data.categoryId.length > 0;
    }
    return true;
}, {
    message: "Please select required product/category",
    path: ["type"]
}).refine(data => new Date(data.endDate) >= new Date(data.startDate), {
    message: "End date must be after start date",
    path: ["endDate"]
});

const loadCreateOfferPage = async (req, res) => {
    try {
        const { message, type } = getSessionMessage(req);
        const products = await Product.find({ is_delete: false });
        const categories = await Category.find({ is_delete: false });

        res.render("admin/addOffer", {
            products,
            categories,
            message,
            type
        });
    } catch (error) {
        console.log("server error", error);
        res.status(500).send(error)

    }
};

const createOffer = async (req, res) => {
    try {

        const { name, type, productId, categoryId, discountType, discountValue, startDate, endDate } = req.body;

        const parsedData = {
            ...req.body,
            discountValue: Number(req.body.discountValue),
            productId: req.body.productId || [],
            categoryId: req.body.categoryId || []
        };

        const result = offerValidationSchema.safeParse(parsedData);

        if (!result.success) {
            return res.status(400).json({
                errors: result.error.errors.map(e => e.message)
            });
        }

        await Offer.create({
            name,
            offerType: type,
            product_id: type === "product" ? productId : null,
            category_id: type === "category" ? categoryId : null,
            discountType,
            discountValue,
            startDate,
            endDate,
            isActive: true
        });

        res.redirect("/admin/offers");

    } catch (error) {
        console.log("server error", error);
        res.status(500).send(error)
    }
}

const loadOfferListingPage = async (req, res) => {
    try {
        let page = parseInt(req.query.page) || 1;

        const { message, type } = getSessionMessage(req);

        return res.render("admin/offers", {
            message,
            type,
            page
        });
    } catch (error) {
        console.log("server error", error);
        return res.status(500).send("server error");
    }
}

const fetchOffers = async (req, res) => {
    try {
        let search = "";
        if (req.query.search) {
            search = req.query.search;
        }

        let page = 1;
        if (req.query.page) {
            page = parseInt(req.query.page);
        }

        const limit = 7;

        let offers = await Offer.find({
            name: { $regex: search, $options: "i" },
            is_delete: false
        }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit);


        console.log(offers);

        let count = await Offer.find({
            name: { $regex: search },
            is_delete: false
        }).countDocuments();
        console.log(count);

        totalPages = Math.ceil(count / limit);

        return res.json({
            offers,
            totalPages,
            currentPage: page
        })

    } catch (error) {
        console.log("server error", error);
        res.status(500).send("server error")
    }
}

const deleteOffer = async (req, res) => {
    try {
        const id = req.params.id;
        console.log("id: ", id);

        const offer = await Offer.findByIdAndUpdate(id, { is_delete: true }, { new: true });
        console.log("deleted offer: ", offer);

        const offers = await Offer.find({ is_delete: false });
        console.log("remaining offers:", offers);

        if (!offer) {
            console.log("No offer found for id:", id);
            return res.status(404).json({ error: "Offer not found" });
        }
        else return res.json({
            message: "Offer deleted successfully",
            offers
        });
    } catch (error) {
        console.log("server error", error);
        res.status(500).send("server error")
    }
}

const editOfferPage = async (req, res) => {
    try {
        const { id } = req.params;
        const page = parseInt(req.query.page) || 1;

        const { message, type } = getSessionMessage(req);

        const products = await Product.find({ is_delete: false });
        const categories = await Category.find({ is_delete: false });

        const offer = await Offer.findById(id)
            .populate("product_id")
            .populate("category_id");

        if (!offer) {
            req.session.message = "Offer not found";
            req.session.type = "error";
            return res.redirect("/admin/offers");
        }

        res.render("admin/editOffer", {
            offer,
            page,
            products,
            categories,
            errors: {},
            message,
            type
        });

    } catch (error) {
        console.log(error);
        res.status(500).send("Server error");
    }
};

module.exports = {
    loadCreateOfferPage,
    createOffer,
    loadOfferListingPage,
    fetchOffers,
    deleteOffer,
    editOfferPage,
    // updateOffer
}