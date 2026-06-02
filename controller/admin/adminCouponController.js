const Coupon = require("../../models/couponSchema");
const { couponSchema } = require("../../validations/couponValidation");
const { getSessionMessage } = require("../../utils/sessionHelper");


const createCoupon = async (req, res) => {
    try {
        const { message, type } = getSessionMessage(req);
        return res.render("admin/addCoupon", {
            formData: {},
            errors: {},
            message: "",
            type: ""
        });
    } catch (error) {
        console.log("server error", error);
        res.status(500).send(error);
    }
}

const saveCoupon = async (req, res) => {
    try {
        console.log("BODY:", req.body);

        const formData = {
            code: req.body.code?.trim().toUpperCase(),
            discountType: req.body.discountType,
            discountValue: Number(req.body.discountValue),
            minAmount: req.body.minAmount ? Number(req.body.minAmount) : undefined,
            maxDiscount: req.body.maxDiscount ? Number(req.body.maxDiscount) : undefined,
            usageLimit: req.body.usageLimit ? Number(req.body.usageLimit) : 0,
            expiryDate: req.body.expiryDate,
            isActive: !!req.body.isActive
        };

        const result = couponSchema.safeParse(formData);

        if (!result.success) {
            const errors = {};
            result.error.errors.forEach(err => {
                errors[err.path[0]] = err.message;
            });

            return res.json({
                success: false,
                errors
            });
        }

        if (formData.discountType === "percentage" && formData.discountValue > 100) {
            return res.json({
                success: false,
                errors: { discountValue: "Percentage cannot exceed 100" }
            });
        }

         if (formData.discountType === "fixed" && formData.discountValue >= formData.minAmount) {
            return res.json({
                success: false,
                errors: { discountValue: "Discount amount must be less than the minimum purchase amount" }
            });
        }

        if (new Date(formData.expiryDate) < new Date()) {
            return res.json({
                success: false,
                errors: { expiryDate: "Expiry date must be in the future" }
            });
        }

        const existingCode = await Coupon.findOne({
            code: formData.code,
            is_delete: false
        });

        console.log("existing code: ", existingCode);

        if (existingCode) {
            return res.json({
                success: false,
                errors: { code: "Coupon code already exists" }
            });
        }

        const newCoupon = new Coupon({
            ...formData,
            usageCount: 0,
        });

        await newCoupon.save();

        return res.json({
            success: true,
            message: "Coupon created successfully"
        });

    } catch (error) {
        console.log("server error", error);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

const listCoupons = async (req, res) => {
    try {
        const { message, type } = getSessionMessage(req);
        let page = parseInt(req.query.page) || 1;

        return res.render("admin/coupons", { message, type, page });
    } catch (error) {
        console.log("server error", error);
        res.status(500).send("Server error");
    }
}

const fetchCoupons = async (req, res) => {
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

        let coupons = await Coupon.find({
            code: { $regex: search },
            is_delete: false
        }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit);

        // for(const coupon of coupons) {
        //     coupon.
        // }
        console.log(coupons);

        let count = await Coupon.find({
            code: { $regex: search },
            // is_delete: false
        }).countDocuments();
        console.log(count);

        totalPages = Math.ceil(count / limit);

        return res.json({
            coupons,
            totalPages,
            currentPage: page
        })

    } catch (error) {
        console.log("server error", error);
        res.status(500).send("server error")
    }
}

const deleteCoupon = async (req, res) => {
    try {
        const id = req.params.id;
        console.log("id: ", id);

        const coupon = await Coupon.findByIdAndUpdate(id, { is_delete: true }, { new: true });
        console.log("deleted coupon: ", coupon);

        console.log("deleted coupon: ", coupon);
        const coupons = await Coupon.find({ is_delete: false });
        console.log("remaining coupons:", coupons);

        if (!coupon) {
            console.log("No coupon found for id:", id);
            return res.status(404).json({ error: "Coupon not found" });
        }
        else return res.json({ message: "Coupon deleted successfully", coupons });
    } catch (error) {
        console.log("server error", error);
        res.status(500).send("server error")
    }
}

const editCouponPage = async (req, res) => {
    try {
        const { id } = req.params;
        const page = parseInt(req.query.page) || 1;

        const { message, type } = getSessionMessage(req);

        const coupon = await Coupon.findById(id);

        if (!coupon) {
            req.session.message = "Coupon not found";
            req.session.type = "error";
            return res.redirect("/admin/coupons");
        }

        res.render("admin/editCoupon", {
            coupon,
            page,
            errors: {},
            message,
            type
        });

    } catch (error) {
        console.log(error);
        res.status(500).send("Server error");
    }
};

const updateCoupon = async (req, res) => {
    try {
        console.log("hi");

        const { id } = req.params;
        const page = parseInt(req.query.page) || 1;

        const formData = {
            code: req.body.code?.trim().toUpperCase(),
            discountType: req.body.discountType,
            discountValue: Number(req.body.discountValue),
            minAmount: req.body.minAmount ? Number(req.body.minAmount) : undefined,
            maxDiscount: req.body.maxDiscount ? Number(req.body.maxDiscount) : undefined,
            usageLimit: req.body.usageLimit ? Number(req.body.usageLimit) : 0,
            expiryDate: req.body.expiryDate,
            isActive: !!req.body.isActive
        };

        const existingCoupon = await Coupon.findById(id);
        if (!existingCoupon) {
            req.session.message = "Coupon not found";
            req.session.type = "error";
            return res.redirect("/admin/coupons");
        }

        const duplicate = await Coupon.findOne({
            _id: { $ne: id },
            is_delete: false,
            code: formData.code
        });

        if (duplicate) {
            req.session.message = "Coupon code already exists";
            req.session.type = "error";
            return res.redirect(`/admin/coupons/editCoupon/${id}?page=${page}`);
        }

        if (formData.discountType === "percentage" && formData.discountValue > 100) {
            req.session.message = "Percentage cannot exceed 100";
            req.session.type = "error";
            return res.redirect(`/admin/coupons/editCoupon/${id}?page=${page}`);
        }

        if (formData.discountType === "fixed" && formData.discountValue >= formData.minAmount) {
            req.session.message = "Discount amount must be less than the minimum purchase amount";
            req.session.type = "error";
            return res.redirect(`/admin/coupons/editCoupon/${id}?page=${page}`);
        }

        if (new Date(formData.expiryDate) < new Date()) {
            req.session.message = "Expiry date must be in the future";
            req.session.type = "error";
            return res.redirect(`/admin/coupons/editCoupon/${id}?page=${page}`);
        }

        await Coupon.findByIdAndUpdate(id, formData);

        req.session.message = "Coupon updated successfully";
        req.session.type = "success";

        return res.redirect(`/admin/coupons?page=${page}`);

    } catch (error) {
        console.log("server error", error);
        res.status(500).send("server error");
    }
};


module.exports = {
    createCoupon,
    saveCoupon,
    listCoupons,
    fetchCoupons,
    editCouponPage,
    updateCoupon,
    deleteCoupon

}