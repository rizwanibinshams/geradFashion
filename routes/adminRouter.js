const express = require('express')
const router = express.Router()
const adminController = require('../controllers/admin/adminController')
const auth = require('../middlewares/auth')
const customerController = require('../controllers/admin/customerController')
const categoryController = require('../controllers/admin/categoryController')
const brandController = require("../controllers/admin/brandController")
const productController = require("../controllers/admin/productController")
const orderController = require("../controllers/admin/orderController")
const couponController = require("../controllers/admin/couponController")
const dashboardController = require("../controllers/admin/dashboardController")
const returnsController = require("../controllers/user/returnsController")
const multer = require("multer")
const storage = require("../helpers/multer")
const uploads = multer({storage:storage})


router.get('/pageerror',adminController.pageerror)

//login management
router.get('/login',adminController.loadLogin)
router.post('/login',adminController.login)
//router.get('/',auth.adminAuth,adminController.loadDashboard)
router.get('/logout',adminController.logout)


router.get('/', auth.adminAuth,dashboardController.getDashboard);
router.get('/dashboard/data',dashboardController.getDashboardData);
router.get('/download', dashboardController.downloadReport);
// router.get('/sales-report', auth.adminAuth, dashboardController.getSalesReport);
// router.get('/download-report', auth.adminAuth, dashboardController.downloadReport);

//customer management

router.get('/users',customerController.customerInfo)
router.get('/blockCustomer',auth.adminAuth,customerController.customerBlocked)
router.get('/unblockCustomer',auth.adminAuth,customerController.customerunBlocked)
router.get("/deleteCustomer",auth.adminAuth,customerController.deleteCustomer)
router.get('/category',auth.adminAuth,categoryController.categoryInfo)
router.post('/addCategory',auth.adminAuth,categoryController.addCategory)
router.post('/addCategoryOffer',auth.adminAuth,categoryController.addCategoryOffer)
router.post('/removeCategoryOffer',auth.adminAuth,categoryController.removeCategoryOffer)
router.get("/listCategory",auth.adminAuth,categoryController.getListCategory)
router.get("/unlistCategory",auth.adminAuth,categoryController.getUnlistCategory)
router.get("/editCategory",auth.adminAuth,categoryController.getEditCategory)
router.post("/editCategory/:id",auth.adminAuth,categoryController.editCategory)
router.get('/deleteCategory',auth.adminAuth,categoryController.deleteCategory)


// brand management

router.get("/brands",auth.adminAuth,brandController.getBrandPage)
router.post('/addBrand',auth.adminAuth,uploads.single("image"),brandController.addBrand)
router.get('/blockBrand',auth.adminAuth,brandController.blockBrand)
router.get('/unBlockBrand',auth.adminAuth,brandController.unBlockBrand)
router.get('/deleteBrand',auth.adminAuth,brandController.deleteBrand)


//product managements

router.get('/addProducts',auth.adminAuth,productController.getProductAddPage)
router.post("/addProducts",auth.adminAuth,uploads.array("images",4),productController.addProducts)
router.get("/products",auth.adminAuth,productController.getAllProducts)
router.post("/addProductOffer",auth.adminAuth,productController.addProductOffer)
router.post("/removeProductOffer",auth.adminAuth,productController.removeProductOffer)
router.get("/blockProduct",auth.adminAuth,productController.blockProduct)
router.get("/unblockProduct",auth.adminAuth,productController.unblockProduct)
router.get("/editProduct",auth.adminAuth,productController.getEditProduct)
router.post("/editProduct/:id",auth.adminAuth,uploads.array("images",4),productController.editProduct)
router.post("/deleteImage",auth.adminAuth,productController.deleteSingleImage)


//order mangement 


router.get("/order",auth.adminAuth, orderController.getAllOrders)
router.post('/update-order-status',auth.adminAuth, orderController.updateOrderStatus);

// Return routes

router.put('/orders/return', returnsController.updateReturnStatus);
router.get('/returns', returnsController.renderReturnManagementPage);

//coupon management 

router.get('/coupons', auth.adminAuth, couponController.getAllCoupons);
router.post('/coupons', auth.adminAuth, couponController.createCoupon);
router.get('/coupons/:id', auth.adminAuth, couponController.getCouponById);
router.put('/coupons/:id', auth.adminAuth, couponController.updateCoupon);
router.delete('/coupons/:id', auth.adminAuth, couponController.deleteCoupon);

// User route for applying a coupon
// router.post('/applyCoupon',couponController.applyCoupon)


module.exports = router           