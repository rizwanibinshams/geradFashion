// Returns controller
const { Order } = require('../../models/orderSchema');
const Wallet = require("../../models/walletSchema")
const mongoose = require('mongoose');
const Product = require("../../models/productSchema")

// Handle return request
const initiateReturn = async (req, res) => {
    try {
        const { orderId, reason, otherReason, comments } = req.body;
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        await order.initiateReturn({ reason, otherReason, comments });
        res.status(200).json({ success: true, message: 'Return request submitted successfully' });
    } catch (error) {
        console.error('Error initiating return request:', error);
        res.status(500).json({ success: false, message: 'An unexpected error occurred while processing your return request. Please try again later.' });
    }
};



// const updateReturnStatus = async (req, res) => {
//     try {
//         const { orderId, status } = req.body;
//         const order = await Order.findById(orderId).populate('user').populate('orderedItems.product');

//         if (!order) {
//             return res.status(404).json({ success: false, message: 'Order not found' });
//         }

//         if (!order.user) {
//             return res.status(400).json({ 
//                 success: false, 
//                 message: 'User information not found in order' 
//             });
//         }

//         if (status === 'approved') {
//             let refundAmount = 0;
//             if (order.paymentMethod === 'razorpay') {
//                 const totalPrice = order.totalPrice;
//                 const discountAmount = order.discount || 0;
//                 const couponDiscount = order.coupon?.discountAmount || 0;

//                 refundAmount = totalPrice - discountAmount - couponDiscount;

//                 try {
//                     // Find or create wallet
//                     let wallet = await Wallet.findOne({ userId: order.user._id });
                    
//                     if (!wallet) {
//                         wallet = new Wallet({
//                             userId: order.user._id,
//                             balance: 0,
//                             transactionHistory: []
//                         });
//                         await wallet.save();
//                     }

//                     // Add refund to wallet
//                     await wallet.addMoney(
//                         refundAmount, 
//                         `Refund for order #${order.orderId} return`
//                     );

//                     // Update order's return information
//                     order.return.refundAmount = refundAmount;
//                     order.return.refundStatus = 'completed';
//                     order.return.refundDate = new Date();
//                     order.return.timeline.push({
//                         status: 'refund_processed',
//                         date: new Date(),
//                         comment: `Refund of ₹${refundAmount} processed to wallet`
//                     });

//                     // Update product quantities
//                     for (const item of order.orderedItems) {
//                         if (item.product) {
//                             const product = item.product;
//                             const updatedProduct = await Product.findByIdAndUpdate(
//                                 product._id,
//                                 {
//                                     $inc: { quantity: item.quantity },
//                                     $set: {
//                                         status: (product.quantity + item.quantity) > 0 ? 'Available' : 'Out of Stock'
//                                     }
//                                 },
//                                 { new: true }
//                             );

//                             console.log(`Updated quantity for product ${product.productName}: +${item.quantity}`);
//                         }
//                     }

//                     await order.save();

//                     console.log('Return processed successfully:', {
//                         userId: order.user._id,
//                         refundAmount,
//                         walletBalance: wallet.balance,
//                         productsUpdated: order.orderedItems.length
//                     });
//                 } catch (operationError) {
//                     console.error('Error processing refund:', operationError);
//                     throw operationError;
//                 }
//             }

//             // Approve the return
//             await order.approveReturn();

//             return res.status(200).json({ 
//                 success: true, 
//                 message: 'Return approved and refund processed',
//                 refundAmount,
//                 walletMessage: refundAmount > 0 ? 
//                     `₹${refundAmount} has been added to your wallet` : null
//             });
//         } else {
//             await order.updateReturnStatus(status, 'Return request processed');
            
//             return res.status(200).json({ 
//                 success: true, 
//                 message: 'Return status updated successfully' 
//             });
//         }
//     } catch (error) {
//         console.error('Error updating return status:', error);
//         res.status(500).json({ 
//             success: false, 
//             message: 'Error updating return status', 
//             error: error.message 
//         });
//     }
// };



const updateReturnStatus = async (req, res) => {
    try {
        const { orderId, status, comment } = req.body;
        const order = await Order.findById(orderId).populate('user').populate('orderedItems.product');

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        if (!order.user) {
            return res.status(400).json({ 
                success: false, 
                message: 'User information not found in order' 
            });
        }

        if (status === 'approved') {
            let refundAmount = 0;
            if (order.paymentMethod === 'razorpay' || order.paymentMethod === 'cashOnDelivery') {
                // ... existing refund calculation code ...
                const finalAmount = order.finalAmount;
                const discountAmount = order.discount || 0;
                const deliveryCharge = order.deliveryCharge || 0;

                refundAmount = finalAmount;
                if (discountAmount > 0) {
                    refundAmount -= discountAmount;
                }
                if (deliveryCharge > 0) {
                    refundAmount -= deliveryCharge;
                }
                refundAmount = Math.max(refundAmount, 0);

                try {
                    // ... existing wallet handling code ...
                    let wallet = await Wallet.findOne({ userId: order.user._id });
                    if (!wallet) {
                        wallet = new Wallet({
                            userId: order.user._id,
                            balance: 0,
                            transactionHistory: []
                        });
                        await wallet.save();
                    }

                    await wallet.addMoney(refundAmount, `Refund for order #${order.orderId} return`);

                    // Update return information
                    order.return.refundAmount = refundAmount;
                    order.return.refundStatus = 'completed';
                    order.return.refundDate = new Date();
                    order.return.timeline.push({
                        status: 'refund_processed',
                        date: new Date(),
                        comment: `Refund of ₹${refundAmount} processed to wallet`
                    });

                    // Update product quantities
                    for (const item of order.orderedItems) {
                        if (item.product) {
                            await Product.findByIdAndUpdate(
                                item.product._id,
                                {
                                    $inc: { quantity: item.quantity },
                                    $set: {
                                        status: (item.product.quantity + item.quantity) > 0 ? 'Available' : 'Out of Stock'
                                    }
                                }
                            );
                        }
                    }

                    await order.save();
                } catch (operationError) {
                    console.error('Error processing refund:', operationError);
                    throw operationError;
                }
            }

            await order.approveReturn();
            
            return res.status(200).json({ 
                success: true, 
                message: 'Return approved and refund processed',
                refundAmount,
                walletMessage: refundAmount > 0 ? 
                    `₹${refundAmount} has been added to your wallet` : null
            });
        } else if (status === 'rejected') {
            // Handle rejection
            await order.updateReturnStatus('rejected', comment || 'Return request rejected');
            
            return res.status(200).json({ 
                success: true, 
                message: 'Return request rejected successfully' 
            });
        } else {
            // Handle other status updates
            await order.updateReturnStatus(status, comment || 'Return status updated');
            
            return res.status(200).json({ 
                success: true, 
                message: 'Return status updated successfully' 
            });
        }
    } catch (error) {
        console.error('Error updating return status:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error updating return status', 
            error: error.message 
        });
    }
};




const renderReturnManagementPage = async (req, res) => {
    try {
        const returnRequests = await Order.find({ 'return.requested': true })
            .populate('return.processedBy', 'name')
            .populate({
                path: 'orderedItems.product',
                select: 'productName price productImage', // Match the fields you're using
                model: 'Product'
            })
            .sort({ 'return.requestDate': -1 })
            .lean();

        res.render('return-management', { 
            returnRequests,
            helpers: {
                getProductImage: function(product) {
                    if (product && product.productImage && product.productImage.length > 0) {
                        return `/uploads/product-images/${product.productImage[0]}`;
                    }
                    return '/placeholder-image.jpg';
                }
            }
        });
    } catch (error) {
        console.error('Error in renderReturnManagementPage:', error);
        res.status(500).render('error', { 
            message: 'Error fetching return requests', 
            error: error.message 
        });
    }
};



module.exports = {
    initiateReturn,
    updateReturnStatus,
    renderReturnManagementPage
}