const Order = require("../models/orderModel");

const getDateRange = (filter) => {
    const now = new Date();
    let dateFilter = {};  
    
    if (filter === "daily") {
        const start = new Date();
        start.setHours(0, 0, 0, 0);

        const end = new Date();
        end.setHours(23, 59, 59, 999);

        dateFilter = { $gte: start, $lte: end };
        } else if (filter === "weekly") {
            const start = new Date();
            start.setDate(now.getDate() - 7);

            dateFilter = { $gte: start, $lte: now };
        } else if (filter === "monthly") {
            const start = new Date();
        start.setMonth(now.getMonth() - 1);

        dateFilter = { $gte: start, $lte: now };
        } else if (filter === "yearly") {
        const start = new Date();
        start.setFullYear(now.getFullYear() - 1);

        dateFilter = { $gte: start, $lte: now };
    }
    return dateFilter;
}

module.exports = {
    getDateRange
}