const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
    let token;

    // 1. Kiểm tra token từ cả Header và Cookie
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.jwt) {
        token = req.cookies.jwt;
    }
 
    // 2. Không có token
    if (!token) {
        return res.status(401).json({
            isAuthenticated: false,
            message: 'Vui lòng đăng nhập để truy cập',
        });
    }

    try {
        // 3. Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 4. Kiểm tra user tồn tại
        const user = await User.findById(decoded.id)
            .select('-password -__v')
            .lean();

        if (!user) {
            return res.status(401).json({
                isAuthenticated: false,
                message: 'Người dùng không tồn tại',
            });
        }
        // 5. Gán user vào request
        req.user = user;
        next();
    } catch (err) {
        // 6. Xử lý lỗi cụ thể
        let message = 'Không có quyền truy cập';
        if (err.name === 'TokenExpiredError') {
            message = 'Token đã hết hạn';
        } else if (err.name === 'JsonWebTokenError') {
            message = 'Token không hợp lệ';
        }

        return res.status(401).json({
            isAuthenticated: false,
            message,
        });
    }
};

// Phân quyền
exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Vai trò ${req.user.role} không được phép truy cập`,
            });
        }
        next();
    };
};
