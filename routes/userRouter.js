const express = require('express')
const router = express.Router()
const userController = require('../controllers/user/userController')
const profileController = require('../controllers/user/ProfileController')
const productController = require('../controllers/user/productController')
const cartController = require('../controllers/user/cartController');
const checkoutController = require('../controllers/user/checkoutController')
const addressController = require('../controllers/user/addressController')
const  orderController = require('../controllers/user/orderController')
const wishlistController = require('../controllers/user/wishlistController')
const couponController = require('../controllers/admin/couponController')
const walletController = require("../controllers/user/walletController")
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







router.get('/profile',userController.loadProfile)

//success page 
router.get("/success",userController.success)




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




//checkout page 

router.get('/checkout',checkoutController.getCheckoutPage)


//place order
router.post('/place-order', orderController.placeOrder);
router.post('/orders/:orderId/cancel', orderController.cancelOrder);


// wishlist 
router.post('/wishlist/add', wishlistController.addToWishlist);
router.delete('/wishlist/remove/:productId', wishlistController.removeFromWishlist);
router.get('/wishlist', wishlistController.getWishlist);






// Route to add money to the wallet
router.post('/wallet/add', walletController.addMoneyToWallet);

// Route to view wallet balance
router.get('/wallet/:userId/balance', walletController.getWalletBalance);

// Route to deduct money from the wallet (if needed)
router.post('/wallet/deduct', walletController.deductMoneyFromWallet);

// User route for applying a coupon
 router.post('/applyCoupon',couponController.applyCoupon)

 router.get('/track-order/:orderId', orderController.trackOrder);


module.exports = router