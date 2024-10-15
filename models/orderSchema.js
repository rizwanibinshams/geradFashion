const mongoose = require("mongoose");
const { Schema } = mongoose;
const { v4: uuidv4 } = require('uuid');

// Address Schema
const addressSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    address: [{
        name: { type: String, required: true },
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        pincode: { type: String, required: true },
        phone: { type: String, required: true },
        addressType: { type: String, default: 'Home' }
    }]
});


// Use `mongoose.models` to prevent overwriting the model


// Order Schema
// Order Schema
const orderSchema = new Schema({
    orderId: {
        type: String,
        default: () => uuidv4(),
        unique: true
    },
    user: {  // Make sure this field is required
        type: Schema.Types.ObjectId,
        ref: 'User',  // Referencing the User schema
        required: true
    },
    paymentMethod: {  // Add this field
        type: String,
        required: true
    },
    orderedItems: [{
        product: {
            type: Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        quantity: {
            type: Number,
            required: true
        },
        price: {
            type: Number,
            default: 0
        }
    }],
    totalPrice: {
        type: Number,
        required: true
    },
    discount: {
        type: Number,
        default: 0
    },
    finalAmount: {
        type: Number,
        required: true
    },
    address: {
        name: String,
        street: String,
        city: String,
        state: String,
        pincode: String,
        phone: String,
        addressType: { type: String, default: 'Home' }
    },
    invoiceDate: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        required: true,
        enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Return Request', 'Returned']
    },
    createdOn: {
        type: Date,
        default: Date.now,
        required: true
    },
    coupon: {
        applied: { type: Boolean, default: false },
        code: { type: String },
        discountAmount: { type: Number, default: 0 }
    }
});


// Use `mongoose.models` to prevent overwriting the model
const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);
const Address = mongoose.models.Address || mongoose.model("Address", addressSchema);
module.exports = { Order, Address };
