const mongoose = require('mongoose')
const User = require('../models/userSchema')


const userAuth = (req,res,next)=>{
    if(req.session.user){
        User.findById(req.session.user)
        .then(data=>{
            if(data && !data.isBlocked){
                next()
            }else{
                res.redirect('/login')
            }
        })
        .catch(error=>{
            console.log('Error in user auth middlware',error);
            res.status(500).send('internal server error')
        })
    }else{
        res.redirect('/login')
    }
}


const adminAuth = (req,res,next)=>{
    User.findOne({isAdmin:true})
    .then(data=>{
        if(data){
            next()
        }else{
            res.redirect('/admin/login')
        }
    })
    .catch(error =>{
        console.log('error in admin auth',error);
        res.status(500).send("internal server error")
    })
}

const AdressMiddleware = (req, res, next) => {
    if (req.session.user && req.session.user.id) {
        req.user = req.session.user; // Set user to req.user
        console.log('User ID set in middleware:', req.user.id); // Log the user ID
        return next();
    }
    return res.status(401).json({ error: 'User not authenticated' });
};






const isLogout = (req,res,next)=>{
    if(req.session.admin){
       return res.redirect('/users')
    }
    next()
}




module.exports ={
userAuth,
adminAuth,
isLogout,
AdressMiddleware
}