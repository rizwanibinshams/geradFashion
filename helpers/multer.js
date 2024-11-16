const multer = require("multer")

const path = require('path')



const storage = multer.diskStorage({
    destination:(req,file,cb)=>{
        cb(null,path.join(__dirname,"../public/uploads/product-images"))
    },
    filename:(req,file,cb)=>{
        cb(null,Date.now()+"-"+file.originalname)
    }
})

const brandStore = multer.diskStorage({
    destination:(req,file,cb)=>{
        cb(null,path.join(__dirname,"../public/uploads/re-image"))
    },
    filename:(req,file,cb)=>{
        cb(null,Date.now()+"-"+file.originalname)
    }
})

const banner = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/banners')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname)
    }
});

module.exports = {
    storage,
    brandStore,
    banner
}
