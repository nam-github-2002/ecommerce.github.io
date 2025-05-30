const jwt = require('jsonwebtoken');

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
        req.user = await User.findById(decoded.id);
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
