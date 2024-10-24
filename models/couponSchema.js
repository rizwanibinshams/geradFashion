const mongoose = require('mongoose');
const { Schema } = mongoose;

const couponSchema = new Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true
    },
    discountType: {
        type: String,
        enum: ['percentage', 'flat'],
        required: [true, 'Discount type is required']
    },
    discountValue: {
        type: Number,
        required: [true, 'Discount value is required'],
        validate: {
            validator: function(value) {
                if (this.discountType === 'percentage') {
                    return value >= 0 && value <= 100;
                }
                return value >= 0;
            },
            message: props => `${props.value} is not a valid discount value`
        }
    },
    validFrom: {
        type: Date,
        required: [true, 'Valid from date is required']
    },
    validUntil: {
        type: Date,
        required: [true, 'Valid until date is required']
    },
    maxUses: {
        type: Number,
        required: [true, 'Max uses are required'],
        default: 1
    },
    usedCount: {
        type: Number,
        default: 0
    },
    userId: [{  
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    products: [{
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true
        },
        quantity: {
          type: Number,
          required: true,
          min: 1
        }
      }],
    isActive: {
        type: Boolean,
        default: false
    },
    minPurchase: {
        type: Number,
        required: [true, 'Minimum purchase amount is required'],
        validate: {
            validator: function(value) {
                return value >= 0;
            },
            message: props => `${props.value} is not a valid minimum purchase amount`
        }
    }
}, { timestamps: true });

couponSchema.pre('save', function(next) {
    // Check if validFrom is before validUntil
    if (this.validFrom >= this.validUntil) {
        return next(new Error('validFrom must be before validUntil'));
    }
    next();
});

const Coupon = mongoose.model('Coupon', couponSchema);

module.exports = Coupon;
