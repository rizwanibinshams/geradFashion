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
         
            const refundCalculation = order.calculateReturnRefundAmount(returnedItems);
            const { totalRefundAmount, refundDetails } = refundCalculation;

            if (order.paymentMethod === 'razorpay' || order.paymentMethod === 'cashOnDelivery' || order.paymentMethod === 'wallet') {
                try {
                
                    let wallet = await Wallet.findOne({ userId: order.user._id });
                    if (!wallet) {
                        wallet = new Wallet({
                            userId: order.user._id,
                            balance: 0,
                            transactionHistory: []
                        });
                    }

                    
                    await wallet.addMoney(
                        totalRefundAmount, 
                        `Refund for return of items from order #${order.orderId}`
                    );

                   
                    order.return.refundAmount = totalRefundAmount;
                    order.return.refundStatus = 'completed';
                    order.return.refundDate = new Date();
                    order.return.status = status;
                    order.return.processedDate = new Date();
                    
                    
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

                   
                    for (const item of returnedItems) {
                        if (item.product) {
                            // Increase product quantity
                            await Product.findByIdAndUpdate(
                                item.product._id,
                                { $inc: { quantity: item.quantity } }
                            );
                            
                            item.status = 'Return Approved';
                        }
                    }

                  
                    const allReturned = order.orderedItems.every(
                        item => ['Return Approved', 'Cancelled'].includes(item.status)
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
         
            order.return.status = status;
            order.return.processedDate = new Date();
            order.return.timeline.push({
                status,
                date: new Date(),
                comment: comment || 'Return request rejected'
            });

       
            returnedItems.forEach(item => {
                item.status = 'Delivered';
                if (item.returnRequest) {
                    item.returnRequest.status = 'rejected';
                }
            });

            
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
                
                    const orderItem = order.orderedItems.find(
                        item => item._id.toString() === itemId.toString()
                    );
                  
                    const returnStatuses = ['Return Requested', 'Return Approved', 'Returned'];
                    return orderItem && returnStatuses.includes(orderItem.status);
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