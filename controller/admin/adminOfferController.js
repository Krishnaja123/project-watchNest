const Offer = require("../../models/offerModel");
const Product = require("../../models/productModel");
const Category = require("../../models/categoryModel");
const { getSessionMessage } = require("../../utils/sessionHelper");
const STATUS_CODES = require("../../constants/statusCodes");
const MESSAGES = require("../../constants/messages");

const { z } = require("zod");
const offerValidationSchema = z.object({
    name: z.string().min(3, "Offer name must be at least 3 characters"),

    type: z.enum(["product", "category"], {
        errorMap: () => ({ message: "Invalid offer type" })
    }),

    discountType: z.enum(["percentage",]),

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
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(error)

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
            return res.status(STATUS_CODES.BAD_REQUEST).json({
                errors: result.error.issues.map(e => e.message)
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
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(error)
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
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send("server error");
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
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send("server error")
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
            return res.status(STATUS_CODES.NOT_FOUND).json({ error: "Offer not found" });
        }
        else return res.json({
            message: "Offer deleted successfully",
            offers
        });
    } catch (error) {
        console.log("server error", error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send("server error")
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
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send("Server error");
    }
};

// const updateOffer = async (req, res) => {
//     try {
//         const { _id, name, type, productId, categoryId, discountType, discountValue, startDate, endDate } = req.body;

//         console.log("category", categoryId);
        
//         const parsedData = {
//             ...req.body,
//             discountValue: Number(req.body.discountValue),
//             productId: req.body.productId || [],
//             categoryId: req.body.categoryId || []
//         };

//         const result = offerValidationSchema.safeParse(parsedData);

//         if (!result.success) {
//             return res.status(400).json({
//                 errors: result.error.errors.map(e => e.message)
//             });
//         }

//         const page = parseInt(req.query.page);
//         const existingOffer = await Offer.findById(_id);

//         if (!existingOffer) {
//             req.session.message = "No offer found with this ID";
//             req.session.type = "error";
//             return res.redirect("/admin/offers")
//         }

//         const updatedOfferExist = await Offer.findOne({
//             _id: { $ne: _id },
//             name: { $regex: name.trim(), $options: "i" }
//         });

//         if (updatedOfferExist) {
//             req.session.message = "Offer already exist";
//             req.session.type = "error";
//             return res.redirect(`/admin/offers/editOffer/${_id}`);
//         }

//         const upadateOffer = await Offer.findByIdAndUpdate(_id, { 
//             name, 
//             type, 
//             product_id: productId, 
//             category_id: categoryId, 
//             discountType, 
//             discountValue, 
//             startDate, 
//             endDate });

//         if (!upadateOffer) {
//             req.session.message = "Offer not updated, Please try again.";
//             req.session.type = "error";
//             return res.redirect(`/admin/offers/editOffer/${_id}`);
//         }

//         req.session.message = "Updated Offer";
//         req.session.type = "success";
//         res.redirect(`/admin/offers/?page=${page}`);
//     } catch (error) {
//         console.log("server error", error);
//         res.status(500).send("server error")
//     }
// }

const updateOffer = async (req, res) => {
    try {
        const {
            _id,
            name,
            type,
            productId,
            categoryId,
            discountType,
            discountValue,
            startDate,
            endDate
        } = req.body;

        const parsedData = {
            ...req.body,
            discountValue: Number(discountValue),
            productId: productId || [],
            categoryId: categoryId || []
        };

        const result = offerValidationSchema.safeParse(parsedData);

        if (!result.success) {
            req.session.message = result.error.errors[0].message;
            req.session.type = "error";
            return res.redirect(`/admin/offers/editOffer/${_id}`);
        }

        const page = parseInt(req.query.page) || 1;

        const existingOffer = await Offer.findById(_id);

        if (!existingOffer) {
            req.session.message = "Offer not found";
            req.session.type = "error";
            return res.redirect("/admin/offers");
        }

        // Date Validation
        if (new Date(endDate) <= new Date(startDate)) {
            req.session.message = "End date must be after start date";
            req.session.type = "error";
            return res.redirect(`/admin/offers/editOffer/${_id}`);
        }

        // Category Offer Validation
        if (type === "category") {

            const categoryIds = Array.isArray(categoryId)
                ? categoryId
                : [categoryId];

            if (categoryIds.length === 0) {
                req.session.message = "Please select at least one category";
                req.session.type = "error";
                return res.redirect(`/admin/offers/editOffer/${_id}`);
            }

            const validCategories = await Category.find({
                _id: { $in: categoryIds },
                is_delete: false
            });

            if (validCategories.length !== categoryIds.length) {
                req.session.message =
                    "One or more selected categories have been removed";
                req.session.type = "error";
                return res.redirect(`/admin/offers/editOffer/${_id}`);
            }

            const duplicateCategoryOffer = await Offer.findOne({
                _id: { $ne: _id },
                type: "category",
                category_id: { $in: categoryIds }
            });

            if (duplicateCategoryOffer) {
                req.session.message =
                    "An offer already exists for one of the selected categories";
                req.session.type = "error";
                return res.redirect(`/admin/offers/editOffer/${_id}`);
            }
        }

        // Product Offer Validation
        if (type === "product") {

            const productIds = Array.isArray(productId)
                ? productId
                : [productId];

            if (productIds.length === 0) {
                req.session.message = "Please select at least one product";
                req.session.type = "error";
                return res.redirect(`/admin/offers/editOffer/${_id}`);
            }

            const validProducts = await Product.find({
                _id: { $in: productIds },
                is_delete: false
            });

            if (validProducts.length !== productIds.length) {
                req.session.message =
                    "One or more selected products have been removed";
                req.session.type = "error";
                return res.redirect(`/admin/offers/editOffer/${_id}`);
            }
        }

        // Duplicate Offer Name Validation
        const updatedOfferExist = await Offer.findOne({
            _id: { $ne: _id },
            name: {
                $regex: `^${name.trim()}$`,
                $options: "i"
            }
        });

        if (updatedOfferExist) {
            req.session.message = "Offer name already exists";
            req.session.type = "error";
            return res.redirect(`/admin/offers/editOffer/${_id}`);
        }

        // Update Offer
        const updatedOffer = await Offer.findByIdAndUpdate(
            _id,
            {
                name: name.trim(),
                type,
                product_id: productId || [],
                category_id: categoryId || [],
                discountType,
                discountValue,
                startDate,
                endDate
            },
            {
                new: true,
                runValidators: true
            }
        );

        if (!updatedOffer) {
            req.session.message = "Offer update failed";
            req.session.type = "error";
            return res.redirect(`/admin/offers/editOffer/${_id}`);
        }

        req.session.message = "Offer updated successfully";
        req.session.type = "success";

        return res.redirect(`/admin/offers?page=${page}`);

    } catch (error) {
        console.error("Update Offer Error:", error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(MESSAGES.SERVER_ERROR);
    }
};

module.exports = {
    loadCreateOfferPage,
    createOffer,
    loadOfferListingPage,
    fetchOffers,
    deleteOffer,
    editOfferPage,
    updateOffer
}