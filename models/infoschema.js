const mongoose = require('mongoose');
const { Schema } = mongoose;


const infoTagSchema = new Schema({
    message: {
        type: String,
        required: true,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const InfoTag = mongoose.model('InfoTag', infoTagSchema);
module.exports = InfoTag;