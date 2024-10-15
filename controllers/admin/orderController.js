const { Order } = require('../../models/orderSchema');

// Get all orders for the admin panel and render an EJS page
const getAllOrders = async (req, res) => {
    const page = parseInt(req.query.page) || 1; // Get the page from query parameters
    const limit = 5; // Number of orders per page
    const skip = (page - 1) * limit; // Calculate skip value for pagination

    try {
        const totalOrders = await Order.countDocuments(); // Get total number of orders
        const orders = await Order.find()
            .populate('user')
            .populate({
                path: 'orderedItems.product',
                select: 'productName salePrice'
            })
            .sort({ createdOn: -1 })
            .skip(skip) // Skip the appropriate number of orders
            .limit(limit); // Limit to 5 orders

        const totalPages = Math.ceil(totalOrders / limit); // Calculate total pages

        if (orders.length === 0) {
            return res.render('order', { orders: [], message: 'No orders found.', getStatusColor, currentPage: page, totalPages });
        }

        return res.render('order', { orders, message: null, getStatusColor, currentPage: page, totalPages });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).render('order', { orders: [], message: 'Error fetching orders.', getStatusColor, currentPage: page, totalPages: 0 });
    }
};

const updateOrderStatus = async (req, res) => {
    const { orderId, status } = req.body;

    console.log('Received orderId:', orderId);
    console.log('Received status:', status);

    if (!orderId || !status) {
        return res.status(400).json({ message: 'OrderId and status are required.' });
    }

    try {
        const updatedOrder = await Order.findByIdAndUpdate(
            orderId,
            { status },
            { new: true, runValidators: true }
        );
        
         return res.status(200).json({ message: 'Order status updated successfully.', order: updatedOrder });
    } catch (error) {
        console.error('Error updating order status:', error);
        return res.status(500).json({ message: 'Error updating order status. Please try again.' });
    }
};


function getStatusColor(status) {
    switch(status.toLowerCase()) {
      case 'pending': return 'yellow';
      case 'processing': return 'blue';
      case 'shipped': return 'indigo';
      case 'delivered': return 'green';
      case 'cancelled': return 'red';
      default: return 'gray';
    }
  }
// Export the functions
module.exports = { getAllOrders,
     updateOrderStatus,
    getStatusColor
    };