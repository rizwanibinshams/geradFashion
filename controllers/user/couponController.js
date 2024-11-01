
const Coupon = require("../../models/couponSchema")



const getUserCoupons= async (req, res) => {
    try {
        const userId = req.user._id; // Assuming you have user data in request from auth middleware
        
        // Get current date for comparison
        const currentDate = new Date();

        // Fetch available coupons
        const availableCoupons = await Coupon.find({
            userId: userId,
            status: 'Active',
            validUntil: { $gt: currentDate }
        }).sort({ validUntil: 1 });

        // Fetch used coupons
        const usedCoupons = await Coupon.find({
            userId: userId,
            status: 'Used'
        }).sort({ usedOn: -1 });

        // Fetch expired coupons
        const expiredCoupons = await Coupon.find({
            userId: userId,
            $or: [
                { status: 'Expired' },
                { 
                    status: 'Active',
                    validUntil: { $lte: currentDate }
                }
            ]
        }).sort({ validUntil: -1 });

        // Update status of expired coupons
        const expiredActiveCoupons = availableCoupons.filter(coupon => 
            coupon.validUntil <= currentDate
        );

        if (expiredActiveCoupons.length > 0) {
            await Coupon.updateMany(
                {
                    _id: { $in: expiredActiveCoupons.map(c => c._id) }
                },
                {
                    $set: { status: 'Expired' }
                }
            );
        }

        res.render('coupons', {
            availableCoupons,
            usedCoupons,
            expiredCoupons
        });

    } catch (error) {
        console.error('Error fetching coupons:', error);
        res.status(500).render('error', {
            message: 'Error fetching coupons. Please try again later.'
        });
    }
}
module.exports = {
    getUserCoupons
}