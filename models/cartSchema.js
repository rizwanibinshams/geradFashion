const mongoose = require("mongoose");
const { Schema } = mongoose;

const cartItemSchema = new Schema({
    productId: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    quantity: {
        type: Number,
        default: 1,
        min: [1, 'Quantity must be at least 1']
    },
    price: {
        type: Number,
        required: true,
        min: [0, 'Price cannot be negative']
    },
    size: {
        type: String,
        required: false,
        enum: ['S', 'M', 'L', 'XL', 'XXL', 'none'], // Example values if relevant
        default: 'none' // Default if size is optional
    },
    totalPrice: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        default: 'placed',
        enum: ['placed', 'shipped', 'delivered', 'cancelled'] // Enforcing valid status values
    },
    cancellationReason: {
        type: String,
        default: "none"
    }
});

cartItemSchema.pre('save', function(next) {
    if (isNaN(this.price) || isNaN(this.quantity)) {
        const error = new Error('Invalid price or quantity.');
        console.error('Invalid price or quantity:', this.price, this.quantity);
        return next(error);  // Pass the error to the next middleware
    }

    // Ensure that totalPrice is calculated correctly before saving
    this.totalPrice = this.price * this.quantity;
    next();
});

const cartSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    items: [cartItemSchema]
}, { timestamps: true });

const Cart = mongoose.model("Cart", cartSchema);

module.exports = Cart;
