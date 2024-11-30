const Cart = require('../../models/cartSchema');
const Address = require('../../models/addressSchema');
const user = require("../../models/userSchema")




const getCheckoutPage = async (req, res) => {
    try {
        const userId = req.session.user?.id;

        if (!userId) {
            return res.status(401).redirect('/login');
        }

       
        const cart = await Cart.findOne({ userId }).populate('items.productId');
        
        if (!cart || cart.items.length === 0) {
            return res.render('cart', { 
                cart: [], 
                total: 0, 
                addresses: [], 
                address: {}, 
                discountAmount: 0 
            });
        }

      
        const filteredItems = cart.items.filter(item => {
            return item.productId && !item.productId.isBlocked;
        });

       

      
        const total = filteredItems.reduce((sum, item) => sum + item.totalPrice, 0);

    
        const userData = await user.findById(userId);

        
        const userAddresses = await Address.findOne({ userId });
        let addresses = [];
        let defaultAddressId = null;

        if (userAddresses && userAddresses.address && userAddresses.address.length > 0) {
            addresses = userAddresses.address;
          
            const defaultAddress = addresses.find(address => address.isDefault);
            defaultAddressId = defaultAddress ? defaultAddress._id : null;
        }

        
        const discountAmount = 0;

        res.render('checkout', {
            cart: filteredItems,
            total,
            addresses,
            address: {},
            user: userData,
            defaultAddressId,
            discountAmount
        });

    } catch (error) {
        console.error('Error fetching checkout page:', error);
        res.status(500).send('Internal Server Error');
    }
};




module.exports = { getCheckoutPage };
