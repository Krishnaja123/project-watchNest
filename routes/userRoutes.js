const express = require("express");
const router = express.Router();
const userController = require("../controller/userController")
const passport = require("passport");

// router.get('/pageNotFound', userController.pageNotFound)
router.get('/home', userController.loadHome);
router.get('/signup', userController.loadRegister);
router.post('/register', userController.registerUser);
router.get('/verify-otp', userController.loadVerifyOtp);
router.post('/verify-otp', userController.verifyOtp);
router.post('/resend-otp',userController.resendOtp);
router.get('/login',userController.loadLogin);
router.post('/login',userController.loginUser);
router.get('/forgotPassword', userController.loadForgotPassword);
router.post('/forgotPassword', userController.forgotPassword);
router.get('/reset-password', userController.resetPassword);
router.post('/reset-password', userController.saveNewPassword);


router.get('/auth/google', passport.authenticate('google',{scope:['profile','email']}));
router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/signup'}),
(req,res)=>{
    res.redirect('/home');
})

module.exports = router;