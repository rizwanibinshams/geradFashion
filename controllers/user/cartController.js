const Cart = require('../../models/cartSchema');
const Product = require('../../models/productSchema');
const User = require('../../models/userSchema');

// const addToCart = async (req, res) => {
//   try {
//     const { productId, size, quantity } = req.body;
//     const userId = req.session.user?.id;

//     if (!userId) {
//       return res.status(401).json({ message: "User not authenticated", redirect: "/login" });
//     }

//     if (!productId) {
//       return res.status(400).json({ message: "Product ID is required" });
//     }

//     const validQuantity = parseInt(quantity, 10);
//     if (isNaN(validQuantity) || validQuantity <= 0) {
//       return res.status(400).json({ message: "Invalid quantity" });
//     }

//     let cart = await Cart.findOne({ userId });
//     if (!cart) {
//       cart = new Cart({ userId, items: [] });
//     }

//     const product = await Product.findById(productId);
//     if (!product) {
//       return res.status(404).json({ message: "Product not found" });
//     }

//     const findCartItem = () => {
//       return size 
//         ? cart.items.find(item => item.productId.toString() === productId && item.size === size)
//         : cart.items.find(item => item.productId.toString() === productId);
//     };

//     let cartItem = findCartItem();

//     if (cartItem) {
//       cartItem.quantity += validQuantity;
//       cartItem.totalPrice = cartItem.quantity * product.salePrice;
//     } else {
//       const newItem = {
//         productId,
//         quantity: validQuantity,
//         price: product.salePrice,
//         totalPrice: validQuantity * product.salePrice,
//         ...(size && { size })
//       };
//       cart.items.push(newItem);
//     }

//     await cart.save();
//     res.status(200).json({ message: "Product added to cart successfully" });
//   } catch (error) {
//     console.error("Error adding to cart:", error);
//     res.status(500).json({ message: "Error adding to cart", error: error.message });
//   }
// };


const addToCart = async (req, res) => {
  try {
    const { productId, size, quantity } = req.body;
    const userId = req.session.user?.id;

    // Check user authentication
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated", redirect: "/login" });
    }

    // Check for product ID
    if (!productId) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    // Validate quantity
    const validQuantity = parseInt(quantity, 10);
    if (isNaN(validQuantity) || validQuantity <= 0) {
      return res.status(400).json({ message: "Invalid quantity" });
    }

    // Retrieve product details
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Check product availability
    if (product.status !== "Available") {
      return res.status(400).json({ message: "Product is not available" });
    }

    // Check if the requested quantity exceeds available stock
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [] });
    }

    // Find existing cart item
    const findCartItem = () => {
      return size 
        ? cart.items.find(item => item.productId.toString() === productId && item.size === size)
        : cart.items.find(item => item.productId.toString() === productId);
    };

    let cartItem = findCartItem();
    
    // If item already exists in cart, check total quantity
    if (cartItem) {
      const newQuantity = cartItem.quantity + validQuantity;
      if (newQuantity > product.quantity) {
        return res.status(400).json({
          message: "Cannot add more than available stock. Available stock: " + product.quantity,
        });
      }
      // Update existing cart item
      cartItem.quantity = newQuantity;
      cartItem.totalPrice = cartItem.quantity * product.salePrice;
    } else {
      // Check if adding the new item exceeds available stock
      if (validQuantity > product.quantity) {
        return res.status(400).json({
          message: "Cannot add more than available stock. Available stock: " + product.quantity,
        });
      }
      // Create new cart item
      const newItem = {
        productId,
        quantity: validQuantity,
        price: product.salePrice,
        totalPrice: validQuantity * product.salePrice,
        ...(size && { size })
      };
      cart.items.push(newItem);
    }

    // Save the cart
    await cart.save();
    res.status(200).json({ message: "Product added to cart successfully" });
  } catch (error) {
    console.error("Error adding to cart:", error);
    res.status(500).json({ message: "Error adding to cart", error: error.message });
  }
};


// const getCart = async (req, res) => {
//   try {
//     if (!req.session || !req.session.user || !req.session.user.id) {
//       return res.redirect('/login');
//     }

//     const userId = req.session.user.id;
//     const cart = await Cart.findOne({ userId }).populate('items.productId');
//     const userData = await User.findById(req.session.user.id);
//     if (!cart || cart.items.length === 0) {
//       return res.render('cart', { cart: [], total: 0 , user: userData });
//     }

//     const total = cart.items.reduce((sum, item) => sum + (item.productId.salePrice * item.quantity), 0);
    
//     res.render('cart', { cart: cart.items, total, user: userData });
//   } catch (error) {
//     console.error("Error fetching cart:", error);
//     res.status(500).json({ message: "Error fetching cart", error: error.message });
//   }
// };

const getCart = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.session || !req.session.user || !req.session.user.id) {
      req.session.returnTo = '/cart';
      return res.redirect('/login');
    }

    const userId = req.session.user.id;
    const cart = await Cart.findOne({ userId }).populate('items.productId');
    const userData = await User.findById(userId);

    if (!cart || cart.items.length === 0) {
      return res.render('cart', { 
        cart: [], 
        total: 0, 
        user: userData,
        userEmail: req.session.user.email 
      });
    }

    const total = cart.items.reduce(
      (sum, item) => sum + (item.productId.salePrice * item.quantity), 
      0
    );

    res.render('cart', { 
      cart: cart.items, 
      total, 
      user: userData,
      userEmail: req.session.user.email 
    });
  } catch (error) {
    console.error("Error fetching cart:", error);
    res.status(500).json({ 
      message: "Error fetching cart", 
      error: error.message 
    });
  }
};


// const updateCart = async (req, res) => {
//   try {
//     const { productId, quantity } = req.body;

//     if (!req.session.user || !req.session.user.id) {
//       return res.status(401).json({ message: 'User not authenticated', redirect: "/login" });
//     }

//     let cart = await Cart.findOne({ userId: req.session.user.id });

//     if (!cart) {
//       return res.status(404).json({ message: 'Cart not found' });
//     }

//     const productIndex = cart.items.findIndex(item => item.productId.toString() === productId);

//     if (productIndex >= 0) {
//       const quantityNum = parseInt(quantity, 10);
      
//       if (!isNaN(quantityNum) && quantityNum > 0) {
//         cart.items[productIndex].quantity = quantityNum;
//         const salePrice = cart.items[productIndex].price;
//         cart.items[productIndex].totalPrice = salePrice * quantityNum;
//       } else {
//         return res.status(400).json({ message: 'Invalid quantity' });
//       }

//       await cart.save();
//       res.status(200).json({ message: 'Cart updated successfully' });
//     } else {
//       res.status(404).json({ message: 'Product not found in cart' });
//     }
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Error updating cart', error: error.message });
//   }
// };

// const updateCart = async (req, res) => {
//   try {
//     const { productId, quantity } = req.body;

//     if (!req.session.user || !req.session.user.id) {
//       return res.status(401).json({ message: 'User not authenticated', redirect: "/login" });
//     }

//     // Find cart and product
//     const [cart, product] = await Promise.all([
//       Cart.findOne({ userId: req.session.user.id }),
//       Product.findById(productId)
//     ]);

//     if (!cart) {
//       return res.status(404).json({ message: 'Cart not found' });
//     }

//     if (!product) {
//       return res.status(404).json({ message: 'Product not found' });
//     }

//     const productIndex = cart.items.findIndex(item => item.productId.toString() === productId);

//     if (productIndex >= 0) {
//       const quantityNum = parseInt(quantity, 10);
      
//       // Validate quantity
//       if (isNaN(quantityNum) || quantityNum <= 0) {
//         return res.status(400).json({ message: 'Invalid quantity' });
//       }

//       // Check if requested quantity exceeds available stock
//       if (quantityNum > product.quantity) {
//         return res.status(400).json({ 
//           message: 'Requested quantity exceeds available stock',
//           availableQuantity: product.quantity 
//         });
//       }

//       // Update cart
//       cart.items[productIndex].quantity = quantityNum;
//       const salePrice = cart.items[productIndex].price;
//       cart.items[productIndex].totalPrice = salePrice * quantityNum;

//       await cart.save();
//       res.status(200).json({ 
//         message: 'Cart updated successfully',
//         availableQuantity: product.quantity 
//       });
//     } else {
//       res.status(404).json({ message: 'Product not found in cart' });
//     }
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Error updating cart', error: error.message });
//   }
// };


const updateCart = async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    if (!req.session.user || !req.session.user.id) {
      return res.status(401).json({ message: 'User not authenticated', redirect: "/login" });
    }

    // Find cart and product
    const [cart, product] = await Promise.all([
      Cart.findOne({ userId: req.session.user.id }),
      Product.findById(productId)
    ]);

    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const productIndex = cart.items.findIndex(item => item.productId.toString() === productId);

    if (productIndex >= 0) {
      const quantityNum = parseInt(quantity);
    
      // Validate quantity
      if (isNaN(quantityNum) || quantityNum <= 0) {
        return res.status(400).json({ message: 'Invalid quantity' });
      }
    
      // Check if requested quantity exceeds available stock
      if (quantityNum > product.quantity) {
        return res.status(400).json({ 
          message: 'Requested quantity exceeds available stock',
          availableQuantity: product.quantity 
        });
      }
    
      // If within stock limit, proceed to update
      cart.items[productIndex].quantity = quantityNum;
      const salePrice = cart.items[productIndex].price;
      cart.items[productIndex].totalPrice = salePrice * quantityNum;
    
      await cart.save();
      res.status(200).json({ 
        message: 'Cart updated successfully',
        availableQuantity: product.quantity 
      });
    } else {
      res.status(404).json({ message: 'Product not found in cart' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating cart', error: error.message });
  }
};


const removeFromCart = async (req, res) => {
  try {
    const { itemId } = req.params;

    if (!req.session.user || !req.session.user.id) {
      return res.status(401).json({ message: 'User not authenticated', redirect: "/login" });
    }


    let cart = await Cart.findOne({ userId: req.session.user.id });

    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    cart.items = cart.items.filter(item => item.productId.toString() !== itemId);
    await cart.save();

    res.status(200).json({ message: 'Item removed from cart successfully' });
  } catch (error) {
    console.error('Error removing item from cart:', error);
    res.status(500).json({ message: 'Error removing item from cart', error: error.message });
  }
};

module.exports = {
  addToCart,
  getCart,
  updateCart,
  removeFromCart
};