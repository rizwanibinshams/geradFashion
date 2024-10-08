const express = require('express')
const router = express.Router()
const adminController = require('../controllers/admin/adminController')
const auth = require('../middlewares/auth')
const customerController = require('../controllers/admin/customerController')
const categoryController = require('../controllers/admin/categoryController')
const brandController = require("../controllers/admin/brandController")
const productController = require("../controllers/admin/productController")
const multer = require("multer")
const storage = require("../helpers/multer")
const uploads = multer({storage:storage})


router.get('/pageerror',adminController.pageerror)

//login management
router.get('/login',adminController.loadLogin)
router.post('/login',adminController.login)
router.get('/',auth.adminAuth,adminController.loadDashboard)
router.get('/logout',adminController.logout)

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
module.exports = router           