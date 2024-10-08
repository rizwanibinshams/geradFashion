const user = require('../../models/userSchema')
const mongoose = require('mongoose')
const Category = require("../../models/categorySchema")
const Product = require("../../models/productSchema")
const env = require('dotenv').config()
const nodemailer = require('nodemailer')
const otpgenerator = require('otp-generator')
const bcrypt = require('bcrypt')






const getProductDetailsPage = async (req, res) => {
    try {
        const productId = req.query.id; 
        const product = await Product.findById(productId).populate('category');
        const user = req.session.user || null;
        const categories = await Category.find({ isListed: true });

        if (!product) {
            return res.redirect("/pageNotFound");
        }

        
        const relatedProducts = await Product.find({
            
            $or: [
                 { category: product.category._id },
                { brand: product.brand }
            ],
            _id: { $ne: product._id }, // Exclude the current product
            
            isBlocked: false,
            category: { $in: categories.map(category => category._id) },
            quantity: { $gt: 0 }
        }).sort({createdAt:-1})
        .limit(3); // Limit the number of related products displayed

        res.render("product-details", {
            product: product,
            relatedProducts: relatedProducts, 
            user: user,
            // products: relatedProducts 
        });
    } catch (error) {
        console.error(error);
        res.redirect("/pageNotFound");
    }
};


const getAllProducts = async (req, res) => {
    try {
        // Fetch categories
        const categories = await Category.find({ isListed: true });

        // Determine session user email; ensure to access email correctly
        const sessionUser = req.user ? req.user.email : req.session.user?.email;

        // Fetch products based on categories and conditions
        let products = await Product.find({
            isBlocked: false,
            category: { $in: categories.map(category => category._id) },
            quantity: { $gt: 0 }
        })
        .sort({ createdAt: -1 }); // Sort products by creation date (most recent first)

        let userData = null;
        // Fetch user data if sessionUser exists
        if (sessionUser) {
            userData = await user.findOne({ email: sessionUser }); // Ensure User is the correct model
        }

        // Render the products and user data
        res.render("allProducts", {
            products: products,
            user: userData || null // Pass user data to the view
        });
    } catch (error) {
        console.error('Error fetching all products:', error);
        res.redirect("/pageNotFound"); // Redirect to an error page on failure
    }
};



module.exports ={
    getProductDetailsPage,
    getAllProducts
}