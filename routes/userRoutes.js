const express = require("express");
const router = express.Router();
const {userAuth, requireLogin} = require("../middleware/userAuth");
const userController = require("../controller/user/userController");
const homepageController = require("../controller/user/hompageController");
const productController = require("../controller/user/productController");
const passport = require("passport");

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
// router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/signup'}),
// (req,res)=>{
//     res.redirect('/home');
// });

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
router.get('/home', requireLogin, productController.loadHomePage);
router.get('/products', requireLogin, productController.loadShowPage);
router.get('/products/filter', requireLogin, productController.filteredShowPage);
router.get('/product/:productId/:variantId', requireLogin, productController.loadProductDetails);
// router.get("/products", productController.loadProducts);

module.exports = router;