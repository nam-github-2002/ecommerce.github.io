const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Bảo vệ route với JWT
exports.protect = async (req, res, next) => {
    let token;

    if (req.cookies.jwt) {
        token = req.cookies.jwt;
    }

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Vui lòng đăng nhập để truy cập',
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findOne({ _id: decoded.id }).select(
            '-password'
        );

        if (!user) {
            return res.status(401).json({
                isAuthenticated: false,
                user: null,
                message: 'Người dùng không tồn tại',
            });
        }

        req.user = user;
        req.currentUser = user;
        next();
    } catch (err) {
        return res.status(401).json({
            success: false,
            message: 'Không có quyền truy cập',
        });
    }
};

// Phân quyền
exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Người dùng với vai trò ${req.user.role} không có quyền truy cập`,
            });
        }
        next();
    };
};
