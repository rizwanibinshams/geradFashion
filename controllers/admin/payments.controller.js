const crypto = require('crypto');
const { createRazorpayInstance } = require('../../config/razorpay.config');
const instance = createRazorpayInstance();

exports.createOrder = async (req, res) => {
    try {
        const { amount, currency = 'INR' } = req.body;
        
        if (!amount) {
            return res.status(400).json({ 
                success: false, 
                message: "Amount is required" 
            });
        }

        const options = {
            amount: Math.round(amount * 100),
            currency: currency,
            receipt: `receipt_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        };

        const order = await instance.orders.create(options);
        
        res.json({ 
            success: true, 
            orderId: order.id, 
            amount: order.amount,
            key_id: process.env.RAZORPAY_KEY_ID
        });
    } catch (error) {
        console.error("Error creating Razorpay order:", error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to create order",
            error: error.message 
        });
    }
};

exports.verifyPayment = async (req, res) => {
    try {
        const {
            razorpay_payment_id,
            razorpay_order_id,
            razorpay_signature
        } = req.body;

        
        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSign = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(sign)
            .digest("hex");

        if (razorpay_signature === expectedSign) {
            return res.status(200).json({
                success: true,
                message: "Payment verified successfully"
            });
        } else {
            return res.status(400).json({
                success: false,
                message: "Invalid signature"
            });
        }
    } catch (error) {
        console.error("Payment verification error:", error);
        res.status(500).json({
            success: false,
            message: "Payment verification failed",
            error: error.message
        });
    }
};
