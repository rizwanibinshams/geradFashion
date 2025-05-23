const mongoose = require("mongoose");
const { Schema } = mongoose;

const productSchema = new Schema({
    productName: {
        type: String,
        required: true,
        
    },
    description: {
        type: String,
        required: true,
    },
    brand: {
        type: String,
        required: true,
    },
    category: {
        type: Schema.Types.ObjectId,
        ref: "Category",
        required: true,
    },
    regularPrice: {
        type: Number,
        required: true,
    },
    salePrice: {
        type: Number,
        required: true,
    },
    productOffer: {
        type: Number,
        default: 0,
    },
    previousSalePrice: {
         type: Number
         },
    quantity: {
        type: Number,
        default: 0,
    },
    size: {
        type: [String],
        required: false,
    },
    color: {
        type: [String],
        required: true,
    },
    productImage: {
        type: [String],
        required: true,
    },
    rating: {
        type: Number,
        default: 0, 
    },
    isBlocked: {
        type: Boolean,
        default: false,
    },
    status: {
        type: String,
        enum: ["Available", "Out of Stock", "Discontinued"],
        required: true,
        default: "Available",
    },
}, { timestamps: true });

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
