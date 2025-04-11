const express = require('express');
const router = express.Router();
const {
    getUserProfile,
    updateUserDetails,
    updatePassword,
    uploadAvatar,
} = require('../controllers/userController');
const { protect } = require('../middlewares/authMiddleware');

// Public routes
// None for now

// Private routes
router.use(protect);

router.route('/me').get(getUserProfile);
router.route('/updatedetails').put(updateUserDetails);
router.route('/updatepassword').put(updatePassword);
router.route('/avatar').put(uploadAvatar);

module.exports = router;
