const mongoose = require('mongoose');

const EmployeeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add employee name'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  officeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Office',
    required: [true, 'Please add office']
  },
  isRegisteredOnIGOT: {
    type: Boolean,
    default: false
  },
  coursesEnrolled: {
    type: Number,
    default: 0,
    validate: {
      validator: function(val) {
        return this.isRegisteredOnIGOT ? val >= 0 : val === 0;
      },
      message: 'Courses enrolled should be 0 if not registered on iGOT platform'
    }
  },
  coursesCompleted: {
    type: Number,
    default: 0,
    validate: {
      validator: function(val) {
        return val <= this.coursesEnrolled;
      },
      message: 'Courses completed cannot be more than courses enrolled'
    }
  },
  reportDate: {
    type: Date,
    default: Date.now,
    required: [true, 'Report date is required']
  },
  isFrozen: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field on save
EmployeeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Employee', EmployeeSchema);