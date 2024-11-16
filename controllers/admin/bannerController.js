const Banner = require('../../models/bannerSchema');
const Category = require("../../models/categorySchema")

    // Render add banner page
   const getAddBanner = async (req, res) => {
    try {
        // Fetch only listed categories
        const categories = await Category.find({ isListed: true }).sort('name');
        res.render('add-banner', { categories });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
    };

    // Add new banner
  const  addBanner = async (req, res) => {
    try {
        const { title, description, categoryId, startDate, endDate } = req.body;
        const image = req.file ? req.file.filename : null;

        if (!image) {
            return res.status(400).json({ message: 'Image is required' });
        }

        // Fetch category name for the link
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(400).json({ message: 'Invalid category' });
        }

        // Construct the products URL with category query parameter
        const link = `/products?category=${category.name}`;

        const banner = new Banner({
            image,
            title,
            description,
            link,
            startDate,
            endDate
        });

        await banner.save();
        res.redirect('/admin/banners');
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
    };

    // Get all banners
   const getAllBanners = async (req, res) => {
    try {
        const banners = await Banner.find({});
        
        // Get category details for each banner
        const bannersWithCategory = await Promise.all(banners.map(async (banner) => {
            // Extract category name from the link
            const categoryName = banner.link.split('category=')[1];
            return {
                ...banner.toObject(),
                categoryName: categoryName || 'Unknown Category'
            };
        }));

        res.render('banner', { banners: bannersWithCategory });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
    };

    // Delete banner
   const deleteBanner = async (req, res) => {
    try {
        await Banner.findByIdAndDelete(req.params.id);
        res.redirect('/admin/banners');
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
    }


module.exports = {
    getAddBanner,
    addBanner,
    getAllBanners,
    deleteBanner
}