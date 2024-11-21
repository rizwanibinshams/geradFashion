const user = require('../../models/userSchema')
const mongoose = require('mongoose')

const bcrypt = require('bcrypt')


const pageerror = async(req,res)=>{
    res.render('adminError')
}




const loadLogin = (req,res)=>{
    if(req.session.admin ){
        return res.redirect("/admin")
}
res.render('adminlogin',{message:null})
    }
    
// const login = async (req,res)=>{
//     try {
//         const {email,password} = req.body
//         const admin = await user.findOne({email,isAdmin:true})
//         if(admin){
//             const passwordMatch = await bcrypt.compare(password,admin.password)
//             if(passwordMatch){
//                 req.session.admin = true;
//                 return res.redirect('/admin')
//             }else{
//                 return res.redirect('/admin/login')
//             }
//         }else{
//             return res.redirect('/admin/login')
//         }
//     } catch (error) {
//         console.log('login error',error);
//         return res.redirect('/admin/pageerror')
//     }
// }

const login = async (req, res) => {
    try {
        const { email, password } = req.body
        const admin = await user.findOne({ email, isAdmin: true })
        
        if (!admin) {
            // No admin found with this email
            req.flash('error', 'Please provide both email and password')
            return res.redirect('/admin/login')
        }

        // Use await with bcrypt.compare() as it returns a Promise
        const passwordMatch = await bcrypt.compare(password, admin.password)
        
        if (passwordMatch) {
            req.session.admin = true;
            return res.redirect('/admin')
        } else {
            // Incorrect password
            req.flash('error', 'Invalid email or password')
            return res.redirect('/admin/login')
        }
    } catch (error) {
        console.log('login error', error);
        req.flash('error', 'An unexpected error occurred')
        return res.redirect('/admin/login')
    }
}

const loadDashboard = async (req,res)=>{
    if(req.session.admin){
        try {
            res.render('dashboard')
        } catch (error) {
            res.redirect('/admin/pageerror')
        }
    }
}

const logout = async (req,res)=>{
    try {
        req.session.destroy(err =>{
            if(err){
                console.log('error destroy session',error);
                return res.redirect('/pageerror')
            }
            res.redirect('/admin/login')
        })
    } catch (error) {
        console.log('unexpected error during admin logout',error);
        res.redirect('admin/pageerror')
    }
}


module.exports ={
    loadLogin,
    login,
    loadDashboard,
    pageerror,
    logout
}
