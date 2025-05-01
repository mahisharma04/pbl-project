// routes/userRoutes.js - User management routes
const express = require('express');
const {
  getUsers,
  getUser,
  updateUserRole
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Restrict all routes to admin
router.use(protect);
router.use(authorize('admin'));

router.route('/').get(getUsers);
router.route('/:id').get(getUser);
router.route('/:id/role').put(updateUserRole);

module.exports = router;