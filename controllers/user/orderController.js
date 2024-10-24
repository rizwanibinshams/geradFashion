const { Order, Address } = require('../../models/orderSchema');
const Product = require('../../models/productSchema');
const Cart = require("../../models/cartSchema");
const Coupon = require("../../models/couponSchema")
const mongoose = require('mongoose');



// const placeOrder = async (req, res) => {
//     try {
//         const { addressId, paymentMethod, couponCode } = req.body;
//         const userId = req.session.user?.id;

//         if (!userId) {
//             return res.status(401).json({ success: false, message: 'User not authenticated.' });
//         }

//         // Fetch cart and validate items
//         const cart = await Cart.findOne({ userId }).populate('items.productId');
//         if (!cart || cart.items.length === 0) {
//             return res.status(400).json({ success: false, message: 'Cart is empty.' });
//         }

//         // Validate address
//         const userAddress = await Address.findOne({ 
//             userId, 
//             'address._id': addressId 
//         });
        
//         if (!userAddress) {
//             return res.status(404).json({ success: false, message: 'Address not found.' });
//         }

//         const addressDetails = userAddress.address.find(addr => addr._id.toString() === addressId);
//         if (!addressDetails) {
//             return res.status(404).json({ success: false, message: 'Specific address not found.' });
//         }

//         // Calculate initial total
//         let totalPrice = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);
//         let discountAmount = 0;
//         let couponApplied = false;
//         let appliedCouponCode = null;

//         // Handle coupon if provided
//         if (couponCode) {
//             const coupon = await Coupon.findOne({ 
//                 code: couponCode, 
//                 isActive: true,
//                 validUntil: { $gt: new Date() },
//                 maxUses: { $gt: 0 }  // Added check for remaining uses
//             });

//             if (coupon) {
//                 // Calculate discount
//                 if (coupon.discountType === 'percentage') {
//                     discountAmount = (totalPrice * coupon.discountValue) / 100;
//                     if (coupon.maxDiscount) {
//                         discountAmount = Math.min(discountAmount, coupon.maxDiscount);
//                     }
//                 } else if (coupon.discountType === 'flat') {
//                     discountAmount = Math.min(coupon.discountValue, totalPrice);
//                 }

//                 couponApplied = true;
//                 appliedCouponCode = coupon.code;

//                 // Update coupon usage and decrement maxUses
//                 await Coupon.findByIdAndUpdate(coupon._id, {
//                     $inc: { 
//                         usedCount: 1,
//                         maxUses: -1  // Decrement maxUses
//                     }
//                 });
//             }
//         }

//         // Prepare order data according to schema
//         const orderData = {
//             user: userId,
//             paymentMethod,
//             orderedItems: cart.items.map(item => ({
//                 product: item.productId._id,
//                 quantity: item.quantity,
//                 price: item.totalPrice
//             })),
//             totalPrice: totalPrice,
//             discount: discountAmount,
//             finalAmount: totalPrice - discountAmount,
//             address: {
//                 name: addressDetails.name,
//                 street: addressDetails.street,
//                 city: addressDetails.city,
//                 state: addressDetails.state,
//                 pincode: addressDetails.pincode,
//                 phone: addressDetails.phone,
//                 addressType: addressDetails.addressType
//             },
//             status: 'Pending',
//             createdOn: new Date(),
//             coupon: {
//                 applied: couponApplied,
//                 code: appliedCouponCode,
//                 discountAmount: discountAmount
//             },
//             invoiceDate: new Date()
//         };

//         // Create and save order
//         const order = new Order(orderData);
//         await order.save();

//         // Update product stock
//         for (const item of cart.items) {
//             await Product.findByIdAndUpdate(item.productId._id, {
//                 $inc: { quantity: -item.quantity }
//             });
//         }

//         // Clear cart
//         await Cart.deleteOne({ userId });

//         return res.json({ 
//             success: true, 
//             message: "Order placed successfully!",
//             orderId: order.orderId,
//             orderDetails: {
//                 totalPrice,
//                 discountAmount,
//                 finalAmount: totalPrice - discountAmount,
//                 couponApplied
//             }
//         });

//     } catch (error) {
//         console.error('Error placing order:', error);
//         res.status(500).json({ success: false, message: "Error placing order." });
//     }
// };


const placeOrder = async (req, res) => {
    try {
        const { addressId, paymentMethod, couponCode } = req.body;
        const userId = req.session.user?.id;
        const DELIVERY_CHARGE = 250;
        const FREE_DELIVERY_THRESHOLD = 1000;

        if (!userId) {
            return res.status(401).json({ success: false, message: 'User not authenticated.' });
        }

        // Fetch cart and validate items
        const cart = await Cart.findOne({ userId }).populate('items.productId');
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ success: false, message: 'Cart is empty.' });
        }

        // Validate address
        const userAddress = await Address.findOne({ 
            userId, 
            'address._id': addressId 
        });
        
        if (!userAddress) {
            return res.status(404).json({ success: false, message: 'Address not found.' });
        }

        const addressDetails = userAddress.address.find(addr => addr._id.toString() === addressId);
        if (!addressDetails) {
            return res.status(404).json({ success: false, message: 'Specific address not found.' });
        }

        // Calculate initial total
        let subtotal = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);
        let discountAmount = 0;
        let couponApplied = false;
        let appliedCouponCode = null;

        // Calculate delivery charge
        const deliveryCharge = subtotal < FREE_DELIVERY_THRESHOLD ? DELIVERY_CHARGE : 0;

        // Handle coupon if provided
        if (couponCode) {
            const coupon = await Coupon.findOne({ 
                code: couponCode, 
                isActive: true,
                validUntil: { $gt: new Date() },
                maxUses: { $gt: 0 }
            });

            if (coupon) {
                // Calculate discount based on subtotal (before delivery charge)
                if (coupon.discountType === 'percentage') {
                    discountAmount = (subtotal * coupon.discountValue) / 100;
                    if (coupon.maxDiscount) {
                        discountAmount = Math.min(discountAmount, coupon.maxDiscount);
                    }
                } else if (coupon.discountType === 'flat') {
                    discountAmount = Math.min(coupon.discountValue, subtotal);
                }

                couponApplied = true;
                appliedCouponCode = coupon.code;

                // Update coupon usage
                await Coupon.findByIdAndUpdate(coupon._id, {
                    $inc: { 
                        usedCount: 1,
                        maxUses: -1
                    }
                });
            }
        }

        // Calculate final amount including delivery charge
        const finalAmount = subtotal - discountAmount + deliveryCharge;

        // Prepare order data according to schema
        const orderData = {
            user: userId,
            paymentMethod,
            orderedItems: cart.items.map(item => ({
                product: item.productId._id,
                quantity: item.quantity,
                price: item.totalPrice
            })),
            totalPrice: subtotal,
            discount: discountAmount,
            deliveryCharge,
            finalAmount,
            address: {
                name: addressDetails.name,
                street: addressDetails.street,
                city: addressDetails.city,
                state: addressDetails.state,
                pincode: addressDetails.pincode,
                phone: addressDetails.phone,
                addressType: addressDetails.addressType
            },
            status: 'Pending',
            createdOn: new Date(),
            coupon: {
                applied: couponApplied,
                code: appliedCouponCode,
                discountAmount: discountAmount
            },
            invoiceDate: new Date()
        };

        // Create and save order
        const order = new Order(orderData);
        await order.save();

        // Update product stock
        for (const item of cart.items) {
            await Product.findByIdAndUpdate(item.productId._id, {
                $inc: { quantity: -item.quantity }
            });
        }

        // Clear cart
        await Cart.deleteOne({ userId });

        return res.json({ 
            success: true, 
            message: "Order placed successfully!",
            orderId: order.orderId,
            orderDetails: {
                subtotal,
                deliveryCharge,
                discountAmount,
                finalAmount,
                couponApplied,
                freeDeliveryEligible: subtotal >= FREE_DELIVERY_THRESHOLD,
                amountForFreeDelivery: subtotal < FREE_DELIVERY_THRESHOLD ? 
                    FREE_DELIVERY_THRESHOLD - subtotal : 0
            }
        });

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
