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
    'wrong_size',
    'defective',
    'not_as_described',
    'changed_mind',
    'other'
];

// Return Status Enum
const returnStatusEnum = [
    'pending_approval',
    'approved',
    'rejected',
    'item_received',
    'refund_processed',
    'Completed',
    'cancelled'
];
const orderStatusEnum = [
    'Pending',
    'Processing',
    'Shipped',
    'Delivered',
    'Cancelled',
    'Return Requested',
    'Return Approved',
    'Returned',
    'Completed'
];

const itemStatusEnum = [
    'Pending',
    'Processing',
    'Shipped',
    'Delivered',
    'Cancel Requested',
    'Cancelled',
    'Return Requested',
    'Return Approved',
    'Returned',
    'Completed'
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
            required: true,
            
        },
        quantity: {
            type: Number,
            required: true
        },
        price: {
            type: Number,
            default: 0
        },
        category: {
            type: Schema.Types.ObjectId,
            ref: 'Category',
            required: true
        },
        status: {
            type: String,
            required: true,
            enum: itemStatusEnum,
            default: 'Pending'
        },
        cancelRequest: {
            requested: { type: Boolean, default: false },
            requestDate: { type: Date },
            reason: { type: String },
            status: { type: String, enum: ['pending', 'approved', 'rejected'] }
        },
        returnRequest: {
            requested: { type: Boolean, default: false },
            requestDate: { type: Date },
            reason: { type: String, enum: returnReasonEnum },
            status: { type: String, enum: ['pending', 'approved', 'rejected'] },
            comments: { type: String }
        },
        _id: { type: mongoose.Schema.Types.ObjectId, auto: true }
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
        enum: ['Pending', 'Psrocessing', 'Shipped', 'Delivered', 'Cancelled', 'Return Requested', 'Return Approved', 'Returned']
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
        items: [{                           // Add this items array
            itemId: { 
                type: Schema.Types.ObjectId, 
                ref: 'orderedItems' 
            }
        }],
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


orderSchema.methods.updateReturnStatus = function(status, comment) {
    if (!this.return) {
        throw new Error('No return request exists for this order');
    }

    // Update return status
    this.return.status = status;
    this.return.processedDate = new Date();
    
    // Update order status based on return status
    if (status === 'rejected') {
        this.status = 'Delivered'; // Revert to delivered status if return is rejected
    }

    // Add to timeline
    this.return.timeline.push({
        status: status,
        date: new Date(),
        comment: comment || `Return request ${status}`
    });

    return this.save();
};


// Add method to track return status
orderSchema.methods.approveReturn = async function() {
    if (this.return.status !== 'pending_approval') {
        throw new Error('Return cannot be approved in its current state.');
    }
    this.return.status = 'approved';
    this.return.processedDate = new Date();
    this.return.timeline.push({
        status: 'approved',
        date: new Date(),
        comment: 'Return request approved'
    });

    // Update the order status to "Returned"
    this.status = 'Returned';
    await this.save();
    return this;
};

orderSchema.methods.cancelItem = async function(itemId, reason) {
    const item = this.orderedItems.id(itemId);
    if (!item) throw new Error('Item not found');
    
    item.status = 'Cancel Requested';
    item.cancelRequest = {
        requested: true,
        requestDate: new Date(),
        reason: reason,
        status: 'pending'
    };
    
    // Check if all items are cancelled/cancel requested
    const activeItems = this.orderedItems.filter(item => 
        !['Cancelled', 'Cancel Requested'].includes(item.status)
    );
    
    if (activeItems.length === 0) {
        this.status = 'Cancelled';
    }
    
    return this.save();
};

// Add method to return single item
orderSchema.methods.returnItem = async function(itemId, reason, comments) {
    const item = this.orderedItems.id(itemId);
    if (!item) throw new Error('Item not found');
    
    if (item.status !== 'Delivered') {
        throw new Error('Only delivered items can be returned');
    }
    
    item.status = 'Return Requested';
    item.returnRequest = {
        requested: true,
        requestDate: new Date(),
        reason: reason,
        status: 'pending',
        comments: comments
    };
    
    // Update main order status if all items are return requested
    const activeItems = this.orderedItems.filter(item => 
        !['Returned', 'Return Requested'].includes(item.status)
    );
    
    if (activeItems.length === 0) {
        this.status = 'Return Requested';
    }
    
    return this.save();
};
orderSchema.methods.calculateItemRefundAmount = function(itemId) {
    // Find the specific item
    const orderItem = this.orderedItems.id(itemId);
    if (!orderItem) {
        throw new Error('Order item not found');
    }

    // Get the item's price and quantity
    const itemSubtotal = orderItem.price; // Remove multiplication with quantity here since price already includes it
    
    // Calculate item's proportion of the total order
    const orderSubtotal = this.orderedItems.reduce((sum, item) => 
        sum + item.price, 0); // Remove multiplication with quantity here
    const itemProportion = itemSubtotal / orderSubtotal;

    // Calculate proportional coupon discount for this item
    let itemCouponDiscount = 0;
    if (this.coupon.applied && this.coupon.discountAmount > 0) {
        itemCouponDiscount = this.coupon.discountAmount * itemProportion;
    }

    // Calculate proportional delivery charge for this item (if you want to refund it)
    const itemDeliveryCharge = this.deliveryCharge * itemProportion;

    // Calculate final refund amount
    const refundAmount = itemSubtotal - itemCouponDiscount;

    return {
        itemSubtotal,
        itemCouponDiscount,
        itemDeliveryCharge,
        refundAmount,
        itemProportion
    };
};

orderSchema.methods.calculateReturnRefundAmount = function(returnedItems) {
    // Calculate total order subtotal (before discount)
    const orderSubtotal = this.orderedItems.reduce((sum, item) => 
        sum + item.price, 0); // Remove quantity multiplication since price includes it

    let totalRefundAmount = 0;
    const refundDetails = [];

    // Calculate refund for each returned item
    returnedItems.forEach(item => {
        const itemSubtotal = item.price; // Remove quantity multiplication
        const itemProportion = itemSubtotal / orderSubtotal;

        // Calculate proportional coupon discount for this item
        let itemCouponDiscount = 0;
        if (this.coupon.applied && this.coupon.discountAmount > 0) {
            itemCouponDiscount = this.coupon.discountAmount * itemProportion;
        }

        // Calculate proportional delivery charge (only if all items are being returned)
        let itemDeliveryCharge = 0;
        if (returnedItems.length === this.orderedItems.length && this.deliveryCharge > 0) {
            itemDeliveryCharge = this.deliveryCharge * itemProportion;
        }

        const itemRefundAmount = itemSubtotal - itemCouponDiscount + itemDeliveryCharge;
        totalRefundAmount += itemRefundAmount;

        refundDetails.push({
            itemId: item._id,
            itemSubtotal,
            itemCouponDiscount,
            itemDeliveryCharge,
            itemRefundAmount,
            itemProportion
        });
    });

    return {
        totalRefundAmount,
        refundDetails
    };
};

// Use mongoose.models to prevent overwriting the model
const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);
const Address = mongoose.models.Address || mongoose.model("Address", addressSchema);

module.exports = { Order, Address };