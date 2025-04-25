const User = require('../models/User');
const { upload } = require('../utils/fileUpload');
const ErrorResponse = require('../utils/errorResponse');
const fs = require('fs');
const path = require('path');

// @desc    Get current user profile
// @route   GET /user/me
exports.getUserProfile = async (req, res, next) => {
    const user = await User.findById(req.user._id);
    res.status(200).render('users/profile', {
        success: true,
        title: 'Thông tin khách hàng',
        user: user,
    });
};

// @desc    Update user details
// @route   POST /user/updatedetails
exports.updateUserDetails = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
            });
        }

        // Xử lý upload avatar
        if (req.file) {
            // Xóa avatar cũ nếu tồn tại và không phải avatar mặc định
            if (
                user.avatar.url &&
                !user.avatar.url.includes('default_avatar')
            ) {
                const oldAvatarPath = path.join(
                    __dirname,
                    `../public${user.avatar.url}`
                );
                if (fs.existsSync(oldAvatarPath)) {
                    fs.unlinkSync(oldAvatarPath);
                }
            }

            user.avatar = {
                public_id: req.file.filename.split('.')[0],
                url: `/images/${req.file.filename}`,
            };
        }

        // Cập nhật thông tin
        user.name = req.body.name || user.name;

        user.address = {
            addr: req.body.address || '',
            city: req.body.city || '',
            country: req.body.country || '',
            phone: req.body.phone || '',
            postalCode: req.body.postalCode || '',
        };

        await user.save();
        
        req.flash('success', 'Profile updated successfully'); // Requires connect-flash
        res.redirect('/user/me');

    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
};

// @desc    Update password
// @route   PUT /api/v1/user/updatepassword
// @access  Private
exports.updatePassword = async (req, res, next) => {
    const user = await User.findById(req.user._id).select('+password');

    // Check current password
    if (!(await user.comparePassword(req.body.currentPassword))) {
        return next(new ErrorResponse('Mật khẩu hiện tại không đúng', 401));
    }

    user.password = req.body.newPassword;
    await user.save();

    sendTokenResponse(user, 200, res);
};

// @desc    Upload user avatar
// @route   PUT /api/v1/user/avatar
// @access  Private
exports.uploadAvatar = async (req, res, next) => {
    if (!req.files) {
        return next(new ErrorResponse('Vui lòng tải lên một hình ảnh', 400));
    }

    const file = req.files.file;

    // Check if the file is an image
    if (!file.mimetype.startsWith('image')) {
        return next(new ErrorResponse('Vui lòng tải lên một file ảnh', 400));
    }

    // Check file size
    if (file.size > process.env.MAX_FILE_UPLOAD) {
        return next(
            new ErrorResponse(
                `Vui lòng tải lên ảnh có kích thước nhỏ hơn ${process.env.MAX_FILE_UPLOAD}`,
                400
            )
        );
    }

    // Create custom filename
    file.name = `avatar_${req.user._id}${path.parse(file.name).ext}`;

    file.mv(`${process.env.FILE_UPLOAD_PATH}/${file.name}`, async (err) => {
        if (err) {
            console.error(err);
            return next(
                new ErrorResponse('Có lỗi xảy ra khi tải lên file', 500)
            );
        }

        await User.findByIdAndUpdate(req.user._id, { avatar: file.name });

        res.status(200).json({
            success: true,
            data: file.name,
        });
    });
};

// Middleware upload avatar
exports.uploadAvatar = upload.single('avatar');
