const user = require('../../models/userSchema')
const mongoose = require('mongoose')
const Category = require("../../models/categorySchema")
const Product = require("../../models/productSchema")
const Brand = require("../../models/brandSchema")
const env = require('dotenv').config()
const nodemailer = require('nodemailer')
const otpgenerator = require('otp-generator')
const bcrypt = require('bcrypt')
const path = require('path');
const sharp = require('sharp');
const fs = require('fs').promises;





// const getProductDetailsPage = async (req, res) => {
//     try {
//         const productId = req.query.id; 
//         const product = await Product.findById(productId).populate('category');
//         const sessionUser = req.user ? req.user.email : req.session.user?.email;
//         const categories = await Category.find({ isListed: true });

//         if (!product) {
//             return res.redirect("/pageNotFound");
//         }

//         let userData = null;
//         if (sessionUser) {
//             userData = await user.findOne({ email: sessionUser });
//         }
//         const relatedProducts = await Product.find({
            
//             $or: [
//                  { category: product.category._id },
//                 { brand: product.brand }
//             ],
//             _id: { $ne: product._id }, // Exclude the current product
            
//             isBlocked: false,
//             category: { $in: categories.map(category => category._id) },
//             quantity: { $gt: 0 }
//         }).sort({createdAt:-1})
//         .limit(3); // Limit the number of related products displayed

//         res.render("product-details", {
//             product: product,
//             relatedProducts: relatedProducts, 
//             user: userData,
//             // products: relatedProducts 
//         });
//     } catch (error) {
//         console.error(error);
//         res.redirect("/pageNotFound");
//     }
// };


const getProductDetailsPage = async (req, res) => {
    try {
        const productId = req.params.id || req.query.id; ; // Fetch product ID from query parameters
        const product = await Product.findById(productId).populate('category');
        const sessionUser = req.user ? req.user.email : req.session.user?.email;
        const categories = await Category.find({ isListed: true });

        if (!product) {
            return res.redirect("/pageNotFound"); // Redirect if the product is not found
        }

        let userData = null;
        if (sessionUser) {
            userData = await user.findOne({ email: sessionUser });
        }

        // Fetch related products based on the category and brand
        const relatedProducts = await Product.find({
            $or: [
                { category: product.category._id }, // Match by category
                { brand: product.brand } // Match by brand
            ],
            _id: { $ne: product._id }, // Exclude the current product
            isBlocked: false, // Ensure the product is not blocked
            category: { $in: categories.map(category => category._id) }, // Limit to listed categories
            quantity: { $gt: 0 } // Ensure there is quantity available
        })
        .sort({ createdAt: -1 }) // Sort by creation date, newest first
        .limit(3); // Limit to 3 related products

        // Render the product details page with the product and related products
        res.render("product-details", {
            product: product,
            relatedProducts: relatedProducts,
            user: userData,
            title: product.productName // Set the title to the product name
        });
    } catch (error) {
        console.error('Error fetching product details:', error.message);
        res.redirect("/pageNotFound"); // Redirect on error
    }
};


// const getAllProducts = async (req, res) => {
//     try {
//         const { category, sort, search } = req.query;

//         // Fetch categories
//         const categories = await Category.find({ isListed: true });

//         // Determine session user email
//         const sessionUser = req.user ? req.user.email : req.session.user?.email;

//         // Build query
//         let query = {
//             isBlocked: false,
//             category: { $in: categories.map(category => category._id) },
//             quantity: { $gt: 0 }
//         };

//         // Apply category filter if provided
//         if (category) {
//             const selectedCategory = await Category.findOne({ name: category, isListed: true });
//             if (selectedCategory) {
//                 query.category = selectedCategory._id;
//             }
//         }

//         // Apply search filter if provided
//         if (search) {
//             query.productName = { $regex: new RegExp(search, 'i') };
           
//         }
        

//         // Determine sort option
//         let sortOption = { createdAt: -1 }; // Default sort (most recent)
//         if (sort === 'low-high') {
//             sortOption = { salePrice: 1 }; // Sort by price low to high
//         } else if (sort === 'high-low') {
//             sortOption = { salePrice: -1 }; // Sort by price high to low
//         } else if (sort === 'az') {
//             sortOption = { productName: 1 }; // Sort by name A to Z
//         } else if (sort === 'za') {
//             sortOption = { productName: -1 }; // Sort by name Z to A
//         }

//         // Fetch products
//         const products = await Product.find(query).sort(sortOption);

//         // Fetch user data if sessionUser exists
//         let userData = null;
//         if (sessionUser) {
//             userData = await user.findOne({ email: sessionUser });
//         }

//         // Render the products page
//         res.render("allProducts", {
//             products: products,
//             user: userData,
//             categories: categories,
//             currentCategory: category || 'All',
//             currentSort: sort || 'default',
//             currentSearch: search || ''
//         });
//     } catch (error) {
//         console.error('Error fetching all products:', error);
//         res.redirect("/pageNotFound");
//     }
// };


const getAllProducts = async (req, res) => {
    try {
        const { category, sort, search } = req.query;

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

        // Apply search filter if provided
        if (search) {
            query.productName = { $regex: new RegExp(search, 'i') };
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

        // Render the products page with the current category
        res.render("allProducts", {
            products: products,
            user: userData,
            categories: categories,
            currentCategory: category || 'All', // Ensure currentCategory is passed
            currentSort: sort || 'default',
            currentSearch: search || ''
        });
    } catch (error) {
        console.error('Error fetching all products:', error);
        res.redirect("/pageNotFound");
    }
};


const searchProducts = async (req, res) => {
    try {
        const { query, page = 1, limit = 20, category, sort } = req.query; // Changed from 'search' to 'query'
        
        console.log('Search Query:', query); // Log the actual query parameter
        
        let searchQuery = {};

        // Define the search query based on the query parameter
        if (query) {
            searchQuery = {
                $and: [
                    { isBlocked: false },
                    {
                        $or: [
                            { productName: { $regex: query, $options: 'i' } },
                            { description: { $regex: query, $options: 'i' } },
                            { brand: { $regex: query, $options: 'i' } },
                            { color: { $regex: query, $options: 'i' } },
                            { size: { $regex: query, $options: 'i' } }
                        ]
                    }
                ]
            };
        } else {
            searchQuery = { isBlocked: false };
        }

        // Get total count for pagination
        const totalCount = await Product.countDocuments(searchQuery);

        // Fetch products with populated category
        const products = await Product.find(searchQuery)
            .populate('category')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        // Process products to include correct image paths
        const processedProducts = products.map(product => ({
            ...product.toObject(),
            productImage: product.productImage && product.productImage.length > 0
                ? path.join('/uploads/product-images', product.productImage[0])
                : '/placeholder-image.jpg'
        }));

        console.log('Products found:', products.length);

        // Determine current values
        const currentCategory = category || 'All';
        const currentSort = sort || 'default';

        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.json({
                success: true,
                products: processedProducts,
                count: totalCount,
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalCount / limit),
            });
        }

        // Render products page with search results
        return res.render('allProducts', {
            products: processedProducts,
            searchQuery: query || '',
            user: req.user,
            title: query ? `Search results for "${query}"` : 'All Products',
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalCount / limit),
            currentCategory,
            currentSort,
            categories: await Category.find({}),
        });

    } catch (error) {
        console.error('Error in searchProducts function:', error.message);
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.status(500).json({
                success: false,
                error: 'Error searching products',
            });
        }
        res.status(500).render('error', {
            error: 'Error searching products',
        });
    }
};


// Get search suggestions
const getSearchSuggestions = async (req, res) => {
    try {
        const { query } = req.query;
        
        if (!query) {
            return res.json([]); // Return an empty array if no query is provided
        }

        // Modified search query to only look for products that start with the search term
        const searchQuery = {
            $and: [
                { isBlocked: false },
                {
                    $or: [
                        // Using ^ in regex to match from the start of the string
                        { productName: { $regex: `^${query}`, $options: 'i' } },
                        { brand: { $regex: `^${query}`, $options: 'i' } }
                    ]
                }
            ]
        };

        // Fetch suggestions with populated category and selected fields
        const suggestions = await Product.find(searchQuery)
            .populate('category')
            .select('productName brand category salePrice productImage')
            .limit(5);

        // Process suggestions to include correct image paths
        const processedSuggestions = suggestions.map(suggestion => ({
            ...suggestion.toObject(),
            productImage: suggestion.productImage && suggestion.productImage.length > 0
                ? path.join('/uploads/product-images', suggestion.productImage[0])
                : '/placeholder-image.jpg'
        }));

        res.json(processedSuggestions);
        
    } catch (error) {
        console.error('Error in getSearchSuggestions function:', error.message);
        res.status(500).json({ error: 'Error getting suggestions' });
    }
};
// Update the getSearchSuggestions function
// const getSearchSuggestions = async (req, res) => {
//     try {
//         const { query } = req.query;
        
//         console.log('Received search query:', query); // Add this for debugging
        
//         if (!query) {
//             return res.json([]); // Return an empty array if no query is provided
//         }

//         const searchQuery = {
//             $and: [
//                 { isBlocked: false },
//                 {
//                     $or: [
//                         { productName: { $regex: query, $options: 'i' } },
//                         { brand: { $regex: query, $options: 'i' } }
//                     ]
//                 }
//             ]
//         };

//         // Fetch suggestions with populated category and selected fields
//         const suggestions = await Product.find(searchQuery)
//             .populate('category')
//             .select('productName brand category salePrice productImage')
//             .limit(5);

//         console.log('Found suggestions:', suggestions.length); // Add this for debugging

//         // Process suggestions to include correct image paths
//         const processedSuggestions = suggestions.map(suggestion => ({
//             ...suggestion.toObject(),
//             productImage: suggestion.productImage && suggestion.productImage.length > 0
//                 ? path.join('/uploads/product-images', suggestion.productImage[0])
//                 : '/placeholder-image.jpg'
//         }));

//         res.json(processedSuggestions);
        
//     } catch (error) {
//         console.error('Error in getSearchSuggestions function:', error.message);
//         res.status(500).json({ error: 'Error getting suggestions' });
//     }
// };


module.exports ={
    getProductDetailsPage,
    getAllProducts,
    searchProducts,
    getSearchSuggestions,
    
    
}