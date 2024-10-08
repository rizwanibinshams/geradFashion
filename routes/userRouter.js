const express = require('express')
const router = express.Router()
const userController = require('../controllers/user/userController')
const profileController = require('../controllers/user/ProfileController')
const productController = require('../controllers/user/productController')
const cartController = require('../controllers/user/cartController');
const orderController = require('../controllers/user/orderController')
const addressController = require('../controllers/user/addressController')
const passport = require('passport')
const auth = require('../middlewares/auth')

//error Management
router.get('/pageNotFound',userController.pageNotFound)


//Sign Up Management
router.get('/signup',userController.loadSignup)
router.post('/signup',userController.signup)
router.post('/verifyOtp',userController.verifyOtp)
router.post('/resendOtp',userController.resendOtp)
router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}))
router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/signup'}),(req,res)=>{
    res.redirect('/')
})


 // Login Management
router.get('/login',userController.loadLogin)
router.post('/login',userController.login)

// Home page and Shoppin Page
router.get('/',userController.loadHomepage)
router.get('/logout',userController.logout)

//Profile mangement

router.get("/forgot-password",profileController.getForgtPassPage)
router.post("/forgot-email-valid",profileController.forgotEmailValid)
router.post("/verify-passForgot-otp",profileController.verifyForgotPassOtp)
router.get("/reset-password",profileController.getResetPassPage)
router.post("/resend-forgot-otp",profileController.resendOtp)
router.post("/reset-password", profileController.postNewPassword);

// Product Details Page Route
router.get('/productDetails', productController.getProductDetailsPage);


router.get('/products', productController.getAllProducts);


//cart controll

router.get('/cart', cartController.getCart);

// Add to cart
router.post('/addToCart', cartController.addToCart);

// Update cart item
router.post('/update', cartController.updateCart);


//Remove cart item
router.delete('/remove/:itemId', cartController.removeFromCart);




// // Clear cart
// router.delete('/clear', cartController.clearCart);


router.get('/profile',userController.loadProfile)


// router.get("/checkout",orderController.checkoutPage)
// router.post('/checkout',orderController.placeOrder)
// router.post('/checkout', addressController.createAddress);



//adressController


router.get('/addresses',auth.AdressMiddleware, addressController.getAddresses);

// Get a single address by ID
router.get('/addresses/:id',auth.AdressMiddleware, addressController.getAddressById);

// Add a new address
router.post('/addAddress',auth.AdressMiddleware,  addressController.addAddress);

// Edit an existing address
router.put('/addresses/:id',auth.AdressMiddleware, addressController.editAddress);

// Remove an address
router.delete('/addresses/:id',auth.AdressMiddleware, addressController.removeAddress);

//user edited

router.post('/update-profile',auth.AdressMiddleware,userController.updateProfile)

module.exports = router