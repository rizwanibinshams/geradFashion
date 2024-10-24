const mongoose = require("mongoose");
const Wishlist = require("../../models/wishlistSchema"); // Adjust the path as needed
const Product = require("../../models/productSchema"); // Adjust the path as needed
const path = require("path");
const User = require("../../models/userSchema");
// Add to Wishlist
const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.session.user?.id;

    // Check if the user is authenticated
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    // Validate productId
    if (!productId) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    // Find or create a wishlist for the user
    let wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
      wishlist = new Wishlist({ userId, products: [] });
    }

    // Check if the product is already in the wishlist
    const productExists = wishlist.products.some(item => 
      item.productId.toString() === productId
    );

    if (!productExists) {
      // Add the product to the wishlist
      wishlist.products.push({ productId });
      await wishlist.save();
      res.status(200).json({ message: "Product added to wishlist successfully" });
    } else {
      res.status(200).json({ message: "Product is already in the wishlist" });
    }
  } catch (error) {
    console.error("Error adding to wishlist:", error);
    res.status(500).json({ message: "Error adding to wishlist", error: error.message });
  }
};

// Remove from Wishlist
const removeFromWishlist = async (req, res) => {
    try {
      const { productId } = req.params;
      const userId = req.session.user?.id;
  
      console.log(`Attempting to remove product ${productId} for user ${userId}`);
  
      // Check if the user is authenticated
      if (!userId) {
        console.log('User not authenticated');
        return res.status(401).json({ message: "User not authenticated" });
      }
  
      // Find the user's wishlist
      const wishlist = await Wishlist.findOne({ userId });
      if (!wishlist) {
        console.log(`Wishlist not found for user ${userId}`);
        return res.status(404).json({ message: "Wishlist not found" });
      }
  
      // Check if the product exists in the wishlist
      const productIndex = wishlist.products.findIndex(item => 
        item.productId.toString() === productId
      );
  
      if (productIndex === -1) {
        console.log(`Product ${productId} not found in wishlist for user ${userId}`);
        return res.status(404).json({ message: "Product not found in wishlist" });
      }
  
      // Remove the product from the wishlist
      wishlist.products.splice(productIndex, 1);
  
      await wishlist.save();
      console.log(`Product ${productId} removed from wishlist for user ${userId}`);
      res.status(200).json({ message: "Product removed from wishlist successfully" });
    } catch (error) {
      console.error("Error removing from wishlist:", error);
      res.status(500).json({ message: "Error removing from wishlist", error: error.message });
    }
  };




const getWishlist = async (req, res) => {
  try {
    const user = req.session.user;

    // Check if the user is logged in
    if (!user) {
      return res.redirect('/login'); // If user is not logged in, redirect to login
    }

    const userId = user.id; // Now safely access the user ID
    const userData = await User.findById(userId); // Fetch user data

    // Check if the user data is found, if not, redirect to login
    if (!userData) {
      return res.redirect('/login');
    }

    

    const wishlist = await Wishlist.findOne({ userId }).populate({
      path: 'products.productId',
      model: 'Product'
    });

    let wishlistItems = [];
    if (wishlist && wishlist.products) {
      wishlistItems = wishlist.products.map(item => {
        if (item.productId) {
          const productImage = item.productId.productImage && item.productId.productImage.length > 0
            ? path.join('/uploads/product-images', item.productId.productImage[0])
            : '/placeholder-image.jpg';

          return {
            _id: item.productId._id,
            product: {
              productName: item.productId.productName,
              price: item.productId.regularPrice,
              salePrice: item.productId.salePrice,
              discountedPrice: item.productId.salePrice,  // You may want to calculate this
              productImage: productImage,
              brand: item.productId.brand,
              rating: item.productId.rating,
              reviewCount: 0,  // Add this field to your schema if needed
              discount: calculateDiscount(item.productId.regularPrice, item.productId.salePrice),
              description: item.productId.description,
            }
          };
        }
        return null;
      }).filter(item => item !== null);
    }

    // Render wishlist with items and user data
    res.render('wishlist', { wishlistItems, user: userData });
    
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    res.status(500).render('page-404', { message: 'An error occurred while fetching your wishlist.' });
  }
};

// Helper function to calculate discount
function calculateDiscount(regularPrice, salePrice) {
  if (regularPrice > salePrice) {
    return Math.round(((regularPrice - salePrice) / regularPrice) * 100);
  }
  return 0;
}


module.exports = {
  addToWishlist,
  removeFromWishlist,
  getWishlist,
  
};