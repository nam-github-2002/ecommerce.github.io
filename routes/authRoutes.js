const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const {
    showRegisterForm,
    showLoginForm,
    registerUser,
    loginUser,
    logoutUser,
    getUserProfile,
} = require('../controllers/authController');

router.get('/register', showRegisterForm);
router.get('/login', showLoginForm);
router.get('/check-status', protect,(req, res) => {
    res.json({
        isAuthenticated: req.isAuthenticated(),
        user: req.user || null,
    });
});
router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/logout', logoutUser);
router.get('/me', protect, getUserProfile);
router.get('/check', protect, (req, res) => {
    res.status(200).json({
        isAuthenticated: true,
        user: {
            id: req.user._id,
            name: req.user.name,
            email: req.user.email,
            role: req.user.role
        }
    });
});
module.exports = router;
