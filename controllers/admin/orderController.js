const { Order } = require('../../models/orderSchema');
const Product = require('../../models/productSchema'); 


const getAllOrders = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;
    const selectedStatus = req.query.status || null;

    try {
       
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

       
        if (itemId) {
            const orderItem = currentOrder.orderedItems.id(itemId);
            
            if (!orderItem) {
                return res.status(404).json({ message: 'Order item not found.' });
            }

           
            if (orderItem.status === 'Cancelled') {
                return res.status(400).json({ message: 'Item is already cancelled.' });
            }

            
            if (status === 'Cancelled' && orderItem.product) {
                await Product.findByIdAndUpdate(
                    orderItem.product._id,
                    { $inc: { quantity: orderItem.quantity } }
                );
            }

           
            orderItem.status = status;

          
            const itemStatuses = currentOrder.orderedItems.map(item => 
                item._id.equals(itemId) ? status : item.status
            );

            
            let overallStatus = determineOverallStatus(itemStatuses);
            currentOrder.status = overallStatus;

            await currentOrder.save();

            return res.status(200).json({ 
                message: 'Item status updated successfully.',
                order: currentOrder 
            });
        } else {
            
            if (currentOrder.status.toLowerCase() === 'cancelled') {
                return res.status(400).json({ message: 'Order is already cancelled.' });
            }

            
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


const determineOverallStatus = (itemStatuses) => {
    
    if (itemStatuses.every(status => status === 'Cancelled')) {
        return 'Cancelled';
    }

    if (itemStatuses.every(status => status === 'Delivered')) {
        return 'Delivered';
    }

  
    if (itemStatuses.some(status => status === 'Shipped')) {
        return 'Shipped';
    }

    
    if (itemStatuses.some(status => status === 'Processing')) {
        return 'Processing';
    }

   
    return 'Pending';
};


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

module.exports = { getAllOrders,
     updateOrderStatus,
    getStatusColor
    };