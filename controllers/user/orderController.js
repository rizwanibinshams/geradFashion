const { Order, Address } = require('../../models/orderSchema');
const Product = require('../../models/productSchema');
const Cart = require("../../models/cartSchema");
const mongoose = require('mongoose');

const placeOrder = async (req, res) => {
    try {
        const { addressId, paymentMethod } = req.body; // Ensure paymentMethod is passed in the request
        const userId = req.session.user?.id; // Ensure user is authenticated

        if (!userId) {
            return res.status(401).json({ success: false, message: 'User not authenticated.' });
        }

        // Fetch the address using the provided addressId
        const userAddress = await Address.findOne({ 
            userId, 
            'address._id': addressId 
        });

        console.log('User Address:', userAddress);

        if (!userAddress || userAddress.address.length === 0) {
            return res.status(404).json({ success: false, message: 'Address not found.' });
        }

        // Find the specific address from the array
        const addressDetails = userAddress.address.find(addr => addr._id.toString() === addressId);

        console.log('Address Details:', addressDetails);

        if (!addressDetails) {
            return res.status(404).json({ success: false, message: 'Address not found.' });
        }

        // Fetch the user's cart items
        const cart = await Cart.findOne({ userId }).populate('items.productId');

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ success: false, message: 'Cart is empty.' });
        }

        // Calculate total price from cart items
        const totalPrice = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);

        // Prepare order data
        const orderData = {
            user: userId, // Add the user ID here
            paymentMethod, // Include the payment method
            orderedItems: cart.items.map(item => ({
                product: item.productId,
                quantity: item.quantity,
                price: item.totalPrice
            })),
            totalPrice,
            finalAmount: totalPrice, // Adjust based on discounts if applicable
            address: addressDetails, // Use the specific address details
            status: 'Pending', // Initial order status
            createdOn: new Date()
        };

        // Create and save the order
        const order = new Order(orderData);
        await order.save();

        // Clear the cart after successful order placement
        await Cart.deleteOne({ userId });

        return res.json({ success: true, message: "Order placed successfully!" });

    } catch (error) {
        console.error('Error placing order:', error);
        res.status(500).json({ success: false, message: "Error placing order." });
    }
};


module.exports = {
    placeOrder
}
