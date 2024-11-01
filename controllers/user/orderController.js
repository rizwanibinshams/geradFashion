const { Order, Address } = require('../../models/orderSchema');
const Product = require('../../models/productSchema');
const Cart = require("../../models/cartSchema");
const Coupon = require("../../models/couponSchema")
const Wallet = require("../../models/walletSchema")
const mongoose = require('mongoose');
const { format } = require('date-fns');
const User = require("../../models/userSchema")



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
        const { addressId, paymentMethod, couponCode, paymentDetails } = req.body;
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

        const quantityErrors = [];
        for (const item of cart.items) {
            const product = await Product.findById(item.productId._id);
            if (!product) {
                quantityErrors.push(`Product ${item.productId.productName} is no longer available`);
            } else if (product.quantity < item.quantity) {
                quantityErrors.push(`Only ${product.quantity} units available for ${product.productName}. You requested ${item.quantity}`);
            }
        }

        if (quantityErrors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Quantity issues found',
                quantityErrors
            });
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
        price: item.totalPrice,
        status: 'Pending'  // Add this line to set the initial status
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
            invoiceDate: new Date(),
            paymentDetails: paymentMethod === 'razorpay' ? {
                razorpayPaymentId: paymentDetails?.razorpay_payment_id,
                razorpayOrderId: paymentDetails?.razorpay_order_id,
                razorpaySignature: paymentDetails?.razorpay_signature,
                paymentStatus: 'Completed'  // For Razorpay
            } : {
                paymentStatus: 'Pending'    // For Cash on Delivery
            }


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
                orderId: order.orderId,  // Ensure this is included
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




// const cancelOrderItem = async (req, res) => {
//     try {
//         const { orderId, itemId } = req.params;
//         const order = await Order.findById(orderId);

//         if (!order) {
//             return res.status(404).json({ message: 'Order not found' });
//         }

//         // Find the specific item in the order
//         const orderItem = order.orderedItems.id(itemId);
//         if (!orderItem) {
//             return res.status(404).json({ message: 'Order item not found' });
//         }

//         if (orderItem.status === 'Cancelled') {
//             return res.status(400).json({ message: 'Item is already cancelled' });
//         }

//         if (order.status !== 'Pending') {
//             return res.status(400).json({ message: 'Can only cancel items from pending orders' });
//         }

//         // Update product stock
//         await Product.findByIdAndUpdate(orderItem.product, {
//             $inc: { quantity: orderItem.quantity }
//         });

//         // Update item status
//         orderItem.status = 'Cancelled';
        
//         // Calculate refund amount for this item
//         const refundAmount = orderItem.price * orderItem.quantity;
        
//         // Check if all items in the order are cancelled
//         const allItemsCancelled = order.orderedItems.every(item => item.status === 'Cancelled');
//         if (allItemsCancelled) {
//             order.status = 'Cancelled';
//         }

//         // Update final amount
//         order.finalAmount -= refundAmount;
        
//         await order.save();

//         res.status(200).json({
//             message: 'Item cancelled successfully',
//             order,
//             refundAmount
//         });
//     } catch (error) {
//         console.error('Error cancelling order item:', error);
//         res.status(500).json({ message: 'An error occurred while cancelling the item' });
//     }
// };

const cancelOrderItem = async (req, res) => {
    try {
        const { orderId, itemId } = req.params;
        const userId = req.session.user?.id;

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Find the specific item in the order
        const orderItem = order.orderedItems.id(itemId);
        if (!orderItem) {
            return res.status(404).json({ message: 'Order item not found' });
        }

        if (orderItem.status === 'Cancelled') {
            return res.status(400).json({ message: 'Item is already cancelled' });
        }

        if (order.status !== 'Pending') {
            return res.status(400).json({ message: 'Can only cancel items from pending orders' });
        }

        // Update product stock first
        await Product.findByIdAndUpdate(
            orderItem.product,
            { $inc: { quantity: orderItem.quantity } }
        );

        // Update order item status
        orderItem.status = 'Cancelled';

        // Check if all items in the order are cancelled
        const allItemsCancelled = order.orderedItems.every(item => 
            item.status === 'Cancelled'
        );

        if (allItemsCancelled) {
            order.status = 'Cancelled';
        }

        // Process refund only if payment method is Razorpay
        let refundAmount = 0;
        if (order.paymentMethod === 'razorpay') {
            const totalPrice = orderItem.price; // Total price of the cancelled item
            const discountAmount = order.discount?.discount || 0; // Get discount amount, default to 0 if not present

            // Calculate the refund amount
            refundAmount = totalPrice - discountAmount; // Full price refunded, consider discount in business logic if needed
            
            // Find or create wallet
            let wallet = await Wallet.findOne({ userId });
            if (!wallet) {
                wallet = new Wallet({
                    userId,
                    balance: 0,
                    transactionHistory: []
                });
            }

            // Add refund to wallet using the schema method
            await wallet.addMoney(refundAmount, `Refund for cancelled order item #${order.orderId}`);

            // Update final amount (if needed)
            order.finalAmount -= refundAmount;

            // Save the order
            await order.save();

            return res.status(200).json({
                success: true,
                message: 'Item cancelled successfully',
                order,
                refundAmount,
                walletMessage: `₹${refundAmount} has been added to your wallet`
            });
        }

        // Save the order without refund if not Razorpay
        await order.save();

        res.status(200).json({
            success: true,
            message: 'Item cancelled successfully',
            order,
            walletMessage: null // No refund message since it's not Razorpay
        });

    } catch (error) {
        console.error('Error cancelling order item:', error);
        res.status(500).json({ 
            success: false,
            message: 'An error occurred while cancelling the item'
        });
    }
};




const trackOrder = async (req, res) => {
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


        const orderId = req.params.orderId;

        const order = await Order.findById(orderId)
            .populate({
                path: 'orderedItems.product',
                select: 'productName price productImage'
            })
            .populate('user', 'name email');

        if (!order) {
            return res.status(404).render('tracking', { 
                error: 'Order not found',
                orderData: null
            });
        }

        // Define tracking stages and their corresponding status codes
        const trackingStages = [
            { status: 'ordered', label: 'Order Placed', icon: 'shopping-bag' },
            { status: 'confirmed', label: 'Order Confirmed', icon: 'check-circle' },
            { status: 'processing', label: 'Processing', icon: 'clock' },
            { status: 'shipped', label: 'Shipped', icon: 'truck' },
            { status: 'delivered', label: 'Delivered', icon: 'package' }
        ];

        // Find current stage index
        const currentStageIndex = trackingStages.findIndex(stage => 
            stage.status === order.status);

        // Process tracking timeline
        const trackingTimeline = trackingStages.map((stage, index) => ({
            ...stage,
            isCompleted: index <= currentStageIndex,
            isCurrent: index === currentStageIndex,
            date: order.statusUpdates?.find(update => 
                update.status === stage.status)?.date || null
        }));

        // Format order data for template
        const orderData = {
            orderId: order._id,
            orderDate: format(order.createdOn, 'MMM dd, yyyy'),
            status: order.status,
            trackingNumber: order.trackingNumber || 'Pending',
            estimatedDelivery: order.estimatedDelivery 
                ? format(order.estimatedDelivery, 'MMM dd, yyyy')
                : 'Calculating...',
            items: order.orderedItems.map(item => ({
                name: item.product.productName,
                quantity: item.quantity,
                price: item.price,
                image: item.product.productImage?.[0] 
                    ? `/uploads/product-images/${item.product.productImage[0]}`
                    : '/images/placeholder.jpg',
                subtotal: item.price * item.quantity
            })),
            subtotal: order.totalPrice,
            deliveryCharge: order.deliveryCharge,
            discountAmount: order.discount,
            finalAmount: order.finalAmount,
            couponApplied: order.coupon.applied,
            appliedCouponCode: order.coupon.code || '',
            shippingAddress: order.address || {},  // Ensure it's an object
            trackingTimeline,
            paymentStatus: order.paymentStatus
        };

        res.render('tracking', { 
            user: userData ,
            orderData,
            error: null,
            helpers: {
                formatCurrency: (amount) => `₹${Number(amount).toFixed(2)}`,
                formatDate: (date) => format(new Date(date), 'MMM dd, yyyy')
            }
        });
        
    } catch (error) {
        console.error('Error tracking order:', error);
        res.status(500).render('tracking', { 
            error: 'Unable to fetch order details',
            orderData: null
        });
    }
};



module.exports = {
    placeOrder,
    // cancelOrder,
    cancelOrderItem,
    trackOrder 
}
