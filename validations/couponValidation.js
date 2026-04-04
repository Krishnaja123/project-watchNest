const { z } = require("zod");

const couponSchema = z.object({
    code: z.string().min(3, "Coupon code must be at least 3 characters"),

    discountType: z.enum(["percentage", "fixed"], {
        errorMap: () => ({ message: "Invalid discount type" })
    }),

    discountValue: z.number().positive("Discount must be greater than 0"),

    minAmount: z.number().nonnegative("Minimum amount cannot be negative").optional(),

    maxDiscount: z.number().nonnegative("Max discount cannot be negative").optional(),

    usageLimit: z.number().positive("Usage limit must be greater than 0"),

    expiryDate: z.string().min(1, "Expiry date is required")
});

module.exports = { couponSchema };