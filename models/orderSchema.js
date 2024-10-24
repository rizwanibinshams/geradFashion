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

// Return Reason Enum
const returnReasonEnum = [
    'size_too_small',
    'size_too_large',
    'different_from_picture',
    'quality_issues',
    'wrong_item',
    'damage',
    'style_fit',
    'fabric_issues',
    'color_difference',
    'other'
];

// Return Status Enum
const returnStatusEnum = [
    'pending_approval',
    'approved',
    'rejected',
    'item_received',
    'refund_processed',
    'completed',
    'cancelled'
];

// Order Schema
const orderSchema = new Schema({
    orderId: {
        type: String,
        default: () => uuidv4(),
        unique: true
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    paymentMethod: {
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
    deliveryCharge: {
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
        enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Return Requested', 'Return Approved', 'Returned']
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
    },
   
    // New Return-related fields
    return: {
        requested: { type: Boolean, default: false },
        requestDate: { type: Date },
        reason: { 
            type: String,
            enum: returnReasonEnum
        },
        otherReason: { 
            type: String,
            // Required only if reason is 'other'
            required: function() {
                return this.return && this.return.reason === 'other';
            }
        },
        comments: { type: String },
        status: {
            type: String,
            enum: returnStatusEnum
        },
        processedBy: {
            type: Schema.Types.ObjectId,
            ref: 'Admin'
        },
        processedDate: { type: Date },
        adminComments: { type: String },
        refundAmount: { type: Number },
        refundStatus: {
            type: String,
            enum: ['pending', 'processing', 'completed', 'failed']
        },
        refundDate: { type: Date },
        returnShipment: {
            trackingId: { type: String },
            courier: { type: String },
            pickupDate: { type: Date },
            receivedDate: { type: Date }
        },
        timeline: [{
            status: { type: String },
            date: { type: Date, default: Date.now },
            comment: { type: String }
        }]
    }
});

// Add method to initiate return request
orderSchema.methods.initiateReturn = function(returnData) {
    this.status = 'Return Requested';
    this.return = {
        requested: true,
        requestDate: new Date(),
        reason: returnData.reason,
        otherReason: returnData.otherReason,
        comments: returnData.comments,
        status: 'pending_approval',
        timeline: [{
            status: 'return_requested',
            date: new Date(),
            comment: 'Return request initiated by customer'
        }]
    };
    return this.save();
};

// Add method to track return status
orderSchema.methods.updateReturnStatus = function(status, comment, adminId) {
    this.return.status = status;
    this.return.processedBy = adminId;
    this.return.processedDate = new Date();
    this.return.adminComments = comment;
    this.return.timeline.push({
        status: status,
        date: new Date(),
        comment: comment
    });
    return this.save();
};

// Use mongoose.models to prevent overwriting the model
const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);
const Address = mongoose.models.Address || mongoose.model("Address", addressSchema);

module.exports = { Order, Address };