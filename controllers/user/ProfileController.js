const User = require("../../models/userSchema");
const nodemailer = require('nodemailer');
const bcrypt = require("bcrypt");
const env = require("dotenv").config();
const session = require("express-session");
const otpgenerator = require('otp-generator');

function generateOtp() {
    return otpgenerator.generate(6, { upperCaseAlphabets: false, specialChars: false, lowerCaseAlphabets: false });
}

const sendVerificationEmail = async (email, otp) => {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD,
            },
        });

        const mailOptions = {
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: 'Your OTP for password reset',
            text: `Your OTP is ${otp}`,
            html: `<h1>Welcome to Gerad</h1><b>Your OTP: ${otp}</b>`,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent:", info.messageId);

        return true;

    } catch (error) {
        console.error("Error sending email", error);
        return false;
    }
};

const securePassword = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password, 10);
        return passwordHash;
    } catch (error) {
        console.error("Error hashing password:", error);
        throw new Error("Password hashing failed");
    }
};



const getForgtPassPage = async (req, res) => {
    try {
        res.render("forgot-password");
    } catch (error) {
        console.log("Error rendering forgot-password page:", error);
        res.redirect("/pageNotFound");
    }
};

const forgotEmailValid = async (req, res) => {
    try {
        const { email } = req.body;
        const findUser = await User.findOne({ email });
        if (findUser) {
            const otp = generateOtp();
            const emailSent = await sendVerificationEmail(email, otp);
            if (emailSent) {
                req.session.UserOtp = otp;
                req.session.email = email;
                res.render("forgotPass-otp");
                console.log("Reset OTP is:", otp);
            } else {
                res.json({ success: false, message: "Failed to send OTP, please try again" });
            }
        } else {
            res.render("forgot-password", {
                message: "User with this email does not exist",
            });
            console.log("User not found");
        }
    } catch (error) {
        console.log("Error processing forgot password:", error);
        res.redirect("/pageNotFound");
    }
};

const verifyForgotPassOtp = async (req,res)=>{
    try {
          const enteredOtp = req.body.otp;
          

          if(enteredOtp === req.session.UserOtp){
          console.log("entered otp is :", enteredOtp);
            res.json({success:true,redirectUrl : '/reset-password'})
          }else{
         
            res.json({success:false,message:"OTP is not matching"})
          }
    } catch (error) {
        console.log("false");

        res.status(500).json({success:false,message:"An error occured , please try again"})
    }
}


const getResetPassPage = async (req,res)=>{
    try {
        res.render("reset-password")
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}

const resendOtp = async (req, res) => {
    try {
        const otp = generateOtp();
        req.session.UserOtp = otp;  
        const email = req.session.email;

        console.log("Resending OTP to email:", email);
        const emailSent = await sendVerificationEmail(email, otp);
        if (emailSent) {
            console.log('Resent OTP:', otp);
            res.status(200).json({ success: true, message: 'OTP Resent successfully' });
        } else {
            res.status(500).json({ success: false, message: 'Failed to resend OTP, please try again' });
        }
    } catch (error) {
        console.error('Error resending OTP:', error);
        res.status(500).json({ success: false, message: 'Internal server error, please try again' });
    }
};


const postNewPassword = async (req, res) => {
    try {
        const { newPass1, newPass2 } = req.body;
        const email = req.session.email;

        if (!email) {
            console.error("Email not found in session");
            return res.redirect("/forgot-password");
        }

       
        if (newPass1 === newPass2) {
           
            const passwordHash = await securePassword(newPass1);

            const result = await User.updateOne({ email: email }, { $set: { password: passwordHash } });

           

           
            if (result.modifiedCount > 0) {
                console.log("Password successfully updated");
                
               
                req.session.destroy();
                return res.redirect("/login");
            } else {
               
                console.error("Password update failed. Possible reasons: user not found or password already the same.");
                return res.render("reset-password", { message: "Failed to update password" });
            }
        } else {
            console.error("Passwords do not match");
            return res.render("reset-password", { message: "Passwords do not match" });
        }
    } catch (error) {
        console.error("Error updating password:", error);
        return res.redirect("/pageNotFound");
    }
};

 const getChangePasswordPage = async (req, res) => {
    try {
        res.render('change-password', { 
            message: '',
            success: false 
        });
    } catch (error) {
        console.error('Error rendering change password page:', error);
        res.status(500).render('change-password', { 
            message: 'An error occurred. Please try again.',
            success: false
        });
    }
};


 const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPass1, newPass2 } = req.body;
        const userId = req.session.userId || req.session.user?.id;

        // Validate input
        if (!currentPassword || !newPass1 || !newPass2) {
            return res.render('change-password', { 
                message: 'All fields are required.',
                success: false
            });
        }

        if (newPass1 !== newPass2) {
            return res.render('change-password', { 
                message: 'New passwords do not match.',
                success: false
            });
        }

        if (newPass1.length < 6) {
            return res.render('change-password', { 
                message: 'New password must be at least 6 characters long.',
                success: false
            });
        }

        // Get user from database
        const user = await User.findById(userId);
        if (!user) {
            return res.render('change-password', { 
                message: 'User not found.',
                success: false
            });
        }

        // Verify current password
        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordValid) {
            return res.render('change-password', { 
                message: 'Current password is incorrect.',
                success: false
            });
        }

        // Check if new password is same as current
        if (currentPassword === newPass1) {
            return res.render('change-password', { 
                message: 'New password must be different from current password.',
                success: false
            });
        }

        // Hash new password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPass1, saltRounds);

        // Update password in database
        await User.findByIdAndUpdate(userId, { password: hashedPassword });

        // Render success message and include redirect script
        res.render('change-password', { 
            message: 'Password changed successfully! Redirecting to home...',
            success: true
        });

    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).render('change-password', { 
            message: 'An error occurred while changing password. Please try again.',
            success: false
        });
    }
};



module.exports = {
    getForgtPassPage,
    forgotEmailValid,
    verifyForgotPassOtp,
    getResetPassPage,
    resendOtp,
    postNewPassword,
    getChangePasswordPage,
    changePassword
};
