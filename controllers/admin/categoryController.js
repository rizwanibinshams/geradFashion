const { getDefaultHighWaterMark } = require('nodemailer/lib/xoauth2');
const Category = require('../../models/categorySchema')
const Product = require("../../models/productSchema")






const categoryInfo = async (req,res)=>{
    try {
        const page = parseInt(req.query.page)||1;
        const limit = 4
        const skip =(page-1)*limit;
        const categoryData = await Category.find({})
        .sort({createdAt:-1})
        .skip(skip)
        .limit(limit)
        const totalCategory = await Category.countDocuments();
        const totalPages = Math.ceil(totalCategory / limit);
        res.render("category",{
            cat:categoryData,
            currentPage:page,
            totalPages:totalPages,
            totalCategory:totalCategory
        })
    } catch (error) {
        console.error(error)
        res.redirect('/admin/pageerror')
    }
}

const addCategory = async (req,res)=>{
    const{name,description}= req.body
    try {
        
        const existingCategory = await Category.findOne({name})
        if(existingCategory){
            return res.status(400).json({error:'Category already exist'})
        }
        const newCategory = new Category({
            name,
            description,
        })
        await newCategory.save();
        return res.json({message:'Category added succesfullu'})
    } catch (error) {
        return res.status(500).json({error:'internal server error'})
    }
}

const addCategoryOffer = async (req, res) => {
    try {
        console.log("Request body:", req.body);
        const percentage = parseInt(req.body.percentage);
        const categoryId = req.body.categoryId;
        console.log("Percentage:", percentage, "CategoryId:", categoryId);

        if (isNaN(percentage) || percentage < 0 || percentage > 100) {
            return res.status(400).json({ status: false, message: 'Invalid percentage value' });
        }

        const category = await Category.findById(categoryId);
        console.log("Category:", category);

        if (!category) {
            return res.status(404).json({ status: false, message: 'Category not found' });
        }

        const products = await Product.find({ category: category._id });
        console.log("Products count:", products.length);

        if (products.length === 0) {
            await Category.updateOne({ _id: categoryId }, { $set: { categoryOffer: percentage } });
            return res.json({ status: true, message: 'Category offer updated. No products in this category.' });
        }

        const hasHigherProductOffer = products.some((product) => product.productOffer > percentage);
        console.log("Has higher product offer:", hasHigherProductOffer);

        if (hasHigherProductOffer) {
            return res.json({ status: false, message: 'Some products within this category already have a higher product offer' });
        }

        await Category.updateOne({ _id: categoryId }, { $set: { categoryOffer: percentage } });
        console.log("Category updated");

        const updatePromises = products.map(product => {
            product.productOffer = 0;
            product.salePrice = product.regularPrice;
            return product.save();
        });
        await Promise.all(updatePromises);
        console.log("Products updated");

        res.json({ status: true, message: 'Category offer added successfully' });
    } catch (error) {
        console.error("Error in addCategoryOffer:", error);
        res.status(500).json({ status: false, message: 'Internal server error', error: error.message });
    }
};
const removeCategoryOffer = async (req,res)=>{
    try {
        const categoryId = req.body.categoryId
        const category = await Category.findById(categoryId)
        if(!category){
            return res.status(404).json({status:false,message:"Category not found"})
        }
        const percentage = category.categoryOffer;
        const products = await Product.find({category:category._id})
        if(products.length >0){
            for(const product of products){
                product.salePrice +=Math.floor(product.regularPrice * (percentage/100))
                product.productOffer = 0;
                await product.save();
            }
        }
        category.categoryOffer = 0;
        await category.save();
        res.json({status:true})



    } catch (error) {
        res.status(500).json({status:false,message:'internal server error'})
    }
}

const getListCategory = async (req,res)=>{
    try {
        let id = req.query.id;
        await Category.updateOne({_id:id},{$set:{isListed:false}})
        res.redirect("/admin/category")
    } catch (error) {
        res.redirect('/admin/pageerror')
    }
}

const getUnlistCategory = async (req,res)=>{
    try {
        let id = req.query.id;
        await Category.updateOne({_id:id},{$set:{isListed:true}})
        res.redirect("/admin/category")
    } catch (error) {
        res.redirect('/admin/pageerror')
    }
}

const getEditCategory = async (req,res)=>{
    try {
        const id = req.query.id;
        const category = await Category.findOne({_id:id})
        res.render("edit-category",{category:category})
    } catch (error) {
        res.redirect("/admin/pageerror")
    }
}

const editCategory = async (req, res) => {
    try {
        const id = req.params.id;
        const { categoryName, description } = req.body;
        const existingCategory = await Category.findOne({ name: categoryName, _id: { $ne: id } });

        if (existingCategory) {
            return res.status(400).json({ error: 'Category already exists, please choose another name' });
        }

        const updatedCategory = await Category.findByIdAndUpdate(id, {
            name: categoryName,
            description: description,
        }, { new: true });

        if (updatedCategory) {
            res.json({ success: true, message: 'Category updated successfully' });
        } else {
            res.status(404).json({ error: "Category not found" });
        }

    } catch (error) {
        console.error('Error updating category:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};


const deleteCategory = async(req,res)=>{
    try {
        const{id}=req.query;
        if(!id){
            return res.status(400).redirect("/pageerror")
        }
        await Category.deleteOne({_id:id});
        res.redirect("/admin/category")


    } catch (error) {
        console.error("error deleting category",error)
        res.status(500).redirect("/admin/pageerror")
    }
}


module.exports= {
    categoryInfo,
    addCategory,
    addCategoryOffer,
    removeCategoryOffer,
    getListCategory,
    getUnlistCategory,
    getEditCategory,
    editCategory,
    deleteCategory
}

