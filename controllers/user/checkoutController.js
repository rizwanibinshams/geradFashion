const Cart = require('../../models/cartSchema');
const Address = require('../../models/addressSchema');
const user = require("../../models/userSchema")





// const getCheckoutPage = async (req, res) => {
//     try {
       

//         const userId = req.session.user?.id; // Use optional chaining to avoid error

//         if (!userId) {
//             return res.status(401).redirect('/login');
//         }

//         // Fetch the user's cart
//         const cart = await Cart.findOne({ userId }).populate('items.productId');
//         if (!cart || cart.items.length === 0) {
//             return res.render('cart', { cart: [], total: 0, addresses: [], address: {} });
//         }

//         // Calculate total price
//         const total = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);
//         // Fetch users
//         const userData = await user.findById(userId); // Corrected to use userId directly
//         // Fetch the user's addresses
//         const userAddresses = await Address.findOne({ userId });
//         let addresses = [];
//         if (userAddresses && userAddresses.address && userAddresses.address.length > 0) {
//             addresses = userAddresses.address;
//         }

//         // Render checkout page with cart, addresses, and an empty address object for the new address form
//         res.render('checkout', { cart: cart.items, total, addresses, address: {}, user: userData });
//     } catch (error) {
//         console.error('Error fetching checkout page:', error);
//         res.status(500).send('Internal Server Error');
//     }
// };

// const getCheckoutPage = async (req, res) => {
//     try {
//         const userId = req.session.user?.id;

//         if (!userId) {
//             return res.status(401).redirect('/login');
//         }

//         // Fetch the user's cart
//         const cart = await Cart.findOne({ userId }).populate('items.productId');
//         if (!cart || cart.items.length === 0) {
//             return res.render('cart', { cart: [], total: 0, addresses: [], address: {} });
//         }

//         // Calculate total price
//         const total = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);
        
//         // Fetch users
//         const userData = await user.findById(userId);
        
//         // Fetch the user's addresses
//         const userAddresses = await Address.findOne({ userId });
//         let addresses = [];
//         let defaultAddressId = null;
        
//         if (userAddresses && userAddresses.address && userAddresses.address.length > 0) {
//             addresses = userAddresses.address;
//             // Set the first address as default if there are addresses
//             defaultAddressId = addresses[0]._id;
//         }

//         res.render('checkout', { 
//             cart: cart.items, 
//             total, 
//             addresses, 
//             address: {}, 
//             user: userData,
//             defaultAddressId // Pass the default address ID to the template
//         });
//     } catch (error) {
//         console.error('Error fetching checkout page:', error);
//         res.status(500).send('Internal Server Error');
//     }
// };


const getCheckoutPage = async (req, res) => {
    try {
        const userId = req.session.user?.id;

        if (!userId) {
            return res.status(401).redirect('/login');
        }

        // Fetch the user's cart
        const cart = await Cart.findOne({ userId }).populate('items.productId');
        if (!cart || cart.items.length === 0) {
            return res.render('cart', { cart: [], total: 0, addresses: [], address: {}, discountAmount: 0 });
        }

        // Calculate total price
        const total = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);

        // Fetch user data
        const userData = await user.findById(userId);
        
        // Fetch the user's addresses
        const userAddresses = await Address.findOne({ userId });
        let addresses = [];
        let defaultAddressId = null;
        
        if (userAddresses && userAddresses.address && userAddresses.address.length > 0) {
            addresses = userAddresses.address;
            // Set the default address based on the isDefault property
            const defaultAddress = addresses.find(address => address.isDefault);
            defaultAddressId = defaultAddress ? defaultAddress._id : null; // Set to null if no default address found
        }

        // Initialize discount amount (you can replace this logic with your own)
        const discountAmount = 0; // Set the default value or calculate based on logic

        res.render('checkout', { 
            cart: cart.items, 
            total, 
            addresses, 
            address: {}, 
            user: userData,
            defaultAddressId, // Pass the default address ID to the template
            discountAmount // Pass the discount amount to the template
        });
    } catch (error) {
        console.error('Error fetching checkout page:', error);
        res.status(500).send('Internal Server Error');
    }
};



module.exports = { getCheckoutPage };
