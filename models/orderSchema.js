// const mongoose = require("mongoose");
// const {Schema} = mongoose;
// const {v4:uuidv4} = require('uuid');

// // Address Schema
// const addressSchema = new Schema({
//     street: { type: String, required: false },
//     city: { type: String, required: false },
//     state: { type: String, required: false },
//     postalCode: { type: String, required: false },
//     country: { type: String, required: false }
// });

// const Address = mongoose.model("Address", addressSchema);

// // Order Schema
// const orderSchema = new Schema({
//     orderId: {
//         type: String,
//         default: () => uuidv4(),
//         unique: true
//     },
//     orderedItems: [{
//         product: {
//             type: Schema.Types.ObjectId,
//             ref: 'Product',
//             required: true
//         },
//         quantity: {
//             type: Number,
//             required: true
//         },
//         price: {
//             type: Number,
//             default: 0
//         }
//     }],
//     totalPrice: {
//         type: Number,
//         required: true
//     },
//     discount: {
//         type: Number,
//         default: 0
//     },
//     finalAmount: {
//         type: Number,
//         required: true
//     },
//     address: {
//         type: Schema.Types.ObjectId,
//         ref: 'Address',
//         required: true
//     },
//     invoiceDate: {
//         type: Date,
//         default: Date.now
//     },
//     status: {
//         type: String,
//         required: true,
//         enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Return Request', 'Returned']
//     },
//     createdOn: {
//         type: Date,
//         default: Date.now,
//         required: true
//     },
//     couponApplied: {
//         type: Boolean,
//         default: false
//     }
// });

// const Order = mongoose.model("Order", orderSchema);
// module.exports = { Order, Address };
