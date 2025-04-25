const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect } = require('../middlewares/authMiddleware');
const {
    showRegisterForm,
    showLoginForm,
    registerUser,
    loginUser,
    logoutUser,
    getUserProfile,
} = require('../controllers/authController');

const upload = multer();

router.get('/register', showRegisterForm);
router.get('/login', showLoginForm);
router.get('/check-status', protect, (req, res) => {
    res.json({
        isAuthenticated: true,
        user: req.user,
    });
});
router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/logout', logoutUser);
router.get('/me', protect, getUserProfile);

module.exports = router;
