const Cart = require('../../models/cartSchema'); // Import the Cart model
const Product = require('../../models/productSchema'); // Import the Product model
const User = require('../../models/userSchema'); // Import the User model



const addToCart = async (req, res) => {
    try {
      const { productId, size } = req.body;
      const userId = req.session.user.id;
  
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
  
      if (!productId) {
        return res.status(400).json({ message: "Product ID is required" });
      }
  
      let cart = await Cart.findOne({ userId });
  
      if (!cart) {
        cart = new Cart({ userId, items: [] });
      }
  
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
  
      let cartItem;
      if (size) {
        cartItem = cart.items.find(item => 
          item.productId.toString() === productId && item.size === size
        );
      } else {
        cartItem = cart.items.find(item => 
          item.productId.toString() === productId
        );
      }
  
      if (cartItem) {
        cartItem.quantity += 1;
        cartItem.totalPrice = cartItem.quantity * product.salePrice;
      } else {
        const newItem = {
          productId,
          quantity: 1,
          price: product.salePrice,
          totalPrice: product.salePrice
        };
        if (size) {
          newItem.size = size;
        }
        cart.items.push(newItem);
      }
  
      await cart.save();
      res.status(200).json({ message: "Product added to cart successfully" });
    } catch (error) {
      console.error("Error adding to cart:", error);
      res.status(500).json({ message: "Error adding to cart", error: error.message });
    }
  };







const getCart = async (req, res) => {
  try {
      // Check if user is authenticated
      if (!req.session || !req.session.user || !req.session.user.id) {
          return res.status(401).json({ message: 'User not authenticated' }); // Return JSON response for fetch
      }

      const userId = req.session.user.id;

      // Find the cart for the user
      const cart = await Cart.findOne({ userId }).populate('items.productId');

      if (!cart || cart.items.length === 0) {
          // If no cart exists or it's empty, render the cart page with an empty array
          return res.render('cart', { cart: [], total: 0 });
      }

      // Calculate the total
      const total = cart.items.reduce((sum, item) => sum + (item.productId.salePrice * item.quantity), 0);

      // Render the cart page with the cart items and total
      res.render('cart', { cart: cart.items, total });
  } catch (error) {
      console.error("Error fetching cart:", error);
      res.status(500).render('page-404', { message: "Error fetching cart" });
  }
};

// Update the quantity of an item in the cart
const updateCart = async (req, res) => {
  try {
      const { productId, quantity } = req.body;

      // Check if the user is logged in
      if (!req.session.user || !req.session.user.id) {
          return res.redirect('/login');
      }

      // Find the cart for the logged-in user
      let cart = await Cart.findOne({ userId: req.session.user.id });

      if (!cart) {
          return res.redirect('/cart');
      }

      // Find the product in the cart
      const productIndex = cart.items.findIndex(item => item.productId.toString() === productId);

      if (productIndex >= 0) {
          // Convert quantity to a number
          const quantityNum = parseInt(quantity, 10);
          
          // Ensure quantity is a valid number and greater than 0
          if (!isNaN(quantityNum) && quantityNum > 0) {
              cart.items[productIndex].quantity = quantityNum; // Update quantity
              
              // Optionally, you can fetch the latest price from the product model if needed
              const salePrice = cart.items[productIndex].price; // or fetch it from the product model

              // Set the total price based on the updated quantity
              cart.items[productIndex].totalPrice = salePrice * quantityNum;
          } else {
              console.error('Invalid quantity:', quantity);
              return res.status(400).json({ message: 'Invalid quantity' });
          }

          // Save the updated cart to the database
          await cart.save();
      }

      res.redirect('/cart');
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error updating cart' });
  }
};




// Remove item from the cart
const removeFromCart = async (req, res) => {
  console.log("Session Data:", req.session); // Log session data

  try {
      const { itemId } = req.params; // Extract itemId from URL parameters

      if (!req.session.user || !req.session.user.id) {
          return res.status(401).json({ message: 'User not authenticated' });
      }

      // Find the cart for the logged-in user
      let cart = await Cart.findOne({ userId: req.session.user.id });

      if (!cart) {
          return res.status(404).json({ message: 'Cart not found' });
      }

      // Remove the product from the cart
      cart.items = cart.items.filter(item => item.productId.toString() !== itemId);

      // Save the updated cart to the database
      await cart.save();

      // Respond with success
      res.status(200).json({ message: 'Item removed from cart successfully' });
  } catch (error) {
      console.error('Error removing item from cart:', error);
      res.status(500).json({ message: 'Error removing item from cart' });
  }
};





module.exports = {
    addToCart,
    getCart,
    updateCart,
    removeFromCart
};
