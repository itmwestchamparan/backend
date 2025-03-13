const express = require('express');
const router = express.Router();
const Office = require('../models/Office');
const { protect, admin } = require('./auth');

// @route   GET /api/offices
// @desc    Get all offices
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    let query;
    
    // If user is not admin, only show their office
    if (req.user.role !== 'admin') {
      query = Office.find({ _id: req.user.officeId });
    } else {
      query = Office.find();
    }
    
    const offices = await query;
    
    res.status(200).json({
      success: true,
      count: offices.length,
      data: offices
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @route   GET /api/offices/:id
// @desc    Get single office
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const office = await Office.findById(req.params.id);
    
    if (!office) {
      return res.status(404).json({ success: false, message: 'Office not found' });
    }
    
    // Make sure user is admin or belongs to the office
    if (req.user.role !== 'admin' && req.user.officeId.toString() !== office._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to access this office' });
    }
    
    res.status(200).json({
      success: true,
      data: office
    });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ success: false, message: 'Office not found' });
    }
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @route   POST /api/offices
// @desc    Create a new office
// @access  Private/Admin
router.post('/', protect, admin, async (req, res) => {
  try {
    const { name, location, description } = req.body;
    
    const office = await Office.create({
      name,
      location,
      description,
      createdBy: req.user.id
    });
    
    res.status(201).json({
      success: true,
      data: office
    });
  } catch (err) {
    console.error(err.message);
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(val => val.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @route   PUT /api/offices/:id
// @desc    Update office
// @access  Private/Admin
router.put('/:id', protect, admin, async (req, res) => {
  try {
    let office = await Office.findById(req.params.id);
    
    if (!office) {
      return res.status(404).json({ success: false, message: 'Office not found' });
    }
    
    office = await Office.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    
    res.status(200).json({
      success: true,
      data: office
    });
  } catch (err) {
    console.error(err.message);
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(val => val.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @route   DELETE /api/offices/:id
// @desc    Delete office
// @access  Private/Admin
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const office = await Office.findById(req.params.id);
    
    if (!office) {
      return res.status(404).json({ success: false, message: 'Office not found' });
    }
    
    await Office.findByIdAndDelete(req.params.id);
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

module.exports = router;