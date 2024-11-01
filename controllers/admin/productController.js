const path = require('path'); // Ensure path is imported
const fs = require('fs');
const sharp = require('sharp');
const Product = require('../../models/productSchema');
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");




const getProductAddPage = async (req, res) => {
    try {
        const category = await Category.find({ isListed: true });
        const brand = await Brand.find({ isBlocked: false });
        const user = req.session.user || null;
        res.render("product-add", {
            cat: category,
            brand: brand,
            user:user,
        });
    } catch (error) {
        res.redirect("pageerror");
    }
};

// const addProducts = async (req, res) => {
//     try {
//         const products = req.body;
//         const productExists = await Product.findOne({ productName: products.productName });

//         if (!productExists) {
//             const images = [];
//             if (req.files && req.files.length > 0) {
//                 for (let i = 0; i < req.files.length; i++) {
//                     const originalImagePath = req.files[i].path;
//                     const resizedImagePath = path.join('public', 'uploads', 'product-images', req.files[i].filename);
//                     await sharp(originalImagePath).resize({ width: 440, height: 440 }).toFile(resizedImagePath);
//                     images.push(req.files[i].filename);
//                 }
//             }

//             const categoryId = await Category.findOne({ name: products.category });
//             if (!categoryId) {
//                 return res.status(400).json("Invalid category name");
//             }

//             const newProduct = new Product({
//                 productName: products.productName,
//                 description: products.description,
//                 brand: products.brand,
              
//                 category: categoryId._id,
//                 regularPrice: products.regularPrice,
//                 salePrice: products.salePrice,
//                 createdAt: new Date(),
//                 quantity: products.quantity,
//                 size: products.size ? products.size.split(',') : [], // Handle size array
//                 color: products.color ? products.color.split(',') : [], // Handle color array
//                 productImage: images,
//                 status: "Available",
//             });

//             await newProduct.save();
//             return res.redirect("/admin/addProducts");
//         } else {
//             res.status(400).json("Product already exists, please try with another name");
//         }
//     } catch (error) {
//         console.error("Error while saving products:", error);
//         res.redirect("/admin/pageerror");
//     }
// };

const addProducts = async (req, res) => {
    try {
        const products = req.body;
        
        // Check if product exists
        const productExists = await Product.findOne({ productName: products.productName });
        if (productExists) {
            return res.status(400).json("Product already exists, please try with another name");
        }

        // Handle images
        const images = [];
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const originalImagePath = file.path;
                const filename = file.filename;
                // Ensure the directory exists
                const resizedImagePath = path.join('public', 'uploads', 'product-images', filename);
                
                // Resize image
                await sharp(originalImagePath)
                    .resize({ width: 440, height: 440 })
                    .toFile(resizedImagePath);
                
                images.push(filename);
            }
        }

        // Get category ID
        const categoryId = await Category.findOne({ name: products.category });
        if (!categoryId) {
            return res.status(400).json("Invalid category name");
        }

        // Create new product
        const newProduct = new Product({
            productName: products.productName,
            description: products.description,
            brand: products.brand,
            category: categoryId._id,
            regularPrice: products.regularPrice,
            salePrice: products.salePrice,
            quantity: products.quantity,
            size: products.size ? [products.size] : [], // Since it's a select, no need to split
            color: products.color ? products.color.split(',') : [], // Split colors if multiple
            productImage: images,
            status: "Available",
            createdAt: new Date()
        });

        await newProduct.save();
        return res.redirect("/admin/addProducts");

    } catch (error) {
        console.error("Error while saving products:", error);
        return res.redirect("/admin/pageerror");
    }
};

const getAllProducts = async (req, res) => {
    try {
        const search = req.query.search || "";
        const page = req.query.page || 1;
        const limit = 4;

       
        const productData = await Product.find({
            $or: [
                { productName: { $regex: new RegExp(".*" + search + ".*", "i") } },
                { brand: { $regex: new RegExp(".*" + search + ".*", "i") } },
            ]
        })
        .sort({ createdAt: -1 })  
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .populate("category")
        .exec();

        const count = await Product.find({
            $or: [
                { productName: { $regex: new RegExp(".*" + search + ".*", "i") } },
                { brand: { $regex: new RegExp(".*" + search + ".*", "i") } },
            ]
        }).countDocuments();

        const category = await Category.find({ isListed: true });
        const brand = await Brand.find({ isBlocked: false });
        const user = req.session.user || null;

        if (category && brand) {
            res.render("products", {
                data: productData,
                currentPage: page,
                totalPages: Math.ceil(count / limit),
                cat: category,
                brand: brand,
                user: user,
            });
        } else {
            res.render("page-404");
        }
    } catch (error) {
        res.redirect("/admin/pageerror");
    }
};



const addProductOffer = async (req, res) => {
    try {
        const { productId, percentage } = req.body;
        const findProduct = await Product.findOne({ _id: productId });
        const findCategory = await Category.findOne({ _id: findProduct.category });

        if (findCategory.categoryOffer > percentage) {
            return res.json({ status: false, message: "This product category already has a category offer" });
        }

        
        findProduct.salePrice = findProduct.salePrice - Math.floor(findProduct.regularPrice * (percentage / 100));
        findProduct.productOffer = parseInt(percentage);
        await findProduct.save();

        findCategory.categoryOffer = 0;
        await findCategory.save();

        return res.json({ status: true });
    } catch (error) {
     
        return res.status(500).redirect("/admin/pageerror");
    }
};

const removeProductOffer = async (req, res) => {
    try {
        const { productId } = req.body;
        const findProduct = await Product.findOne({ _id: productId });

        
        if (!findProduct) {
            return res.status(404).json({ status: false, message: "Product not found" });
        }

        const percentage = findProduct.productOffer;

        
        if (percentage === 0) {
            return res.status(400).json({ status: false, message: "No product offer to remove" });
        }

        
        findProduct.salePrice = findProduct.salePrice + Math.floor(findProduct.regularPrice * (percentage / 100));
        findProduct.productOffer = 0;  
        await findProduct.save();

        return res.json({ status: true, message: "Product offer removed successfully" });
    } catch (error) {
        console.error("Error removing product offer:", error);
        return res.status(500).json({ status: false, message: "Internal server error" });
    }
};

const blockProduct = async (req,res)=>{
    try {
        let id = req.query.id;
        await Product.updateOne({_id:id},{$set:{isBlocked:true}})
        res.redirect("/admin/products")
    } catch (error) {
        res.redirect("/admin/pageerror")
    }
} 

const unblockProduct = async (req,res)=>{
    try {
        let id = req.query.id;
        await Product.updateOne({_id:id},{$set:{isBlocked:false}})
        res.redirect("/admin/products")
    } catch (error) {
        res.redirect("/admin/pageerror")
    }
} 



const getEditProduct = async (req, res) => {
    try {
        const id = req.query.id;
        const product = await Product.findOne({ _id: id });
        
        const size = product ? product.size || [] : [];
        console.log("Size array:", size);
        const categories = await Category.find({});
        const brands = await Brand.find({});
        const user = req.session.user || null;
        res.render("edit-product", {
            product: product,
            cat: categories,
            brand: brands,
            user:user,
            size:size,

        });

    } catch (error) {
        console.error(error);
        res.redirect("/admin/pageerror");
    }
};

const editProduct = async (req, res) => {
    try {
        const id = req.params.id;
        const product = await Product.findOne({ _id: id });
        const data = req.body;

        const existingProduct = await Product.findOne({
            productName: data.productName,
            _id: { $ne: id }
        });

        if (existingProduct) {
            return res.status(400).json({ error: "Product with this name already exists, try another name" });
        }

        const images = [];
        if (req.files && req.files.length > 0) {
            for (let i = 0; i < req.files.length; i++) {
                images.push(req.files[i].filename);
            }
        }

        const updateFields = {
            productName: data.productName,
            description: data.description,
            brand: data.brand,
            regularPrice: data.regularPrice,
            salePrice: data.salePrice,
            quantity: data.quantity,
            size: data.size ? data.size.split(',') : product.size, 
            color: data.color ? data.color.split(',') : product.color, 
        };

        const category = await Category.findOne({ name: data.category });
        if (category) {
            updateFields.category = category._id;
        }

        if (req.files.length > 0) {
            updateFields.$push = { productImage: { $each: images } };
        }

        await Product.findByIdAndUpdate(id, updateFields, { new: true });
        res.redirect("/admin/products");
    } catch (error) {
        console.error("Error updating product:", error);
        res.redirect("/admin/pageerror");
    }
};

const deleteSingleImage = async (req,res)=>{
    try {
        const { imageNameToServer,productIdToServer} = req.body;
        const product = await Product.findByIdAndUpdate(productIdToServer,{$pull:{productImage:imageNameToServer}})
        const imagePath = path.join(__dirname,"../../public/uploads/re-image",imageNameToServer)
        if(fs.existsSync(imagePath)){
            await fs.unlinkSync(imagePath);
            console.log(`Image ${imageNameToServer} delete successfully`);

            
        }else{
            console.log(`Image ${imageNameToServer} not found`);
        }

        res.send({status:true})
    } catch (error) {
        res.redirect("/admin/pageerror")
    }
}



module.exports={
    getProductAddPage,
    addProducts,
    getAllProducts,
    addProductOffer,
    removeProductOffer,
    blockProduct,
    unblockProduct,
    getEditProduct,
    editProduct,
    deleteSingleImage

}