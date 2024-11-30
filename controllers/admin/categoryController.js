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


const addCategoryOffer = async (req, res) => {
    try {
        const percentage = parseInt(req.body.percentage);
        const categoryId = req.body.categoryId;

        if (isNaN(percentage) || percentage < 0 || percentage > 100) {
            return res.status(400).json({ status: false, message: 'Invalid percentage value' });
        }

        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({ status: false, message: 'Category not found' });
        }

        const products = await Product.find({ category: category._id });
        if (products.length === 0) {
            await Category.updateOne({ _id: categoryId }, { $set: { categoryOffer: percentage } });
            return res.json({ status: true, message: 'Category offer updated. No products in this category.' });
        }

        await Category.updateOne({ _id: categoryId }, { $set: { categoryOffer: percentage } });

        const updatePromises = products.map(product => {
            if (product.productOffer < percentage) {
                if (product.previousSalePrice === undefined) {
                    product.previousSalePrice = product.salePrice; 
                }
                const discountAmount = Math.floor(product.regularPrice * (percentage / 100));
                product.salePrice = product.regularPrice - discountAmount;
                product.productOffer = percentage;
            }
            return product.save();
        });
        
        await Promise.all(updatePromises);

        res.json({ status: true, message: 'Category offer applied to applicable products successfully' });
    } catch (error) {
        console.error("Error in addCategoryOffer:", error);
        res.status(500).json({ status: false, message: 'Internal server error', error: error.message });
    }
};





const removeCategoryOffer = async (req, res) => {
    try {
        const categoryId = req.body.categoryId;
        const category = await Category.findById(categoryId);

        if (!category) {
            return res.status(404).json({ status: false, message: "Category not found" });
        }

        const products = await Product.find({ category: category._id });

        if (products.length > 0) {
            for (const product of products) {
               
                if (product.previousSalePrice !== undefined) {
                    product.salePrice = product.previousSalePrice;
                    product.previousSalePrice = undefined; 
                }
                product.productOffer = 0;
                await product.save();
            }
        }

        category.categoryOffer = 0;
        await category.save();
        res.json({ status: true, message: 'Category offer removed successfully' });
    } catch (error) {
        console.error("Error in removeCategoryOffer:", error);
        res.status(500).json({ status: false, message: 'Internal server error', error: error.message });
    }
};






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

        // Input validation
        if (!categoryName?.trim() || !description?.trim()) {
            return res.status(400).json({ 
                success: false,
                error: 'Category name and description are required and cannot be empty' 
            });
        }

       
        const sanitizedCategoryName = categoryName.trim();

        try {
           
            const categoryToUpdate = await Category.findById(id);
            if (!categoryToUpdate) {
                return res.status(404).json({ 
                    success: false,
                    error: "Category not found" 
                });
            }

           
            const existingCategory = await Category.findOne({
                name: { $regex: new RegExp(`^${sanitizedCategoryName}$`, 'i') },
                _id: { $ne: id }
            });

            if (existingCategory) {
                return res.status(409).json({
                    success: false,
                    error: `A category with the name "${sanitizedCategoryName}" already exists` 
                });
            }

            
            const updatedCategory = await Category.findByIdAndUpdate(
                id,
                {
                    name: sanitizedCategoryName,
                    description: description.trim(),
                },
                { 
                    new: true, 
                    runValidators: true 
                }
            );

            return res.status(200).json({ 
                success: true, 
                message: 'Category updated successfully', 
                category: updatedCategory 
            });

        } catch (dbError) {
            
            if (dbError.name === 'ValidationError') {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid data provided',
                    details: dbError.message
                });
            }
            
            throw dbError;
        }

    } catch (error) {
        console.error('Error updating category:', error);
        return res.status(500).json({ 
            success: false,
            error: 'An error occurred while updating the category. Please try again later.'
        });
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

