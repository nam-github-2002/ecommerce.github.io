const User = require('../models/User');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const bcrypt = require('bcryptjs');

// Hiển thị form đăng ký
exports.showRegisterForm = (req, res) => {
    res.render('auth/register', {
        title: 'Đăng ký tài khoản',
        layout: false,
    });
};

// Hiển thị form đăng nhập
exports.showLoginForm = (req, res) => {
    res.render('auth/login', {
        title: 'Đăng nhập',
        layout: false,
    });
};

// Đăng ký người dùng
exports.registerUser = async (req, res, next) => {
    try {
        const { name, email, password, confirmPassword } = req.body;

        // Kiểm tra mật khẩu
        if (password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Mật khẩu không khớp',
            });
        }

        // Kiểm tra email hợp lệ
        if (!validator.isEmail(email)) {
            return res.status(400).json({
                success: false,
                message: 'Email không hợp lệ',
            });
        }

        // Kiểm tra email đã tồn tại
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Email đã được sử dụng',
            });
        }

        // Tạo người dùng mới
        const currentUser = await User.create({
            name,
            email,
            password,
        });

        // Tạo token
        const token = currentUser.getJwtToken();

        // Thiết lập cookie
        res.cookie('jwt', token, {
            expires: new Date(
                Date.now() + process.env.COOKIE_EXPIRE * 24 * 60 * 60 * 1000
            ),
            httpOnly: true,
        });

        res.status(201).json({
            success: true,
            token,
            currentUser,
            redirectUrl: '/auth/login',
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};

// Đăng nhập người dùng
exports.loginUser = async (req, res, next) => {
    try {
        const { email, password, remember } = req.body;

        // Kiểm tra email và mật khẩu
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập email và mật khẩu',
            });
        }

        // Tìm người dùng
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Email hoặc mật khẩu không đúng',
            });
        }

        // Kiểm tra mật khẩu
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Email hoặc mật khẩu không đúng',
            });
        }

        // Tạo token
        const token = user.getJwtToken();

        // Thiết lập cookie
        const cookieOptions = {
            httpOnly: true,
        };

        if (remember) {
            cookieOptions.expires = new Date(
                Date.now() + process.env.COOKIE_EXPIRE * 24 * 60 * 60 * 1000
            );
        }

        res.cookie('jwt', token, cookieOptions);

        res.status(200).json({
            success: true,
            token,
            currentUser: user,
            redirectUrl: req.body.redirectUrl || '/product',
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};

// Đăng xuất người dùng
exports.logoutUser = (req, res, next) => {
    res.cookie('jwt', '', {
        expires: new Date(Date.now()),
        httpOnly: true,
    });

    res.status(200).json({
        success: true,
        message: 'Đã đăng xuất',
        redirectUrl: '/product',
    });
};

// Lấy thông tin người dùng hiện tại
exports.getUserProfile = async (req, res, next) => {
    try {
        const currentUser = await User.findById(req.currentUser.id);

        res.status(200).json({
            success: true,
            currentUser,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};
