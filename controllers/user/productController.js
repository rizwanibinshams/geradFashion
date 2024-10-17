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
        const { category, sort } = req.query;

        // Fetch categories
        const categories = await Category.find({ isListed: true });

        // Determine session user email
        const sessionUser = req.user ? req.user.email : req.session.user?.email;

        // Build query
        let query = {
            isBlocked: false,
            category: { $in: categories.map(category => category._id) },
            quantity: { $gt: 0 }
        };

        // Apply category filter if provided
        if (category) {
            const selectedCategory = await Category.findOne({ name: category, isListed: true });
            if (selectedCategory) {
                query.category = selectedCategory._id;
            }
        }

        // Determine sort option
        let sortOption = { createdAt: -1 }; // Default sort (most recent)
        if (sort === 'low-high') {
            sortOption = { salePrice: 1 }; // Sort by price low to high
        } else if (sort === 'high-low') {
            sortOption = { salePrice: -1 }; // Sort by price high to low
        } else if (sort === 'az') {
            sortOption = { productName: 1 }; // Sort by name A to Z
        } else if (sort === 'za') {
            sortOption = { productName: -1 }; // Sort by name Z to A
        }

        // Fetch products
        const products = await Product.find(query).sort(sortOption);

        // Fetch user data if sessionUser exists
        let userData = null;
        if (sessionUser) {
            userData = await user.findOne({ email: sessionUser });
        }

        // Render the products page
        res.render("allProducts", {
            products: products,
            user: userData,
            categories: categories,
            currentCategory: category || 'All',
            currentSort: sort || 'default'
        });
    } catch (error) {
        console.error('Error fetching all products:', error);
        res.redirect("/pageNotFound");
    }
};


module.exports ={
    getProductDetailsPage,
    getAllProducts
}