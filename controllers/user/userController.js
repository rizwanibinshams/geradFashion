
const user = require('../../models/userSchema')
const mongoose = require('mongoose')
const Category = require("../../models/categorySchema")
const Product = require("../../models/productSchema")
const Address = require("../../models/addressSchema")
const {Order} = require("../../models/orderSchema"); 
const Wallet = require("../../models/walletSchema")
const Coupon = require("../../models/couponSchema")
const env = require('dotenv').config()
const nodemailer = require('nodemailer')
const otpgenerator = require('otp-generator')
const bcrypt = require('bcrypt')
const path = require("path");





const loadHomepage = async (req, res) => {
    try {
        const { search, category } = req.query;
        const sessionUser = req.user ? req.user.email : req.session.user?.email;

        console.log("Session User Email:", sessionUser);

        // Fetch categories (needed for category filter)
        const categories = await Category.find({ isListed: true });

        // Build the base query
        let baseQuery = {
            isBlocked: false,
            quantity: { $gt: 0 }  // Only show products with stock
        };

        // Add category filter if a category is provided
        if (category) {
            const selectedCategory = await Category.findOne({ name: category });
            if (selectedCategory) {
                baseQuery.category = selectedCategory._id;
            }
        } else {
            // If no category is selected, show all categories
            baseQuery.category = { $in: categories.map(cat => cat._id) };
        }

        // Add search condition if search query is provided
        if (search) {
            baseQuery.productName = { $regex: new RegExp(search, 'i') };
        }

        // Fetch the latest products (limit 4)
        let productData = await Product.find(baseQuery)
            .sort({ createdAt: -1 })
            .limit(4);

        let userData = null;

        if (sessionUser) {
            userData = await user.findOne({ email: sessionUser });
        }

        // Fetch Best Seller Products
        const bestSellerPipeline = [
            {
                $match: baseQuery
            },
            {
                $lookup: {
                    from: 'orders',
                    localField: '_id',
                    foreignField: 'orderedItems.product',
                    as: 'orderInfo'
                }
            },
            {
                $unwind: {
                    path: '$orderInfo',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $unwind: {
                    path: '$orderInfo.orderedItems',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $match: {
                    'orderInfo.orderedItems.product': { $exists: true }
                }
            },
            {
                $group: {
                    _id: '$_id',
                    productName: { $first: '$productName' },
                    productImage: { $first: '$productImage' },
                    regularPrice: { $first: '$regularPrice' },
                    salePrice: { $first: '$salePrice' },
                    rating: { $first: '$rating' },
                    totalSold: { $sum: '$orderInfo.orderedItems.quantity' }
                }
            },
            {
                $match: {
                    totalSold: { $gt: 0 }
                }
            },
            {
                $sort: { totalSold: -1 }
            },
            {
                $limit: 4
            }
        ];

        const bestSellerData = await Product.aggregate(bestSellerPipeline);

        // Render home page with user data, latest products, and best sellers
        return res.render('home', {
            user: userData || null,
            products: productData,
            bestSellers: bestSellerData,
            categories, // Pass categories to the view for rendering
            currentSearch: search || '',
            currentCategory: category || ''
        });
    } catch (error) {
        console.error('Home page loading error:', error);
        res.status(500).send('Server error');
    }
};


const pageNotFound = async (req,res)=>{
    try {
        res.render('page-404')
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}

const loadSignup = async (req,res)=>{
    try {
       
        return res.render('signup')
    } catch (error) {
        console.log('home page not loading',error);
        res.status(500).end('server error')

    }
}


function generateOtp(){
    return otpgenerator.generate(6,{upperCaseAlphabets:false,specialChars:false,lowerCaseAlphabets:false})
}

async function sendVerificationEmail(email, otp) {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            port: 587,
            secure: false, 
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD,
            },
        });

        const mailOptions = {
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: 'Verify Your Account',
            text: `Your OTP is ${otp}`,
            html: `
             <h1> Welcome to Gerad </h1>
            <b>Your OTP: ${otp}</b>`,
        };
        const info = await transporter.sendMail(mailOptions)

        console.log('Email sent: %s', info.messageId);  
        return true;
    } catch (error) {
        console.error('Error sending email:', error.message);  // Log the detailed error
        return false;
    }
}



 

const signup = async (req,res)=>{
    try {
     
        
        const {name,phone,email,password,cPassword} = req.body
        console.log(email);
        if(password !== cPassword){

            return res.render('signup',{message:'password not matched'})
        }
       const findUser =  await user.findOne({email})
       
        
        if(findUser){
            return res.render('signup',{message:'user with this email already exist'})
        }
        const otp = generateOtp()
        console.log('OTP sent',otp);
        const emailSent = await sendVerificationEmail(email,otp)
        console.log(emailSent);

        if(!emailSent){
            console.log("Email sending failed for OTP", otp);
             return res.json('email-error')
        }
        req.session.userOtp = otp;
        req.session.userData = {name,phone, email, password };
        console.log("Session data:", req.session.userOtp, req.session.userData);
        
     res.render("verify-otp")
        console.log('OTP sent',otp);

    } catch (error) {
        console.error('signp error',error)
        res.redirect('/pageNotFound')
    }
}


const securePassword = async (password)=>{
    try {
        const passwordHash =await bcrypt.hash(password,10)
        return passwordHash;
    } catch (error) {
        
    }
}
const verifyOtp = async (req, res) => {
    try {
        const { otp } = req.body;  // OTP entered by the user

        
        const enteredOtp = String(otp).trim();
        const sessionOtp = String(req.session.userOtp).trim();

        console.log('Entered OTP:', enteredOtp);  
        console.log('Session OTP:', sessionOtp);  

        // Compare entered OTP and session OTP
        if (enteredOtp === sessionOtp) {
            const userData = req.session.userData;
            console.log('User data from session:', userData);  

            
            try {
                const passwordHash = await securePassword(userData.password); 

                
                const newUser = new user({
                    name: userData.name,
                    email: userData.email,
                    phone: userData.phone,
                    password: passwordHash 
                });
                console.log(newUser);

                // Save user data to the database
                await newUser.save();  
                req.session.user = newUser._id;  

                return res.json({ success: true, redirectUrl: "/" });
            } catch (hashError) {
                console.error('Error hashing password:', hashError);
                return res.status(500).json({ success: false, message: 'Error processing password' });
            }
        } else {
            console.log('Invalid OTP:', enteredOtp, 'Expected OTP:', sessionOtp);
            return res.status(400).json({ success: false, message: 'Invalid OTP, please try again' });
        }

    } catch (error) {
        console.error('Error verifying OTP:', error);
        return res.status(500).json({ success: false, message: 'An error occurred while verifying OTP' });
    }
};

const resendOtp = async (req,res)=>{
    try {
        const {email}= req.session.userData;
        if(!email){
            return res.status(400).json({success:false,message:'Email not found in session'})
        }
        const otp = generateOtp()
        req.session.userOtp = otp;
        const emailSent = await sendVerificationEmail(email,otp)
        if(emailSent){
            console.log('resend otp ',otp);
            res.status(200).json({success:true,message:'OTP Resend successfully'})
            
        }else{
            res.status(500).json({success:false,message:'failed to resend otp,please try again'})
        }
    } catch (error) {
        console.error('error sending OTP',error)
        res.status(500).json({success:false,message:'internal server error,please try again'})
    }
}

const loadLogin = async (req, res) => {
    try {
        if (!req.session.user || !req.session.user.id) {
            return res.render('login');
        } else {
            res.redirect('/');
        }
    } catch (error) {
        res.redirect('/pageNotFound');
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const findUser = await user.findOne({ isAdmin: 0, email: email });
        if (!findUser) {
            return res.render('login', { message: 'User not found' });
        }
        if (findUser.isBlocked) {
            return res.render('login', { message: 'User is blocked by admin' });
        }
        const passwordMatch = await bcrypt.compare(password, findUser.password);
        if (!passwordMatch) {
            return res.render('login', { message: 'Incorrect password' });
        }
const products = await Product.find()
        // Set session user
        req.session.user = {
            id: findUser._id,    // Save the user ID
            email: findUser.email // Save the email for reference
        };
        
        console.log("User logged  :", req.session.user); 
        
        res.redirect("/")
    } catch (error) {
        console.error('Login error:', error);
        res.render('login', { message: 'Login failed, please try again' });
    }
};

const logout = async (req,res)=>{
    try {
        req.session.destroy((err)=>{
            if(err){
                console.log('Session destroying failed',err.message);
                res.redirect('/pageNotFound')
            }
            return res.redirect('/')
        })
    } catch (error) {
        console.log('logout error',error);
        res.redirect('/pageNotFound')
    }
}


// Example controller function for loading the profile page
// const loadProfile = async (req, res) => {
//     try {
//         console.log("Session User:", req.session.user);
      
//         if (!req.session.user) {
//             console.log("User not logged in");
//             return res.redirect('/login');
//         }
        
//         const userData = await user.findById(req.session.user.id);
//         if (!userData) {
//             console.log("User not found");
//             return res.status(404).render('page-404', { message: 'User not found' });
//         }

//         const addresses = await Address.find({ userId: userData.id });
//         console.log("Addresses:", addresses);

//         const orders = await Order.find({ user: userData._id })
//             .populate('orderedItems.product')
//             .sort({ createdOn: -1 });

//         console.log("Orders:", orders);

//         if (orders.length === 0) {
//             console.log("No orders found for this user");
//         }

//         // Fetch wallet information
//         let wallet = await Wallet.findOne({ userId: userData._id });
//         if (!wallet) {
//             // If wallet doesn't exist, create a new one
//             wallet = new Wallet({
//                 userId: userData._id,
//                 balance: 0,
//                 transactionHistory: []
//             });
//             await wallet.save();
//         }

//         res.render('profile', { 
//             user: userData, 
//             addresses: addresses, 
//             orders: orders,
//             wallet: wallet,
//             helpers: {
//                 formatDate: function(date) {
//                     return new Date(date).toLocaleDateString('en-US', {
//                         year: 'numeric', 
//                         month: 'long', 
//                         day: 'numeric'
//                     });
//                 }
//             }
//         });
//     } catch (error) {
//         console.error('Error loading profile:', error);
//         res.status(500).render('page-404', { message: 'Server error occurred' });
//     }
// };


const loadProfile = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/login');
        }
        
        const userData = await user.findById(req.session.user.id);
        if (!userData) {
            return res.status(404).render('page-404', { message: 'User not found' });
        }

        const addresses = await Address.find({ userId: userData.id });
        
        // Fetch ALL orders for the user without coupon filter
        const orders = await Order.find({ 
            user: userData._id
        })
        .populate({
            path: 'orderedItems.product',
            select: 'productName price productImage images' 
        })
        .sort({ createdOn: -1 });

        const processedOrders = orders.map(order => {
            const orderObj = order.toObject();
            orderObj.orderedItems = order.orderedItems.map(item => {
                const productImage = item.product.productImage && item.product.productImage.length > 0
                    ? path.join('/uploads/product-images', item.product.productImage[0])
                    : '/placeholder-image.jpg';
                
                return {
                    _id: item._id,
                    product: item.product,
                    quantity: item.quantity,
                    price: item.price,
                    status: item.status || 'Pending',
                    productImage: productImage,
                };
            });
            return orderObj;
        });

        // Extract coupon history only from orders that used coupons
        const couponHistory = orders
            .filter(order => order.coupon && order.coupon.applied)
            .map(order => ({
                orderId: order.orderId,
                couponCode: order.coupon.code,
                discountAmount: order.coupon.discountAmount,
                orderTotal: order.totalPrice,
                finalAmount: order.finalAmount,
                usedOn: order.createdOn
            }));

        let wallet = await Wallet.findOne({ userId: userData._id });
        if (!wallet) {
            wallet = new Wallet({
                userId: userData._id,
                balance: 0,
                transactionHistory: []
            });
            await wallet.save();
        }

        res.render('profile', { 
            user: userData, 
            addresses: addresses, 
            orders: processedOrders,
            wallet: wallet,
            couponHistory: couponHistory,
            helpers: {
                formatDate: function(date) {
                    return new Date(date).toLocaleDateString('en-US', {
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric'
                    });
                },
                formatCurrency: function(amount) {
                    if (amount === undefined || amount === null) {
                        console.log('Undefined/null amount detected');
                        return '₹0.00';
                    }
                    return '₹' + Number(amount).toFixed(2);
                }
            }
        });
    } catch (error) {
        console.error('Error loading profile:', error);
        res.status(500).render('page-404', { message: 'Server error occurred' });
    }
};


const updateProfile = async (req, res) => {
    try {
        const { name, email, phone } = req.body; // Extract data from the request body
        const userId = req.user.id; // Assuming user ID is set in the request user object from middleware

        // Validate input data
        if (!name || !email || !phone) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Find and update the user profile
        const updatedUser = await user.findByIdAndUpdate(
            userId,
            { name, email, phone },
            { new: true, runValidators: true } // Return the updated document
        );

        if (!updatedUser) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Redirect to profile page after update with a query parameter
        res.redirect('/profile?update=success');
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ error: 'An error occurred while updating the profile' });
    }
};
const success = async (req, res) => {
    try {
        const orderId = req.query.orderId;

        // Use `findOne` with the `orderId` field since it's a UUID string
        const order = await Order.findOne({ orderId: orderId });
        
        // Check if the order exists
        if (!order) {
            return res.status(404).send("Order not found");
        }

        res.render("success", { order });
    } catch (error) {
        console.error(error);
        res.status(500).send("An error occurred");
    }
};

const loadContact = async (req,res)=>{
    try {
        const userId = req.session.user?.id;
        const userData = await user.findById(userId);
        res.render("contact",{
            user: userData,
            userEmail: req.session.user?.email
        })
    } catch (error) {
        console.error(error)
    }
}

const loadAbout= async (req,res)=>{
    try {
        res.render("about")
    } catch (error) {
        console.log(error);
        
    }
}


module.exports={
    loadHomepage,
    pageNotFound,
    loadSignup,
    signup,
    verifyOtp,
    resendOtp,
    loadLogin,
    login,
    logout,
    loadProfile,
    updateProfile,
    success,
    loadContact,
    loadAbout
    
    
}