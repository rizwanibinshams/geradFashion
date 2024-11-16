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
const couponControllers = require("../controllers/user/couponControllers")
const walletController = require("../controllers/user/walletController")
const paymentsController = require("../controllers/admin/payments.controller")
const returnsController = require("../controllers/user/returnsController")
const infoController = require("../controllers/admin/infoController")
const passport = require('passport')
const auth = require('../middlewares/auth')

//error Management
router.get('/pageNotFound',userController.pageNotFound)
//search 

router.get('/api/products/search',productController.searchProducts)
router.get('/products/suggestions', productController.getSearchSuggestions);

 // Example route to get product details
router.get('/products/:id', productController.getProductDetailsPage);



//Sign Up Management
router.get('/signup',userController.loadSignup)
router.post('/signup',userController.signup)
router.post('/verifyOtp',userController.verifyOtp)
router.post('/resendOtp',userController.resendOtp)
router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}))
// router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/signup'}),(req,res)=>{
//     res.redirect('/')
// })
router.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    // Set session data
    req.session.user = {
      id: req.user._id,
      email: req.user.email,
      name: req.user.name
    };
    
    // Redirect to returnTo URL or default to home
    const returnTo = req.session.returnTo || '/';
    delete req.session.returnTo;
    res.redirect(returnTo);
  }
);


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
router.post("/resend-forgot-otp",profileController.resendOtp)
router.get("/reset-password",profileController.getResetPassPage)

router.post("/reset-password", profileController.postNewPassword);

// Route to display change password page
router.get('/change-password', profileController.getChangePasswordPage);

// Route to handle password change
router.post('/change-password', profileController.changePassword);


// Product Details Page Route
router.get('/productDetails', productController.getProductDetailsPage);


router.get('/products', productController.getAllProducts);


//cart controll

router.get('/cart', auth.isAuthenticated, cartController.getCart);

// Add to cart
router.post('/addToCart', cartController.addToCart);

// Update cart item
router.post('/update', cartController.updateCart);


//Remove cart item
router.delete('/remove/:itemId', cartController.removeFromCart);




router.get('/api/orders/:orderId', orderController.getOrderDetails);

router.get('/profile',userController.loadProfile)

//success page 
router.get("/success",userController.success)




//adressController
router.get("/address",addressController.adres)
//order

router.get("/order",orderController.loadorder)
router.get('/order/:orderId', orderController.loadOrderDetails);

router.get('/addresses',auth.AdressMiddleware, addressController.getAddresses);

// Get a single address by ID
router.get('/addresses/:id',auth.AdressMiddleware, addressController.getAddressById);

// Add a new address
router.post('/addAddress',auth.AdressMiddleware,  addressController.addAddress);

// Edit an existing address
router.put('/addresses/:id',auth.AdressMiddleware, addressController.editAddress);

// Remove an address
router.delete('/addresses/:id',auth.AdressMiddleware, addressController.removeAddress);

// default adress 
router.post("/setDefaultAddress/:addressId", addressController.setDefaultAddress);

//user edited

router.post('/update-profile',auth.AdressMiddleware,userController.updateProfile)

router.post("/CheckoutaddAddress",addressController.CheckoutaddAddress)


//checkout page 

router.get('/checkout',checkoutController.getCheckoutPage)


//place order
router.post('/place-order', orderController.placeOrder);


router.post('/orders/:orderId/items/:itemId/cancel', orderController.cancelOrderItem);

//return 
router.post('/api/orders/return', returnsController.initiateReturn);

// wishlist 
router.post('/wishlist/add', wishlistController.addToWishlist);
router.delete('/wishlist/remove/:productId', wishlistController.removeFromWishlist);
router.get('/wishlist', wishlistController.getWishlist);

//donwload invoice 
router.get('/orders/:id/invoice', orderController.downloadInvoice);

//about page

router.get("/about",userController.loadAbout)


// Route to add money to the wallet
router.post('/wallet/add', walletController.addMoneyToWallet);
router.get('/wallet', walletController.getWallet);
// Route to view wallet balance
router.get('/wallet/:userId/balance', walletController.getWalletBalance);
router.get('/get-wallet-balance', walletController.getWalletBalance);
router.post('/process-wallet-payment', walletController.processWalletPayment);
router.post('/add-money-to-wallet',  walletController.addMoneyToWallet);
router.get('/wallet-transactions', walletController.getTransactionHistory);

// Route to deduct money from the wallet (if needed)
// router.post('/wallet/deduct', walletController.deductMoneyFromWallet);

// User route for applying a coupon
router.get("/coupon",couponControllers.getCouponsPage)
 router.post('/applyCoupon',couponController.applyCoupon)
 router.post('/removeCoupon', couponController.removeCoupon);

 router.get('/track-order/:orderId', orderController.trackOrder);




router.post('/create-razorpay-order',paymentsController.createOrder)
router.post('/verify-payment', paymentsController.verifyPayment);

router.get("/contact",userController.loadContact)


router.get('/api/active-info-tag', infoController.getActiveInfoTag);

module.exports = router