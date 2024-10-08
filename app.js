const express = require('express')
const app = express()
const path = require('path')
const session = require('express-session')
const bodyParser = require('body-parser');
const dotenv = require('dotenv')
const mongoose = require('mongoose')
dotenv.config();
const db = require('./config/db')
const passport = require('./config/passport')
const sweetalert = require('sweetalert')
const userRouter = require('./routes/userRouter')
const adminRouter = require('./routes/adminRouter')

db()

const methodOverride = require('method-override');
app.use(methodOverride('_method'));

app.use(bodyParser.json());  // This is important to parse JSON data
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.json())
app.use(express.urlencoded({extended:true}))

app.use(session({
    resave:false,
    saveUninitialized:true,
    secret:'my secret',
    cookie:{
        secure:false,
        httpOnly:true,
        maxAge:72*60*60*1000
    }
}))





app.use(passport.initialize());
app.use(passport.session());




app.use((req,res,next)=>{
    res.set('cache-control','no-store')
    next()
})




app.set('view engine','ejs')
app.set('views',[path.join(__dirname,'views/user'),path.join(__dirname,'views/admin')])
app.use(express.static(path.join(__dirname,'public')))


app.use('/',userRouter)
app.use('/admin',adminRouter)



app.listen(3008,()=>{
    console.log('server running : http://localhost:3008');
})


module.exports = app