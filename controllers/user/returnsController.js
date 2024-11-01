// Returns controller
const { Order } = require('../../models/orderSchema');

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

// Handle return status update
const updateReturnStatus = async (req, res) => {
    try {
        const { orderId, status } = req.body;
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        if (status === 'approved') {
            await order.approveReturn();
        } else {
            await order.updateReturnStatus(status, 'Return request processed');
        }

        res.status(200).json({ success: true, message: 'Return status updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error updating return status', error: error.message });
    }
};

const renderReturnManagementPage = async (req, res) => {
    try {
        const returnRequests = await Order.find({ 'return.requested': true })
            .populate('return.processedBy', 'name');
        res.render('return-management', { returnRequests });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching return requests', error: error.message });
    }
};


module.exports = {
    initiateReturn,
    updateReturnStatus,
    renderReturnManagementPage
}