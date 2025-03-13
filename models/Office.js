const mongoose = require('mongoose');

const OfficeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add an office name'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  location: {
    type: String,
    required: [true, 'Please add a location'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Office', OfficeSchema);