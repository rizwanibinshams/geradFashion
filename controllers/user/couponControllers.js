
const Coupon = require("../../models/couponSchema")
const User = require("../../models/userSchema")
const {Order} = require("../../models/orderSchema")
const { format } = require('date-fns');


const getCouponsPage = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/login');
        }

        const userData = await User.findById(req.session.user.id);
        if (!userData) {
            return res.status(404).render('page-404', { message: 'User not found' });
        }

        // Pagination 
        const page = parseInt(req.query.page) || 1;
        const limit = 10; // Items per page
        const skip = (page - 1) * limit;

        // for pagination
        const totalOrders = await Order.countDocuments({
            user: userData._id,
            'coupon.applied': true
        });

        
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

     
        const stats = statsQuery[0] || {
            totalSavings: 0,
            totalAmount: 0,
            lastUsedDate: null,
            totalCouponsUsed: 0
        };

        // average discount
        const averageDiscount = stats.totalAmount > 0 
            ? (stats.totalSavings / stats.totalAmount) * 100 
            : 0;

        
        const orders = await Order.find({
            user: userData._id,
            'coupon.applied': true
        })
        .sort({ createdOn: -1 })
        .skip(skip)
        .limit(limit);

       
        const couponHistory = orders.map(order => ({
            orderId: order.orderId,
            couponCode: order.coupon.code,
            orderTotal: order.totalPrice,
            discountAmount: order.coupon.discountAmount,
            finalAmount: order.finalAmount,
            usedOn: order.createdOn
        }));

       
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
            totalCouponsUsed: stats.totalCouponsUsed, 
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