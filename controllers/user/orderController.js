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

        if (!userAddress || userAddress.address.length === 0) {
            return res.status(404).json({ success: false, message: 'Address not found.' });
        }

        // Find the specific address from the array
        const addressDetails = userAddress.address.find(addr => addr._id.toString() === addressId);

        if (!addressDetails) {
            return res.status(404).json({ success: false, message: 'Address not found.' });
        }

        // Fetch the user's cart items
        const cart = await Cart.findOne({ userId }).populate('items.productId');

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ success: false, message: 'Cart is empty.' });
        }

        // Check if all items have sufficient stock
        for (const item of cart.items) {
            const product = item.productId;

            // If product is out of stock or doesn't have enough quantity
            if (product.quantity < item.quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Product "${product.productName}" is out of stock or insufficient quantity. Available stock: ${product.quantity}.`
                });
            }
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
            address: addressDetails, 
            status: 'Pending', 
            createdOn: new Date()
        };

        // Create and save the order
        const order = new Order(orderData);
        await order.save();

        // Reduce the product stock for each item after successful order placement
        for (const item of cart.items) {
            await Product.findByIdAndUpdate(item.productId, {
                $inc: { quantity: -item.quantity }
            });
        }

        // Clear the cart after successful order placement
        await Cart.deleteOne({ userId });

        return res.json({ success: true, message: "Order placed successfully!" });

    } catch (error) {
        console.error('Error placing order:', error);
        res.status(500).json({ success: false, message: "Error placing order." });
    }
};


const cancelOrder = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (order.status !== 'Pending') {
            return res.status(400).json({ message: 'Only pending orders can be cancelled' });
        }

        for (const item of order.orderedItems) {
            const product = item.product;

            // Update the product stock
            await Product.findByIdAndUpdate(product._id, {
                $inc: { quantity: item.quantity } // Add back the quantity to the product stock
            });
        }


        order.status = 'Cancelled';
        await order.save();

        // Here you might want to add logic to refund the payment, 
        // update inventory, etc.

        res.status(200).json({ message: 'Order cancelled successfully', order });
    } catch (error) {
        console.error('Error cancelling order:', error);
        res.status(500).json({ message: 'An error occurred while cancelling the order' });
    }
};



module.exports = {
    placeOrder,
    cancelOrder
}
