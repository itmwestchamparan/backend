const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const { protect, admin } = require('./auth');

// @route   GET /api/employees
// @desc    Get all employees
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    let query;
    
    // If user is not admin, only show employees from their office
    if (req.user.role !== 'admin') {
      query = Employee.find({ officeId: req.user.officeId }).populate('officeId', 'name location');
    } else {
      query = Employee.find().populate('officeId', 'name location');
    }
    
    const employees = await query;
    
    res.status(200).json({
      success: true,
      count: employees.length,
      data: employees
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @route   GET /api/employees/dashboard
// @desc    Get dashboard summary
// @access  Private
router.get('/dashboard', protect, async (req, res) => {
  try {
    let query;
    
    // If user is not admin, only show data from their office
    if (req.user.role !== 'admin') {
      query = Employee.find({ officeId: req.user.officeId });
    } else {
      query = Employee.find();
    }
    
    const employees = await query;
    
    // Calculate summary statistics
    const totalEmployees = employees.length;
    const registeredOnIGOT = employees.filter(emp => emp.isRegisteredOnIGOT).length;
    const notRegisteredOnIGOT = totalEmployees - registeredOnIGOT;
    const totalCoursesEnrolled = employees.reduce((sum, emp) => sum + emp.coursesEnrolled, 0);
    const totalCoursesCompleted = employees.reduce((sum, emp) => sum + emp.coursesCompleted, 0);
    const completionRate = totalCoursesEnrolled > 0 ? (totalCoursesCompleted / totalCoursesEnrolled) * 100 : 0;
    
    res.status(200).json({
      success: true,
      data: {
        totalEmployees,
        registeredOnIGOT,
        notRegisteredOnIGOT,
        totalCoursesEnrolled,
        totalCoursesCompleted,
        completionRate: completionRate.toFixed(2)
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @route   GET /api/employees/report
// @desc    Get detailed report with date filtering
// @access  Private
router.get('/report', protect, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = {};
    
    // Add date range filter if provided
    if (startDate && endDate) {
      query.reportDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    // If user is not admin, only show data from their office
    if (req.user.role !== 'admin') {
      query.officeId = req.user.officeId;
    }
    
    const employees = await Employee.find(query)
      .populate('officeId', 'name location')
      .populate('createdBy', 'name');
    
    res.status(200).json({
      success: true,
      count: employees.length,
      data: employees
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @route   GET /api/employees/:id
// @desc    Get single employee
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id)
      .populate('officeId', 'name location')
      .populate('createdBy', 'name');
    
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    
    // Make sure user is admin or belongs to the employee's office
    if (req.user.role !== 'admin' && req.user.officeId.toString() !== employee.officeId._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to access this employee' });
    }
    
    res.status(200).json({
      success: true,
      data: employee
    });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @route   POST /api/employees
// @desc    Create a new employee
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { name, officeId, isRegisteredOnIGOT, coursesEnrolled, coursesCompleted, reportDate } = req.body;
    
    // If user is not admin, they can only add employees to their own office
    if (req.user.role !== 'admin' && req.user.officeId.toString() !== officeId) {
      return res.status(403).json({ success: false, message: 'Not authorized to add employees to this office' });
    }
    
    const employee = await Employee.create({
      name,
      officeId,
      isRegisteredOnIGOT,
      coursesEnrolled: isRegisteredOnIGOT ? coursesEnrolled : 0,
      coursesCompleted: isRegisteredOnIGOT ? coursesCompleted : 0,
      reportDate: reportDate || Date.now(),
      createdBy: req.user.id
    });
    
    res.status(201).json({
      success: true,
      data: employee
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

// @route   PUT /api/employees/:id
// @desc    Update employee
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    let employee = await Employee.findById(req.params.id);
    
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    
    // Check if employee record is frozen
    if (employee.isFrozen) {
      return res.status(403).json({ success: false, message: 'This record is frozen and cannot be modified' });
    }
    
    // Make sure user is admin or belongs to the employee's office
    if (req.user.role !== 'admin' && req.user.officeId.toString() !== employee.officeId.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this employee' });
    }
    
    employee = await Employee.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    
    res.status(200).json({
      success: true,
      data: employee
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

// @route   DELETE /api/employees/:id
// @desc    Delete employee
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    
    // Check if employee record is frozen
    if (employee.isFrozen) {
      return res.status(403).json({ success: false, message: 'This record is frozen and cannot be deleted' });
    }
    
    // Make sure user is admin or belongs to the employee's office
    if (req.user.role !== 'admin' && req.user.officeId.toString() !== employee.officeId.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this employee' });
    }
    
    await Employee.findByIdAndDelete(req.params.id);
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @route   PUT /api/employees/freeze/:id
// @desc    Freeze employee record
// @access  Private/Admin
router.put('/freeze/:id', protect, admin, async (req, res) => {
  try {
    let employee = await Employee.findById(req.params.id);
    
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    
    employee = await Employee.findByIdAndUpdate(
      req.params.id, 
      { isFrozen: true },
      { new: true }
    );
    
    res.status(200).json({
      success: true,
      data: employee,
      message: 'Employee record has been frozen'
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @route   PUT /api/employees/unfreeze/:id
// @desc    Unfreeze employee record
// @access  Private/Admin
router.put('/unfreeze/:id', protect, admin, async (req, res) => {
  try {
    let employee = await Employee.findById(req.params.id);
    
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    
    employee = await Employee.findByIdAndUpdate(
      req.params.id, 
      { isFrozen: false },
      { new: true }
    );
    
    res.status(200).json({
      success: true,
      data: employee,
      message: 'Employee record has been unfrozen'
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

module.exports = router;