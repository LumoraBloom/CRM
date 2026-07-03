const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Client Name is required'],
        trim: true
    },
    phone: {
        type: String,
        required: [true, 'Contact Number is required'],
        trim: true
    },
    event: {
        type: String,
        enum: ['Wedding', 'Reception', 'Roka Ceremony', 'Engagement', 'Corporate Conference', 'Birthday / Anniversary', 'Other'],
        default: 'Wedding',
        required: true
    },
    date: {
        type: String, // Stored as YYYY-MM-DD for easy querying and display
        required: true
    },
    guests: {
        type: Number,
        default: 300
    },
    budget: {
        type: Number,
        default: 500000
    },
    status: {
        type: String,
        enum: ['New Inquiry', 'Site Visit Scheduled', 'Price Quote Sent', 'Booked / Won', 'Dead Lead'],
        default: 'New Inquiry'
    },
    followup: {
        type: String, // Stored as YYYY-MM-DD
        required: true
    },
    remarks: {
        type: String,
        trim: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Lead', leadSchema);
