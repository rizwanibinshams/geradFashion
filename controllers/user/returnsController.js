// Returns controller
const { Order } = require('../../models/orderSchema');
const Wallet = require("../../models/walletSchema")
const mongoose = require('mongoose');
const Product = require("../../models/productSchema")

// Handle return request
const initiateReturn = async (req, res) => {
    try {
        const { orderId, items, reason, comments } = req.body;
        
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Please select at least one item to return' 
            });
        }

        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ 
                success: false, 
                message: 'Order not found' 
            });
        }

        // Validate that all items exist in the order and are eligible for return
        const invalidItems = items.filter(itemId => {
            const orderItem = order.orderedItems.find(oi => oi._id.toString() === itemId);
            return !orderItem || orderItem.status === 'Cancelled' || orderItem.status === 'Returned';
        });

        if (invalidItems.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'One or more selected items are not eligible for return' 
            });
        }

        // Calculate return amount for selected items
        let returnAmount = 0;
        items.forEach(itemId => {
            const orderItem = order.orderedItems.find(oi => oi._id.toString() === itemId);
            returnAmount += orderItem.price * orderItem.quantity;
        });

        // Initialize return data
        const returnData = {
            requested: true,
            requestDate: new Date(),
            reason,
            comments,
            status: 'pending_approval',
            items: items.map(itemId => ({
                itemId,
                status: 'pending_approval'
            })),
            timeline: [{
                status: 'return_requested',
                date: new Date(),
                comment: `Return requested for ${items.length} item(s)`
            }],
            returnAmount
        };

        // Update order with return data
        order.return = returnData;

        // Update status of returned items
        order.orderedItems.forEach(item => {
            if (items.includes(item._id.toString())) {
                item.status = 'Return Requested';
            }
        });

        await order.save();

        res.status(200).json({ 
            success: true, 
            message: 'Return request submitted successfully'
        });
    } catch (error) {
        console.error('Error initiating return request:', error);
        res.status(500).json({ 
            success: false, 
            message: 'An unexpected error occurred while processing your return request.'
        });
    }
};

// const updateReturnStatus = async (req, res) => {
//     try {
//         const { orderId, status, comment } = req.body;
        
//         if (!orderId || !status) {
//             return res.status(400).json({ 
//                 success: false, 
//                 message: 'OrderId and status are required' 
//             });
//         }

//         const order = await Order.findById(orderId)
//             .populate('user')
//             .populate('orderedItems.product');

//         if (!order) {
//             return res.status(404).json({ 
//                 success: false, 
//                 message: 'Order not found' 
//             });
//         }

//         // Check for items with return requested status
//         const returnedItems = order.orderedItems.filter(item => 
//             item.status === 'Return Requested'
//         );

//         if (returnedItems.length === 0) {
//             return res.status(400).json({ 
//                 success: false, 
//                 message: 'No return request found for this order' 
//             });
//         }

//         if (status === 'approved') {
//             let refundAmount = 0;
            
//             // Calculate refund amount
//             returnedItems.forEach(item => {
//                 refundAmount += item.price * item.quantity;
//             });

//             // Handle delivery charge refund for full order returns
//             if (returnedItems.length === order.orderedItems.length && order.deliveryCharge > 0) {
//                 refundAmount += order.deliveryCharge;
//             }

//             if (order.paymentMethod === 'razorpay' || order.paymentMethod === 'cashOnDelivery') {
//                 try {
//                     // Process wallet refund
//                     let wallet = await Wallet.findOne({ userId: order.user._id });
//                     if (!wallet) {
//                         wallet = new Wallet({
//                             userId: order.user._id,
//                             balance: 0,
//                             transactionHistory: []
//                         });
//                     }

//                     await wallet.addMoney(refundAmount, `Refund for order #${order._id} return`);

//                     // Update return information
//                     order.return.refundAmount = refundAmount;
//                     order.return.refundStatus = 'completed';
//                     order.return.refundDate = new Date();
//                     order.return.status = status;
//                     order.return.processedDate = new Date();
//                     order.return.timeline.push({
//                         status: 'refund_processed',
//                         date: new Date(),
//                         comment: `Refund of ₹${refundAmount} processed to wallet`
//                     });

//                     // Update items status and product quantities
//                     for (const item of returnedItems) {
//                         if (item.product) {
//                             // Increase product quantity
//                             await Product.findByIdAndUpdate(
//                                 item.product._id,
//                                 { $inc: { quantity: item.quantity } }
//                             );
//                             item.status = 'Returned';
//                         }
//                     }

//                     // Update overall order status if all items are returned
//                     const allReturned = order.orderedItems.every(
//                         item => item.status === 'Returned' || item.status === 'Cancelled'
//                     );
//                     if (allReturned) {
//                         order.status = 'Returned';
//                     }

//                     await order.save();

//                     return res.status(200).json({
//                         success: true,
//                         message: 'Return approved and refund processed',
//                         refundAmount
//                     });
//                 } catch (error) {
//                     throw error;
//                 }
//             }
//         } else if (status === 'rejected') {
//             // Update return status for rejected returns
//             order.return.status = status;
//             order.return.processedDate = new Date();
//             order.return.timeline.push({
//                 status,
//                 date: new Date(),
//                 comment: comment || 'Return request rejected'
//             });

//             // Update items status
//             returnedItems.forEach(item => {
//                 item.status = 'Return Rejected';
//             });

//             // Revert order status to Delivered if all items are rejected
//             const allRejected = order.orderedItems.every(
//                 item => item.status !== 'Return Requested'
//             );
//             if (allRejected) {
//                 order.status = 'Delivered';
//             }

//             await order.save();

//             return res.status(200).json({
//                 success: true,
//                 message: 'Return request rejected successfully'
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
        
        if (!orderId || !status) {
            return res.status(400).json({ 
                success: false, 
                message: 'OrderId and status are required' 
            });
        }

        const order = await Order.findById(orderId)
            .populate('user')
            .populate('orderedItems.product');

        if (!order) {
            return res.status(404).json({ 
                success: false, 
                message: 'Order not found' 
            });
        }

        // Check for items with return requested status
        const returnedItems = order.orderedItems.filter(item => 
            item.status === 'Return Requested'
        );

        if (returnedItems.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'No return request found for this order' 
            });
        }

        if (status === 'approved') {
            // Calculate refund amount with detailed breakdown
            const refundCalculation = order.calculateReturnRefundAmount(returnedItems);
            const { totalRefundAmount, refundDetails } = refundCalculation;

            if (order.paymentMethod === 'razorpay' || order.paymentMethod === 'cashOnDelivery') {
                try {
                    // Process wallet refund
                    let wallet = await Wallet.findOne({ userId: order.user._id });
                    if (!wallet) {
                        wallet = new Wallet({
                            userId: order.user._id,
                            balance: 0,
                            transactionHistory: []
                        });
                    }

                    // Add refund to wallet
                    await wallet.addMoney(
                        totalRefundAmount, 
                        `Refund for return of items from order #${order.orderId}`
                    );

                    // Update return information in order
                    order.return.refundAmount = totalRefundAmount;
                    order.return.refundStatus = 'completed';
                    order.return.refundDate = new Date();
                    order.return.status = status;
                    order.return.processedDate = new Date();
                    
                    // Add detailed refund breakdown to timeline
                    const refundBreakdown = refundDetails.map(detail => 
                        `Item ${detail.itemId}: ₹${detail.itemRefundAmount.toFixed(2)} ` +
                        `(Price: ₹${detail.itemSubtotal.toFixed(2)}, ` +
                        `Discount: -₹${detail.itemCouponDiscount.toFixed(2)}, ` +
                        `Delivery: +₹${detail.itemDeliveryCharge.toFixed(2)})`
                    ).join('\n');

                    order.return.timeline.push({
                        status: 'refund_processed',
                        date: new Date(),
                        comment: `Refund of ₹${totalRefundAmount.toFixed(2)} processed to wallet\n${refundBreakdown}`
                    });

                    // Update items status and product quantities
                    for (const item of returnedItems) {
                        if (item.product) {
                            // Increase product quantity
                            await Product.findByIdAndUpdate(
                                item.product._id,
                                { $inc: { quantity: item.quantity } }
                            );
                            item.status = 'Returned';
                        }
                    }

                    // Update overall order status if all items are returned
                    const allReturned = order.orderedItems.every(
                        item => item.status === 'Returned' || item.status === 'Cancelled'
                    );
                    if (allReturned) {
                        order.status = 'Returned';
                    }

                    await order.save();

                    return res.status(200).json({
                        success: true,
                        message: 'Return approved and refund processed',
                        refundAmount: totalRefundAmount,
                        refundDetails: refundDetails
                    });
                } catch (error) {
                    throw error;
                }
            }
        } else if (status === 'rejected') {
            // Handle rejection logic
            order.return.status = status;
            order.return.processedDate = new Date();
            order.return.timeline.push({
                status,
                date: new Date(),
                comment: comment || 'Return request rejected'
            });

            // Update items status
            returnedItems.forEach(item => {
                item.status = 'Delivered'; // Revert to delivered status
                item.returnRequest.status = 'rejected';
            });

            // Revert order status to Delivered
            order.status = 'Delivered';

            await order.save();

            return res.status(200).json({
                success: true,
                message: 'Return request rejected successfully'
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
        // Add status filter if provided in query
        const statusFilter = req.query.status !== 'all' && req.query.status 
            ? { 'return.status': req.query.status }
            : {};

        const returnRequests = await Order.find({ 
            'return.requested': true,
            ...statusFilter 
        })
        .populate('user')
        .populate({
            path: 'orderedItems.product',
            select: 'productName sku price productImage quantity'
        })
        .sort({ 'return.requestDate': -1 });

        res.render('return-management', { 
            returnRequests,
            helpers: {
                getProductImage: function(product) {
                    if (product && product.productImage && product.productImage.length > 0) {
                        return `/uploads/product-images/${product.productImage[0]}`;
                    }
                    return '/placeholder-image.jpg';
                },
                isItemReturned: function(order, itemId) {
                    // For individual item returns, check if the item status is 'Return Requested'
                    const orderItem = order.orderedItems.find(
                        item => item._id.toString() === itemId.toString()
                    );
                    return orderItem && orderItem.status === 'Return Requested';
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