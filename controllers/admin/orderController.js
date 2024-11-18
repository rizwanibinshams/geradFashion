const { Order } = require('../../models/orderSchema');
const Product = require('../../models/productSchema'); 


const getAllOrders = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;
    const selectedStatus = req.query.status || null;

    try {
        // Build query based on status filter
        let query = {};
        if (selectedStatus && selectedStatus !== 'All') {
            query.status = selectedStatus;
        }

        const totalOrders = await Order.countDocuments(query);
        const orders = await Order.find(query)
            .populate('user')
            .populate({
                path: 'orderedItems.product',
                select: 'productName salePrice'
            })
            .sort({ createdOn: -1 })
            .skip(skip)
            .limit(limit);

        const totalPages = Math.ceil(totalOrders / limit);

        if (orders.length === 0) {
            return res.render('order', { 
                orders: [], 
                message: 'No orders found.', 
                getStatusColor, 
                currentPage: page, 
                totalPages,
                selectedStatus 
            });
        }

        return res.render('order', { 
            orders, 
            message: null, 
            getStatusColor, 
            currentPage: page, 
            totalPages,
            selectedStatus 
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).render('order', { 
            orders: [], 
            message: 'Error fetching orders.', 
            getStatusColor, 
            currentPage: page, 
            totalPages: 0,
            selectedStatus: null 
        });
    }
};

const updateOrderStatus = async (req, res) => {
    const { orderId, status, itemId } = req.body;

    console.log('Received orderId:', orderId);
    console.log('Received status:', status);
    console.log('Received itemId:', itemId);

    if (!orderId || !status) {
        return res.status(400).json({ message: 'OrderId and status are required.' });
    }

    try {
        // Fetch the current order
        const currentOrder = await Order.findById(orderId).populate('orderedItems.product');

        if (!currentOrder) {
            return res.status(404).json({ message: 'Order not found.' });
        }

        // If itemId is provided, update individual item status
        if (itemId) {
            const orderItem = currentOrder.orderedItems.id(itemId);
            
            if (!orderItem) {
                return res.status(404).json({ message: 'Order item not found.' });
            }

            // Check if the current item status is already 'Cancelled'
            if (orderItem.status === 'Cancelled') {
                return res.status(400).json({ message: 'Item is already cancelled.' });
            }

            // Handle inventory for cancelled items
            if (status === 'Cancelled' && orderItem.product) {
                await Product.findByIdAndUpdate(
                    orderItem.product._id,
                    { $inc: { quantity: orderItem.quantity } }
                );
            }

            // Update the specific item's status
            orderItem.status = status;

            // Update overall order status based on items' statuses
            const itemStatuses = currentOrder.orderedItems.map(item => 
                item._id.equals(itemId) ? status : item.status
            );

            // Logic to determine overall order status
            let overallStatus = determineOverallStatus(itemStatuses);
            currentOrder.status = overallStatus;

            await currentOrder.save();

            return res.status(200).json({ 
                message: 'Item status updated successfully.',
                order: currentOrder 
            });
        } else {
            // Update status for all items and overall order
            if (currentOrder.status.toLowerCase() === 'cancelled') {
                return res.status(400).json({ message: 'Order is already cancelled.' });
            }

            // Handle inventory for cancelled orders
            if (status === 'Cancelled') {
                for (const item of currentOrder.orderedItems) {
                    if (item.product && item.status !== 'Cancelled') {
                        await Product.findByIdAndUpdate(
                            item.product._id,
                            { $inc: { quantity: item.quantity } }
                        );
                    }
                }
            }

            // Update all items' status
            currentOrder.orderedItems.forEach(item => {
                if (item.status !== 'Cancelled') {
                    item.status = status;
                }
            });

            currentOrder.status = status;
            await currentOrder.save();

            return res.status(200).json({ 
                message: 'Order status updated successfully.',
                order: currentOrder 
            });
        }
    } catch (error) {
        console.error('Error updating order status:', error);
        return res.status(500).json({ 
            message: 'Error updating order status. Please try again.',
            error: error.message 
        });
    }
};

// Helper function to determine overall order status
const determineOverallStatus = (itemStatuses) => {
    // If all items are cancelled
    if (itemStatuses.every(status => status === 'Cancelled')) {
        return 'Cancelled';
    }

    // If all items are delivered
    if (itemStatuses.every(status => status === 'Delivered')) {
        return 'Delivered';
    }

    // If any item is shipped
    if (itemStatuses.some(status => status === 'Shipped')) {
        return 'Shipped';
    }

    // If any item is processing
    if (itemStatuses.some(status => status === 'Processing')) {
        return 'Processing';
    }

    // Default to pending if no other conditions met
    return 'Pending';
};

// Enhanced status color function with more statuses
const getStatusColor = (status) => {
    switch(status.toLowerCase()) {
        case 'pending': return 'yellow';
        case 'processing': return 'blue';
        case 'shipped': return 'indigo';
        case 'delivered': return 'green';
        case 'cancelled': return 'red';
        case 'return requested': return 'orange';
        case 'return approved': return 'purple';
        case 'returned': return 'pink';
        case 'completed': return 'emerald';
        default: return 'gray';
    }
};
// Export the functions
module.exports = { getAllOrders,
     updateOrderStatus,
    getStatusColor
    };