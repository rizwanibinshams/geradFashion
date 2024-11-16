
const Coupon = require("../../models/couponSchema")
const User = require("../../models/userSchema")
const {Order} = require("../../models/orderSchema")
const { format } = require('date-fns');

// const getUserCoupons= async (req, res) => {
//     try {
//         const userId = req.user._id; // Assuming you have user data in request from auth middleware
        
//         // Get current date for comparison
//         const currentDate = new Date();

//         // Fetch available coupons
//         const availableCoupons = await Coupon.find({
//             userId: userId,
//             status: 'Active',
//             validUntil: { $gt: currentDate }
//         }).sort({ validUntil: 1 });

//         // Fetch used coupons
//         const usedCoupons = await Coupon.find({
//             userId: userId,
//             status: 'Used'
//         }).sort({ usedOn: -1 });

//         // Fetch expired coupons
//         const expiredCoupons = await Coupon.find({
//             userId: userId,
//             $or: [
//                 { status: 'Expired' },
//                 { 
//                     status: 'Active',
//                     validUntil: { $lte: currentDate }
//                 }
//             ]
//         }).sort({ validUntil: -1 });

//         // Update status of expired coupons
//         const expiredActiveCoupons = availableCoupons.filter(coupon => 
//             coupon.validUntil <= currentDate
//         );

//         if (expiredActiveCoupons.length > 0) {
//             await Coupon.updateMany(
//                 {
//                     _id: { $in: expiredActiveCoupons.map(c => c._id) }
//                 },
//                 {
//                     $set: { status: 'Expired' }
//                 }
//             );
//         }

//         res.render('coupon', {
//             availableCoupons,
//             usedCoupons,
//             expiredCoupons
//         });

//     } catch (error) {
//         console.error('Error fetching coupons:', error);
//         res.status(500).render('error', {
//             message: 'Error fetching coupons. Please try again later.'
//         });
//     }
// }

const getCouponsPage = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/login');
        }

        const userData = await User.findById(req.session.user.id);
        if (!userData) {
            return res.status(404).render('page-404', { message: 'User not found' });
        }

        // Pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = 10; // Items per page
        const skip = (page - 1) * limit;

        // Get total count for pagination
        const totalOrders = await Order.countDocuments({
            user: userData._id,
            'coupon.applied': true
        });

        // Calculate statistics first (using all orders for accurate stats)
        const statsQuery = await Order.aggregate([
            {
                $match: {
                    user: userData._id,
                    'coupon.applied': true
                }
            },
            {
                $group: {
                    _id: null,
                    totalSavings: { $sum: '$coupon.discountAmount' },
                    totalAmount: { $sum: '$totalPrice' },
                    lastUsedDate: { $max: '$createdOn' },
                    totalCouponsUsed: { $sum: 1 }
                }
            }
        ]);

        // Extract statistics
        const stats = statsQuery[0] || {
            totalSavings: 0,
            totalAmount: 0,
            lastUsedDate: null,
            totalCouponsUsed: 0
        };

        // Calculate average discount
        const averageDiscount = stats.totalAmount > 0 
            ? (stats.totalSavings / stats.totalAmount) * 100 
            : 0;

        // Fetch paginated orders with applied coupons
        const orders = await Order.find({
            user: userData._id,
            'coupon.applied': true
        })
        .sort({ createdOn: -1 })
        .skip(skip)
        .limit(limit);

        // Format coupon history from paginated orders
        const couponHistory = orders.map(order => ({
            orderId: order.orderId,
            couponCode: order.coupon.code,
            orderTotal: order.totalPrice,
            discountAmount: order.coupon.discountAmount,
            finalAmount: order.finalAmount,
            usedOn: order.createdOn
        }));

        // Calculate total pages
        const totalPages = Math.ceil(totalOrders / limit);

        const helpers = {
            formatCurrency: (amount) => `₹${Number(amount || 0).toFixed(2)}`,
            formatDate: (date) => format(new Date(date), 'MMM dd, yyyy')
        };

        res.render('coupons', {
            user: userData,
            couponHistory,
            totalSavings: stats.totalSavings,
            averageDiscount,
            lastUsedDate: stats.lastUsedDate,
            totalCouponsUsed: stats.totalCouponsUsed, // Add this to your statistics
            helpers,
            pagination: {
                page,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        });

    } catch (error) {
        console.error('Error in getCouponsPage:', error);
        res.status(500).render('page-404', {
            message: 'Error loading coupon information'
        });
    }
};


module.exports = {
    getCouponsPage

}