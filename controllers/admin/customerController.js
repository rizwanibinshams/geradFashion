const User = require('../../models/userSchema')

const customerInfo = async (req, res) => {
    try {
        let search = "";
        if (req.query.search) {
            search = req.query.search;
        }
        
        let page = 1;
        if (req.query.page) {
            page = parseInt(req.query.page);
        }

        const limit = 3; // Limit of items per page

       
        const Userdata = await User.find({
            isAdmin: false,
            $or: [
                { name: { $regex: ".*" + search + ".*", $options: "i" } }, 
                { email: { $regex: ".*" + search + ".*", $options: "i" } },
                { phone: { $regex: ".*" + search + ".*", $options: "i" } }
            ]
        })
        .limit(limit)
        .skip((page - 1) * limit)
        .exec();

        
        // Count the total number of documents that match the query
        const count = await User.find({
            isAdmin: false,
            $or: [
                { name: { $regex: ".*" + search + ".*", $options: "i" } },
                { email: { $regex: ".*" + search + ".*", $options: "i" } }
            ]
        }).countDocuments();

        // Pass the data, pagination info, and total pages to the view
        res.render('customers', {
            data: Userdata,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            searchTerm: search
        });

    } catch (error) {
        console.log('Error fetching customers:', error);
        res.status(500).send('Internal server error');
    }
}

const customerBlocked = async (req,res)=>{
    try {
        let id = req.query.id
        await User.updateOne({_id:id},{$set:{isBlocked:true}})
        res.redirect('/admin/users')
    } catch (error) {
        res.redirect('/pageerror')
    }
}

const customerunBlocked =  async(req,res)=>{
    try {
        let id = req.query.id
        await User.updateOne({_id:id},{$set:{isBlocked:false}})
        res.redirect('/admin/users')
    } catch (error) {
        res.redirect('/admin/pageerror')
    }
}


const deleteCustomer = async(req,res)=>{
    try {
        const{id}=req.query;
        if(!id){
            return res.status(400).redirect("/admin/pageerror")
        }
        await User.deleteOne({_id:id});
        res.redirect("/admin/users")


    } catch (error) {
        console.error("error deleting customer",error)
        res.status(500).redirect("/admin/pageerror")
    }
}

module.exports = {
    customerInfo,
    customerBlocked,
    customerunBlocked,
    deleteCustomer
}
