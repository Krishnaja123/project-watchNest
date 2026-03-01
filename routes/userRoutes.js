const express = require("express");
const router = express.Router();
const {userAuth, requireLogin} = require("../middleware/userAuth");
const userController = require("../controller/user/userController");
const productController = require("../controller/user/productController");
const passport = require("passport");
const profileController = require("../controller/user/profileController");
const addressController = require("../controller/user/addressController");
const cartController = require("../controller/user/cartController");
const checkoutController = require("../controller/user/checkoutController");

// router.get('/pageNotFound', userController.pageNotFound)
router.get('/signup', userAuth, userController.loadRegister);
router.post('/register', userAuth, userController.registerUser);
router.get('/verify-otp', userAuth, userController.loadVerifyOtp);
router.post('/verify-otp', userAuth,userController.verifyOtp);
router.post('/resend-otp', userAuth, userController.resendOtp);
router.get('/login', userAuth, userController.loadLogin);
router.post('/login', userController.loginUser);
router.get('/forgotPassword', userAuth, userController.loadForgotPassword);
router.post('/forgotPassword', userAuth, userController.forgotPassword);
router.get('/reset-password', userAuth, userController.resetPassword);
router.post('/reset-password', userAuth, userController.saveNewPassword);


router.get('/auth/google', passport.authenticate('google',{scope:['profile','email']}));

router.get(
  '/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    req.session.user = { id: req.user._id};
    res.redirect('/home');
  }
);

router.get('/logout', requireLogin, userController.logout);

//homepage
router.get('/home', productController.getHomePage);
router.get('/products', productController.showProductsPage);
router.get('/products/filter', productController.filterProducts);
router.get('/product/:productId/:variantId', requireLogin, productController.getProductDetails);


//Profile
router.get('/profile', requireLogin, profileController.loadProfile);
router.get('/edit-profile', requireLogin, profileController.getEditProfile);
router.get('/profile/change-username', requireLogin, profileController.getChangeUserName);
router.post('/profile/change-username', requireLogin, profileController.changeUserName);
router.get('/profile/change-email', requireLogin, profileController.getChangeEmail);
router.post('/profile/change-email', requireLogin, profileController.changeEmail);


//Address
router.get('/address', requireLogin, addressController.getAddress);
router.post('/address/save', requireLogin, addressController.saveAddress);
router.delete('/address/:id', requireLogin, addressController.deleteAddress);
router.patch("/address/set-default/:id", requireLogin, addressController.setDefault);


//Cart
router.get('/cart', requireLogin, cartController.getCart);
router.post('/cart/add', requireLogin, cartController.addToCart);
router.post('/cart/update/:id', requireLogin, cartController.updateCartQuantity);
router.post('/cart/delete/:id', requireLogin, cartController.deleteItem);

//Checkout
router.get('/checkout', requireLogin, checkoutController.getCheckout);

//Order
router.post('/order/placeOrder', requireLogin, checkoutController.createOrder);
//router.get('/order/success/${newOrder._id}', checkoutController.getOrderSuccess)


module.exports = router;