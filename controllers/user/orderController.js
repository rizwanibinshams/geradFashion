const Order = require('../../models/orderSchema');
const Product = require('../../models/productSchema');
const Address = require('../../models/addressSchema')
const mongoose = require('mongoose');



const checkoutPage = async (req, res) => {
    try {
        const { orderedItems, street, city, state, postalCode, country, discount } = req.body;

        // Create the address document
        const newAddress = new Address({
            street,
            city,
            state,
            postalCode,
          
        });
        await newAddress.save();

        // Calculate total price
        let totalPrice = 0;
        const populatedItems = await Promise.all(orderedItems.map(async (item) => {
            const product = await Product.findById(item.productId);
            const price = product.price * item.quantity;
            totalPrice += price;
            return {
                product: product._id,
                quantity: item.quantity,
                price: product.price
            };
        }));

        // Calculate final amount
        const finalAmount = totalPrice - discount;

        // Create the order
        const newOrder = new Order({
            orderedItems: populatedItems,
            totalPrice,
            discount,
            finalAmount,
            address: newAddress._id,
            status: 'Pending',
            couponApplied: discount > 0
        });
        await newOrder.save();

        // Send success response
        res.status(201).json({
            message: 'Order successfully placed',
            orderId: newOrder.orderId
        });

    } catch (error) {
        console.error(error.message);
        res.status(400).send(`Error: ${error.message}`);
    }
};



const placeOrder = async (req, res) => {
    try {
        const { orderedItems, addressId, totalPrice, finalAmount } = req.body;

        // Create a new order
        const newOrder = new Order({
            orderedItems,
            totalPrice,
            finalAmount,
            address: addressId,
            status: 'Pending', // Initial status
            couponApplied: false, // For now we assume no coupon is applied
        });

        await newOrder.save();

        // Send response
        res.status(201).json({
            message: 'Order placed successfully',
            orderId: newOrder.orderId
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to place order' });
    }
};

module.exports = {
    checkoutPage,
    placeOrder
}