
const Order = require("../../models/orderModel");
const User = require("../../models/userModel");
const OrderItem = require("../../models/orderItemsModel");


const loadDashboard = async (req, res) => {
    try {
        res.render("admin/dashboard");
    } catch (error) {
        console.log("Error loading dashboard:", error);
        res.redirect("/admin/error");
    }
};


const getDashboardData = async (req, res) => {
    try {

        const filter = req.query.filter || "daily";

        let groupFormat;

        if (filter === "daily") {
            groupFormat = { $dayOfMonth: "$createdAt" };
        } else if (filter === "monthly") {
            groupFormat = {
                month: { $month: "$createdAt" },
            };
        } else {
            groupFormat = {
                year: { $year: "$createdAt" }
            };
        }

        console.log("groupFormat: ", groupFormat);


        const salesData = await Order.aggregate([
            {
                $match: { status: "delivered" }
            },
            {
                $group: {
                    _id: groupFormat,
                    total: { $sum: "$totalAmount" }
                }
            },
            {
                $project: {
                    month: "$_id.month",
                    year: "$_id.year",
                    total: 1
                }
            },
            { $sort: { _id: 1 } }
        ]);

        console.log("sales data: ", salesData);


        const topProducts = await OrderItem.aggregate([
            {
                $match: { status: "delivered" }
            },
            {
                $group: {
                    _id: "$product_id",
                    productName: { $first: "$productName" },
                    totalSold: { $sum: "$quantity" }
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: 10 }
        ]);

        // console.log("topProducts: ", topProducts);


        const topCategories = await OrderItem.aggregate([
            {
                $match: { status: "delivered" }
            },
            {
                $lookup: {
                    from: "products",
                    localField: "product_id",
                    foreignField: "_id",
                    as: "product"
                }
            },
            { $unwind: "$product" },
            {
                $group: {
                    _id: "$product.cat_id",
                    totalSold: { $sum: "$quantity" }
                }
            },
            {
                $lookup: {
                    from: "categories",
                    localField: "_id",
                    foreignField: "_id",
                    as: "category"
                }
            },
            { $unwind: "$category" },
            { $sort: { totalSold: -1 } },
            { $limit: 10 },
            {
                $project: {
                    categoryName: "$category.name",
                    totalSold: 1
                }
            }
        ]);

        // console.log("topCategories: ", topCategories);


        const topBrands = await OrderItem.aggregate([
            {
                $match: { status: "delivered" }
            },
            {
                $lookup: {
                    from: "products",
                    localField: "product_id",
                    foreignField: "_id",
                    as: "product"
                }
            },
            { $unwind: "$product" },
            {
                $group: {
                    _id: "$product.brand_id",
                    totalSold: { $sum: "$quantity" }
                }
            },
            {
                $lookup: {
                    from: "brands",
                    localField: "_id",
                    foreignField: "_id",
                    as: "brand"
                }
            },
            { $unwind: "$brand" },
            { $sort: { totalSold: -1 } },
            { $limit: 10 },
            {
                $project: {
                    brandName: "$brand.name",
                    totalSold: 1
                }
            }
        ]);

        // console.log("topBrands: ", topBrands);


        res.json({
            salesData,
            topProducts,
            topCategories,
            topBrands
        });

    } catch (error) {
        console.log("Dashboard error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to load dashboard data"
        });
    }
};


module.exports = {
    loadDashboard,
    getDashboardData
};
