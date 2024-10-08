
const user = require('../../models/userSchema')
const mongoose = require('mongoose')
const Category = require("../../models/categorySchema")
const Product = require("../../models/productSchema")
const Address = require("../../models/addressSchema")
const env = require('dotenv').config()
const nodemailer = require('nodemailer')
const otpgenerator = require('otp-generator')
const bcrypt = require('bcrypt')



const loadHomepage = async (req, res) => {
    try {
        // Correctly retrieve the session user email
        const sessionUser = req.user ? req.user.email : req.session.user?.email;

        // Log the session user for debugging
        console.log("Session User Email:", sessionUser);

        const categories = await Category.find({ isListed: true });

        // Fetch product data based on the categories
        let productData = await Product.find({
            isBlocked: false,
            category: { $in: categories.map(category => category._id) },
            quantity: { $gt: 0 }
        })
        .sort({ createdAt: -1 }) 
        .limit(4);

        let userData = null;

        // Only query for user data if sessionUser is a valid email string
        if (sessionUser) {
            userData = await user.findOne({ email: sessionUser }); // Ensure User is the correct model name
        }

        // Render the homepage with user data and product data
        return res.render('home', { 
            user: userData || null, 
            products: productData 
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

const loadLogin = async (req,res)=>{
    try {
        if(!req.session.user){
            return res.render('login')
        }else{
            res.redirect('/')
        }
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}

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
const loadProfile = async (req, res) => {
    try {
        // Log the session object to debug
        console.log("Session User:", req.session.user);
        

        // Check if the user is logged in
        if (!req.session.user) {
            console.log("User not logged in");
            return res.redirect('/login'); // Redirect to login page if not logged in
        }

        // Fetch the user from the database using the ID stored in the session
        const userData = await user.findById(req.session.user.id); // Ensure 'User' is the correct model

        // Check if the user was found
        if (!userData) {
            console.log("User not found");
            return res.status(404).render('error', { message: 'User not found' }); // Use 404 status code
        }

        // Fetch addresses for the user, assuming you have an Address model
        const addresses = await Address.find({ userId: userData._id });
        console.log(addresses);
        // Render the profile page with user data and addresses
        res.render('profile', { user: userData, addresses }); // Pass addresses to the template
    } catch (error) {
        console.error('Error loading profile:', error);
        res.status(500).render('error', { message: 'Server error occurred' }); // Use 500 status code for server errors
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
    updateProfile
    
    
}