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
        default: 1
    },
    price: {
        type: Number,
        required: true
    },
    size: {
        type: String,
        required: false  // Changed to false to make it optional
    },
    totalPrice: {
        type: Number
    },
    status: {
        type: String,
        default: 'placed'
    },
    cancellationReason: {
        type: String,
        default: "none"
    }
});

cartItemSchema.pre('save', function(next) {
    // Check if price and quantity are valid numbers
    if (isNaN(this.price) || isNaN(this.quantity)) {
        console.error('Invalid price or quantity:', this.price, this.quantity);
        // Optionally set totalPrice to 0 or handle the error as needed
        this.totalPrice = 0; // Or you can choose to skip saving the document
    } else {
        this.totalPrice = this.price * this.quantity;
    }
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