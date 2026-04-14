
const express = require("express");
const router = express.Router();
const {adminAuth, preventBackToLogin} = require("../middleware/adminAuth");
const authController = require("../controller/admin/loginController");
const customerController = require("../controller/admin/customerController");
const categoryController = require("../controller/admin/categoryController");
const brandController = require("../controller/admin/brandController");
const productController = require("../controller/admin/productController");
const orderController = require("../controller/admin/adminOrdersController");
const couponController = require("../controller/admin/adminCouponController");
const offerController = require("../controller/admin/adminOfferController");
const salesReportController = require("../controller/admin/adminSalesReportController");

const upload = require("../config/multerConfig");

//user- login/logout
router.get('/login', preventBackToLogin, authController.loadLogin);
router.post('/login', authController.login);
router.get('/logout', authController.logout);

//customer
router.get("/customer", adminAuth,  customerController.loadCustomer);
router.get("/fetchUser", adminAuth, customerController.fetchUser);
router.get("/editUser/:id", adminAuth, customerController.userDetails);
router.post("/editUser/:id", adminAuth, customerController.updateUser);

//category
router.get("/category", adminAuth, categoryController.createCategory);
router.post("/category", adminAuth, categoryController.saveCategory);
router.get("/categories", adminAuth, categoryController.categories);
router.get("/fetchCategories", adminAuth, categoryController.fetchCategories);
router.get("/editCategory/:id", adminAuth, categoryController.categoryDetails);
router.post("/editCategory/:id", adminAuth, categoryController.updateCategory);
router.put("/categories/:id", adminAuth, categoryController.deleteCategory);
router.put("/viewCategory/:id", adminAuth, categoryController.viewCategory);

//brand
router.get("/brand", adminAuth, brandController.createBrand);
router.post("/brand", adminAuth, brandController.saveBrand);
router.get("/brands", adminAuth, brandController.brands);
router.get("/fetchbrands", adminAuth, brandController.fetchBrands);
router.get("/editBrand/:id", adminAuth, brandController.brandDetails);
router.post("/editBrand/:id", adminAuth, brandController.updateBrand);
router.put("/brands/:id", adminAuth, brandController.deleteBrand);
router.put("/viewBrand/:id", adminAuth, brandController.viewBrand);

//products
router.get("/product", adminAuth, productController.createProduct);
router.post("/product", adminAuth, upload.any(), productController.saveProduct);
router.get("/products", adminAuth, productController.products);
router.get('/fetchProduct/:productName', adminAuth, productController.checkProductName);
router.get('/fetchProducts', adminAuth, productController.fetchProducts);
router.put("/viewProduct/:id/variant/:variantId", adminAuth, productController.viewProduct);
router.put("/product/:id", adminAuth, productController.deleteProduct);
router.get("/editProduct/:id", adminAuth, productController.productDetails);
router.post("/editProduct/:id", adminAuth, upload.any(), (req, res, next) => {
  console.log("✅ Route middleware hit");
  next();
}, productController.updateProduct);


//Orders
router.get("/orders", adminAuth, orderController.getOrders);
router.get("/fetchorders", adminAuth, orderController.fetchOrders);
router.get("/orderDetails/:id", adminAuth, orderController.getOrderDetails);
//router.post("order-status/:id", adminAuth, orderController.updateOrderStatus);
router.post("/order-item-status/:id", adminAuth, orderController.updateProductStatus);
router.post("/order-item-return/:id", adminAuth, orderController.returnAcceptOrReject);

//Coupon
router.get("/coupons/create", adminAuth, couponController.createCoupon);
router.post("/save-coupon", adminAuth, couponController.saveCoupon);
router.get("/coupons", adminAuth, couponController.listCoupons);
router.get("/fetchCoupon", adminAuth, couponController.fetchCoupons);
router.get("/coupons/editCoupon/:id", adminAuth, couponController.editCouponPage);
router.post("/editCoupon/:id", adminAuth, couponController.updateCoupon);
router.put("/coupons/:id", adminAuth, couponController.deleteCoupon);

//Offer
router.get("/offers/create-offer", adminAuth, offerController.loadCreateOfferPage);
router.post("/create-offer", adminAuth, offerController.createOffer);
router.get("/offers", adminAuth, offerController.loadOfferListingPage);
router.get("/offers/fetchOffers", adminAuth, offerController.fetchOffers);
router.put("/offers/:id", adminAuth, offerController.deleteOffer);
router.get("/offers/editOffer/:id", adminAuth, offerController.editOfferPage);
// router.post("/editOffers/:id", adminAuth, couponController.updateOffer);

// Sales Report
router.get("/sales-report", adminAuth, salesReportController.getSalesReport);
router.get("/sales-report-data", adminAuth, salesReportController.getSalesReportData);
router.get("/sales-report/excel", adminAuth, salesReportController.exportSalesPDF);
router.get("/sales-report/pdf", adminAuth, salesReportController.exportSalesExcel);
module.exports = router;
