const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");
const Order = require("../../models/orderModel");
const OrderItem = require("../../models/orderItemsModel");

const { getSessionMessage } = require("../../utils/sessionHelper");
const STATUS_CODES = require("../../constants/statusCodes");
const MESSAGES = require("../../constants/messages");

const getSalesReport = async (req, res) => {
    try {
        const { message, type } = getSessionMessage(req);

        let page = parseInt(req.query.page) || 1;

        res.render("admin/salesReport", {
            message,
            type,
            page,
        })

    } catch (error) {
        console.log("server error", error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(error);
    }
}

const getDateRange = (filter, startDate, endDate) => {
    let start, end;

    switch (filter) {
        case "daily":
            start = new Date();
            start.setHours(0, 0, 0, 0);
            end = new Date();
            end.setHours(23, 59, 59, 999);
            break;

        case "weekly":
            const today = new Date();
            start = new Date(today);
            start.setDate(today.getDate() - today.getDay());
            start.setHours(0, 0, 0, 0);
            end = new Date(today);
            end.setHours(23, 59, 59, 999);
            break;

        case "monthly":
            const now = new Date();
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            break;

        case "yearly":
            start = new Date(new Date().getFullYear(), 0, 1);
            end = new Date();
            end.setHours(23, 59, 59, 999);
            break;

        case "custom":
            start = startDate ? new Date(startDate) : new Date();
            end = endDate ? new Date(endDate) : new Date();
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            break;

        default:
            start = new Date();
            start.setHours(0, 0, 0, 0);
            end = new Date();
            end.setHours(23, 59, 59, 999);
    }

    console.log(start, end)
    return { startDate: start, endDate: end };
};

const getSalesReportData = async (req, res) => {
    try {
        const filter = req.query.filter || "daily";
        const page = parseInt(req.query.page) || 1;
        const limit = 7;

        const { startDate, endDate } = getDateRange(
            filter,
            req.query.startDate,
            req.query.endDate
        );

        const query = {
            createdAt: { $gte: startDate, $lte: endDate },
        };

        const totalOrders = await Order.countDocuments(query);

        const orders = await Order.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        const allOrders = await Order.find(query).lean();

        const orderIds = allOrders.map(o => o._id);

        const allItems = await OrderItem.find({
            order_id: { $in: orderIds }
        }).lean();

        const itemsMap = {};
        allItems.forEach(item => {
            const key = item.order_id.toString();
            if (!itemsMap[key]) itemsMap[key] = [];
            itemsMap[key].push(item);
        });

        let summary = {
            totalOrders: 0,
            totalRevenue: 0,
            totalOfferDiscount: 0,
            totalCouponDiscount: 0,
            totalRefund: 0
        };

        for (const order of allOrders) {
            summary.totalOrders++;
            summary.totalRevenue += order.totalAmount || 0;
            summary.totalOfferDiscount += order.offerDiscount || 0; 
            summary.totalCouponDiscount += order.couponDiscount || 0;
            summary.totalRefund += order.refundAmount || 0;
        }
console.log("totalRevenue: ", summary.totalRevenue);
        const orderReport = orders.map(order => {
            return {
                orderId: order.orderId,
                date: new Date(order.createdAt).toLocaleDateString(),
                paymentMethod: order.paymentMethod,
                totalAmount: order.totalAmount || 0,
                offerDiscount: order.offerDiscount || 0,
                couponDiscount: order.couponDiscount || 0,
            };
        });

        res.json({
            summary,
            orderReport,
            totalPages: Math.ceil(totalOrders / limit),
            currentPage: page,
        });

    } catch (error) {
        console.log("Sales Report Error:", error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.SERVER_ERROR });
    }
};

const exportSalesExcel = async (req, res) => {
    try {
        const { filter = "daily" } = req.query;

        const { startDate, endDate } = getDateRange(filter);

        const orders = await Order.find({
            createdAt: { $gte: startDate, $lte: endDate }
        }).lean();

        const totalSalesAmount = orders.reduce((sum, order) => {
            return sum + (
                (order.totalAmount || 0)
            );
        }, 0);

        console.log("orders: ", orders);


        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet("Sales Report");

        sheet.columns = [
            { header: "Order ID", key: "orderId", width: 25 },
            { header: "Date", key: "date", width: 20 },
            { header: "Payment Method", key: "paymentMethod", width: 20 },
            { header: "Total Amount", key: "totalAmount", width: 20 },
            { header: "Coupon Discount", key: "couponDiscount", width: 20 },
            { header: "Offer Discount", key: "offerDiscount", width: 20 },
        ];

        const orderIds = orders.map(o => o._id);

        const items = await OrderItem.find({
            order_id: { $in: orderIds }
        }).lean();

        const itemMap = {};
        items.forEach(i => {
            const id = i.order_id.toString();
            if (!itemMap[id]) itemMap[id] = [];
            itemMap[id].push(i);
        });

        orders.forEach(order => {

            sheet.addRow({
                orderId: order.orderId,
                date: new Date(order.createdAt).toLocaleDateString(),
                paymentMethod: order.paymentMethod,
                totalAmount: order.totalAmount,
                couponDiscount: order.couponDiscount || 0,
                offerDiscount: order.offerDiscount || 0,
            });
        });

        sheet.addRow({});

        const totalRow = sheet.addRow({
            orderId: "TOTAL",
            totalAmount: totalSalesAmount
        });

        totalRow.font = { bold: true };

        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );

        res.setHeader(
            "Content-Disposition",
            "attachment; filename=sales-report.xlsx"
        );

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.log(error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send("Excel export failed");
    }
};


const exportSalesPDF = async (req, res) => {
    try {
        const { filter = "daily" } = req.query;

        const { startDate, endDate } = getDateRange(filter);

        const orders = await Order.find({
            createdAt: { $gte: startDate, $lte: endDate }
        }).lean();

        const totalSalesAmount = orders.reduce((sum, order) => {
            return sum + (
                (order.totalAmount || 0)
                
            );
        }, 0);

        const doc = new PDFDocument({ margin: 30, size: "A4" });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "attachment; filename=sales-report.pdf");

        doc.pipe(res);

        // 🔹 Title
        doc.fontSize(18).text("Sales Report", { align: "center" });
        doc.moveDown(2);

        // 🔹 Table Header
        const tableTop = doc.y;

        const colX = {
            orderId: 30,
            date: 130,
            payment: 220,
            total: 320,
            coupon: 400,
            offer: 480
        };

        doc.fontSize(10).font("Helvetica-Bold");

        doc.text("Order ID", colX.orderId, tableTop);
        doc.text("Date", colX.date, tableTop);
        doc.text("Payment", colX.payment, tableTop);
        doc.text("Total", colX.total, tableTop);
        doc.text("Coupon", colX.coupon, tableTop);
        doc.text("Offer", colX.offer, tableTop);

        doc.moveDown();

        // 🔹 Header line
        doc.moveTo(30, doc.y).lineTo(560, doc.y).stroke();

        let y = doc.y + 5;

        doc.font("Helvetica");

        // 🔹 Rows
        orders.forEach(order => {

            doc.text(order.orderId, colX.orderId, y);
            doc.text(new Date(order.createdAt).toLocaleDateString(), colX.date, y);
            doc.text(order.paymentMethod, colX.payment, y);
            doc.text(`₹${(order.totalAmount || 0).toFixed(2)}`, colX.total, y);
            doc.text(`₹${(order.couponDiscount || 0).toFixed(2)}`, colX.coupon, y);
            doc.text(`₹${(order.offerDiscount || 0).toFixed(2)}`, colX.offer, y);

            y += 20;

            // ✅ Page break
            if (y > 750) {
                doc.addPage();
                y = 50;
            }
        });

        doc.moveTo(30, y).lineTo(560, y).stroke();

        y += 10;

        doc.font("Helvetica-Bold")
            .fontSize(12)
            .text(
                `Total Sales Amount: ₹${totalSalesAmount.toFixed(2)}`,
                30,
                y,
                { align: "right" }
            );
            
        doc.end();

    } catch (error) {
        console.log(error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send("PDF export failed");
    }
};

module.exports = {
    getSalesReport,
    getSalesReportData,
    exportSalesExcel,
    exportSalesPDF
}